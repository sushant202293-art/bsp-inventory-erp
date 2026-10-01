-- ============================================================
-- 009_billing_module.sql - Billing module backend
--
-- Adds:
--   1. document_series         - configurable per-company numbering
--   2. Atomic preview / allocate / reset RPCs
--   3. transactions.company_snapshot + payment_allocations
--   4. company_settings.document_terms + payment_methods
--
-- Numbering rules enforced here rather than in the browser:
--   * opening a form only previews a number (no write, no increment)
--   * a number is allocated exactly once, inside allocate_document_number,
--     under a row lock on the series, so concurrent saves cannot collide
--   * the allocated number is kept when the document is edited
--   * a number that already exists on a document is never handed out twice
-- ============================================================

-- ============================================================
-- 1. DOCUMENT_SERIES
-- ============================================================
CREATE TABLE IF NOT EXISTS document_series (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    doc_type TEXT NOT NULL CHECK (doc_type IN
        ('sale', 'purchase', 'quotation', 'purchase_order', 'proforma_invoice')),
    prefix TEXT NOT NULL DEFAULT 'PI/',
    financial_year TEXT NOT NULL DEFAULT '',
    auto_fy BOOLEAN NOT NULL DEFAULT TRUE,
    start_number INT NOT NULL DEFAULT 1,
    padding INT NOT NULL DEFAULT 4,
    suffix TEXT NOT NULL DEFAULT '',
    next_number INT NOT NULL DEFAULT 1,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_document_series_company_type UNIQUE (company_id, doc_type),
    CONSTRAINT chk_document_series_padding CHECK (padding BETWEEN 1 AND 10),
    CONSTRAINT chk_document_series_start CHECK (start_number >= 1),
    CONSTRAINT chk_document_series_next CHECK (next_number >= 1)
);

CREATE INDEX IF NOT EXISTS idx_document_series_company
    ON document_series(company_id);

DROP TRIGGER IF EXISTS trg_document_series_updated_at ON document_series;
CREATE TRIGGER trg_document_series_updated_at
    BEFORE UPDATE ON document_series
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 2. ROW LEVEL SECURITY
--    Reading the series is harmless for any company member, but
--    editing it is an administrator action.
-- ============================================================
ALTER TABLE document_series ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "document_series_select_own" ON document_series;
CREATE POLICY "document_series_select_own" ON document_series
    FOR SELECT USING (
        company_id = public.user_company_id()
        OR public.user_is_admin()
    );

DROP POLICY IF EXISTS "document_series_insert_own" ON document_series;
CREATE POLICY "document_series_insert_own" ON document_series
    FOR INSERT WITH CHECK (
        company_id = public.user_company_id()
        AND (public.user_is_admin() OR public.user_has_permission('settings', 'update'))
    );

DROP POLICY IF EXISTS "document_series_update_own" ON document_series;
CREATE POLICY "document_series_update_own" ON document_series
    FOR UPDATE USING (
        company_id = public.user_company_id()
        AND (public.user_is_admin() OR public.user_has_permission('settings', 'update'))
    )
    WITH CHECK (
        company_id = public.user_company_id()
        AND (public.user_is_admin() OR public.user_has_permission('settings', 'update'))
    );

DROP POLICY IF EXISTS "document_series_delete_own" ON document_series;
CREATE POLICY "document_series_delete_own" ON document_series
    FOR DELETE USING (
        company_id = public.user_company_id()
        AND (public.user_is_admin() OR public.user_has_permission('settings', 'update'))
    );

-- ============================================================
-- 3. HELPERS
-- ============================================================

-- Indian financial year, 1 April – 31 March.
-- April 2026 .. March 2027 -> '26-27'
CREATE OR REPLACE FUNCTION public.billing_fiscal_year(p_date DATE DEFAULT CURRENT_DATE)
RETURNS TEXT AS $$
DECLARE
    v_date DATE := COALESCE(p_date, CURRENT_DATE);
BEGIN
    IF EXTRACT(MONTH FROM v_date) >= 4 THEN
        RETURN TO_CHAR(v_date, 'YY') || '-' || TO_CHAR(v_date + INTERVAL '1 year', 'YY');
    END IF;
    RETURN TO_CHAR(v_date - INTERVAL '1 year', 'YY') || '-' || TO_CHAR(v_date, 'YY');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION public.billing_format_number(
    p_prefix TEXT,
    p_fiscal_year TEXT,
    p_sequence INT,
    p_padding INT,
    p_suffix TEXT DEFAULT ''
) RETURNS TEXT AS $$
    SELECT COALESCE(p_prefix, '')
        || COALESCE(NULLIF(p_fiscal_year, ''), '')
        || '/'
        || LPAD(GREATEST(COALESCE(p_sequence, 1), 0)::TEXT,
                GREATEST(COALESCE(p_padding, 4), 1), '0')
        || COALESCE(p_suffix, '');
