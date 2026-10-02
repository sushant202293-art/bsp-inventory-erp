-- ============================================================
-- 010_stock_statement_import.sql – Advanced Excel import for the
--                       stock statement
--
-- The stock statement reads its column list straight from the Excel
-- header row, so the schema has to store two things the product table
-- cannot: which columns a file supplied, and the raw cell values of
-- every row that does not map onto a product column (unit, gst, sl no,
-- or any other header the user invents).
-- ============================================================

-- ============================================================
-- 1. STOCK_STATEMENT_IMPORTS  (one row per uploaded file)
-- ============================================================
CREATE TABLE stock_statement_imports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    file_name TEXT,
    columns JSONB NOT NULL DEFAULT '[]'::jsonb,
    row_count INT NOT NULL DEFAULT 0,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_stock_statement_imports_company
    ON stock_statement_imports(company_id);

-- ============================================================
-- 2. STOCK_STATEMENT_ROWS  (one row per product, latest file wins)
-- ============================================================
CREATE TABLE stock_statement_rows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    import_id UUID REFERENCES stock_statement_imports(id) ON DELETE SET NULL,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_stock_statement_rows_company_product UNIQUE(company_id, product_id)
);

CREATE INDEX idx_stock_statement_rows_company
    ON stock_statement_rows(company_id);
CREATE INDEX idx_stock_statement_rows_product
    ON stock_statement_rows(product_id);

-- ============================================================
-- 3. ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE stock_statement_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_statement_rows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stock_statement_imports_select_own" ON stock_statement_imports
    FOR SELECT USING (
        company_id = public.user_company_id()
        OR public.user_is_admin()
    );

CREATE POLICY "stock_statement_imports_insert_own" ON stock_statement_imports
    FOR INSERT WITH CHECK (
        company_id = public.user_company_id()
    );

CREATE POLICY "stock_statement_imports_update_own" ON stock_statement_imports
    FOR UPDATE USING (
        company_id = public.user_company_id()
        OR public.user_is_admin()
    );

CREATE POLICY "stock_statement_imports_delete_own" ON stock_statement_imports
    FOR DELETE USING (
        company_id = public.user_company_id()
        OR public.user_is_admin()
    );

CREATE POLICY "stock_statement_rows_select_own" ON stock_statement_rows
    FOR SELECT USING (
        company_id = public.user_company_id()
        OR public.user_is_admin()
    );

CREATE POLICY "stock_statement_rows_insert_own" ON stock_statement_rows
    FOR INSERT WITH CHECK (
        company_id = public.user_company_id()
    );

CREATE POLICY "stock_statement_rows_update_own" ON stock_statement_rows
    FOR UPDATE USING (
        company_id = public.user_company_id()
        OR public.user_is_admin()
    );

CREATE POLICY "stock_statement_rows_delete_own" ON stock_statement_rows
    FOR DELETE USING (
        company_id = public.user_company_id()
        OR public.user_is_admin()
    );