$$ LANGUAGE sql IMMUTABLE;

-- A document number is only ever issued to somebody who belongs to the
-- company. Without this any signed-in user could read another tenant's
-- next invoice number by passing their company id.
CREATE OR REPLACE FUNCTION public.billing_assert_company(p_company_id UUID)
RETURNS VOID AS $$
DECLARE
    v_company UUID;
BEGIN
    SELECT company_id INTO v_company FROM profiles WHERE id = auth.uid();
    IF v_company IS NULL OR v_company <> p_company_id THEN
        RAISE EXCEPTION 'Not authorized for this company';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.billing_assert_settings_manager()
RETURNS VOID AS $$
BEGIN
    IF NOT (public.user_is_admin() OR public.user_has_permission('settings', 'update')) THEN
        RAISE EXCEPTION 'You need the settings:update permission to change numbering';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.billing_default_prefix(p_doc_type TEXT)
RETURNS TEXT AS $$
    SELECT CASE p_doc_type
        WHEN 'sale' THEN 'INV/'
        WHEN 'purchase' THEN 'PUR/'
        WHEN 'quotation' THEN 'QUO/'
        WHEN 'purchase_order' THEN 'PO/'
        ELSE 'PI/'
    END;
$$ LANGUAGE sql IMMUTABLE;

-- Lazily creates the row for a company/document-type. Never consumes a
-- number, so calling it from a preview is safe.
CREATE OR REPLACE FUNCTION public.billing_ensure_series(p_company_id UUID, p_doc_type TEXT)
RETURNS document_series AS $$
DECLARE
    v_series document_series;
BEGIN
    SELECT * INTO v_series
    FROM document_series
    WHERE company_id = p_company_id AND doc_type = p_doc_type;

    IF FOUND THEN
        RETURN v_series;
    END IF;

    BEGIN
        INSERT INTO document_series
            (company_id, doc_type, prefix, financial_year, start_number, padding, next_number)
        VALUES
            (p_company_id, p_doc_type, billing_default_prefix(p_doc_type),
             billing_fiscal_year(CURRENT_DATE), 1, 4, 1)
        RETURNING * INTO v_series;
    EXCEPTION WHEN unique_violation THEN
        -- Another session created it between the SELECT and the INSERT.
        SELECT * INTO v_series
        FROM document_series
        WHERE company_id = p_company_id AND doc_type = p_doc_type;
    END;

    RETURN v_series;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 4. preview_document_number  (read only - never increments)
-- ============================================================
CREATE OR REPLACE FUNCTION public.preview_document_number(
    p_company_id UUID,
    p_doc_type TEXT,
    p_doc_date DATE DEFAULT NULL
) RETURNS TEXT AS $$
DECLARE
    v_series document_series;
    v_date DATE := COALESCE(p_doc_date, CURRENT_DATE);
    v_fy TEXT;
    v_next INT;
BEGIN
    PERFORM public.billing_assert_company(p_company_id);
    v_series := public.billing_ensure_series(p_company_id, p_doc_type);

    IF v_series.auto_fy THEN
        v_fy := public.billing_fiscal_year(v_date);
        -- A preview for a document dated in the next financial year shows
        -- the series as it will be after the automatic rollover, without
        -- writing anything.
        IF COALESCE(NULLIF(v_series.financial_year, ''), v_fy) <> v_fy THEN
            v_next := COALESCE(v_series.start_number, 1);
        ELSE
            v_next := v_series.next_number;
        END IF;
    ELSE
        v_fy := COALESCE(NULLIF(v_series.financial_year, ''),
                         public.billing_fiscal_year(v_date));
        v_next := v_series.next_number;
    END IF;

    RETURN public.billing_format_number(
        v_series.prefix, v_fy, v_next, v_series.padding, v_series.suffix
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 5. allocate_document_number  (the only place a number is minted)
--
-- Row lock on the series serialises callers, so two users saving at
-- the same instant get 0001 and 0002, never 0001 twice. The
-- EXISTS guard skips over any number already printed on an old
-- document so a reconfigured series cannot collide with history.
-- ============================================================
CREATE OR REPLACE FUNCTION public.allocate_document_number(
    p_company_id UUID,
    p_doc_type TEXT,
    p_doc_date DATE DEFAULT NULL
) RETURNS TEXT AS $$
DECLARE
    v_series document_series%ROWTYPE;
    v_date DATE := COALESCE(p_doc_date, CURRENT_DATE);
    v_fy TEXT;
    v_next INT;
    v_number TEXT;
    v_guard INT := 0;
BEGIN
    PERFORM public.billing_assert_company(p_company_id);
    PERFORM public.billing_ensure_series(p_company_id, p_doc_type);

    SELECT * INTO v_series
    FROM document_series
    WHERE company_id = p_company_id AND doc_type = p_doc_type
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Numbering series not configured for %', p_doc_type;
    END IF;

    IF NOT v_series.enabled THEN
        RAISE EXCEPTION 'Document numbering is disabled for % - enable it in Settings', p_doc_type;
    END IF;

    v_fy := public.billing_fiscal_year(v_date);

    IF v_series.auto_fy THEN
        IF COALESCE(NULLIF(v_series.financial_year, ''), v_fy) <> v_fy THEN
            -- New financial year: restart from the configured start number.
            v_next := COALESCE(v_series.start_number, 1);
        ELSE
            v_next := v_series.next_number;
        END IF;
    ELSE
        v_fy := COALESCE(NULLIF(v_series.financial_year, ''), v_fy);
        v_next := v_series.next_number;
    END IF;

    LOOP
        v_number := public.billing_format_number(
            v_series.prefix, v_fy, v_next, v_series.padding, v_series.suffix
        );

        EXIT WHEN NOT EXISTS (
            SELECT 1 FROM transactions
            WHERE company_id = p_company_id
              AND type = p_doc_type
              AND document_number = v_number
        );

        v_next := v_next + 1;
        v_guard := v_guard + 1;
        IF v_guard > 100000 THEN
            RAISE EXCEPTION 'Could not find a free document number for %', p_doc_type;
        END IF;
    END LOOP;

    UPDATE document_series
    SET next_number = v_next + 1,
        financial_year = v_fy,
        updated_at = now()
    WHERE id = v_series.id;

    RETURN v_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 6. reset_document_series  (manual restart / new financial year)
-- ============================================================
CREATE OR REPLACE FUNCTION public.reset_document_series(
    p_company_id UUID,
    p_doc_type TEXT,
    p_next_number INT DEFAULT NULL,
    p_financial_year TEXT DEFAULT NULL
) RETURNS INT AS $$
DECLARE
    v_series document_series;
    v_next INT;
BEGIN
    PERFORM public.billing_assert_company(p_company_id);
    PERFORM public.billing_assert_settings_manager();
    PERFORM public.billing_ensure_series(p_company_id, p_doc_type);

    SELECT * INTO v_series
    FROM document_series
    WHERE company_id = p_company_id AND doc_type = p_doc_type
    FOR UPDATE;

    v_next := COALESCE(p_next_number, v_series.start_number, 1);

    UPDATE document_series
    SET next_number = GREATEST(v_next, 1),
        financial_year = COALESCE(
            NULLIF(p_financial_year, ''),
            billing_fiscal_year(CURRENT_DATE)
        ),
        updated_at = now()
    WHERE id = v_series.id
    RETURNING next_number INTO v_next;

    RETURN v_next;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 7. next_document_number - kept for existing call sites, now
--    delegating to the configured series so every document type
--    uses the same atomic allocator.
-- ============================================================
CREATE OR REPLACE FUNCTION public.next_document_number(
    p_company_id UUID,
    p_type TEXT
) RETURNS TEXT AS $$
BEGIN
    RETURN public.allocate_document_number(p_company_id, p_type, CURRENT_DATE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 8. GRANTS
-- ============================================================
GRANT EXECUTE ON FUNCTION public.billing_fiscal_year(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.billing_format_number(TEXT, TEXT, INT, INT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.billing_default_prefix(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.billing_assert_company(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.billing_assert_settings_manager() TO authenticated;
GRANT EXECUTE ON FUNCTION public.billing_ensure_series(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.preview_document_number(UUID, TEXT, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.allocate_document_number(UUID, TEXT, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_document_series(UUID, TEXT, INT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.next_document_number(UUID, TEXT) TO authenticated;

-- ============================================================
-- 9. TRANSACTIONS - document snapshot + payment intent
-- ============================================================

-- Company details at the moment the document was issued, so editing the
-- company profile later cannot rewrite history on old invoices.
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS company_snapshot JSONB;

-- Payment rows are an intention on a draft/proforma and a record of the
-- allocation on a posted invoice. Stored per document so reprinting never
-- re-creates a payment.
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS payment_allocations JSONB
    NOT NULL DEFAULT '[]'::jsonb;

-- ============================================================
-- 10. COMPANY_SETTINGS - terms defaults + payment method config
-- ============================================================
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS document_terms JSONB
    NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS payment_methods JSONB
    NOT NULL DEFAULT '[]'::jsonb;
