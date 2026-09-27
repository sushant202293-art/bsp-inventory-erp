-- ============================================================
-- 006_atomic_posting.sql – Atomic RPCs for document posting
--
-- The TypeScript service previously posted stock line-by-line
-- with a non-atomic read-modify-write, wrote the literal string
-- 'default' into a UUID column, and discarded the error. That
-- meant posting either silently did nothing or left stock and
-- its movement ledger out of sync. These RPCs do the whole
-- operation inside one database transaction, so it either fully
-- applies or fully rolls back.
-- ============================================================

-- ============================================================
-- 1. post_document_stock
--    Applies stock movements for every line of a document and
--    sets the document status, atomically.
-- ============================================================
CREATE OR REPLACE FUNCTION post_document_stock(p_transaction_id UUID)
RETURNS VOID AS $$
DECLARE
    v_txn transactions%ROWTYPE;
    v_item RECORD;
    v_warehouse_id UUID;
    v_current NUMERIC;
    v_new NUMERIC;
    v_qty_change NUMERIC;
    v_movement_type TEXT;
    v_user_id UUID := auth.uid();
BEGIN
    SELECT * INTO v_txn FROM transactions WHERE id = p_transaction_id FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Transaction not found: %', p_transaction_id;
    END IF;

    IF v_txn.status = 'cancelled' THEN
        RAISE EXCEPTION 'Cannot post a cancelled transaction';
    END IF;

    IF v_txn.status IN ('confirmed', 'paid', 'partial') THEN
        RAISE EXCEPTION 'Transaction is already posted';
    END IF;

    -- Quotations and purchase orders do not move stock
    IF v_txn.type NOT IN ('sale', 'purchase') THEN
        UPDATE transactions
        SET status = 'confirmed', updated_at = now()
        WHERE id = p_transaction_id;
        RETURN;
    END IF;

    -- Resolve warehouse: document's own, else the company's first active one
    v_warehouse_id := v_txn.warehouse_id;

    IF v_warehouse_id IS NULL THEN
        SELECT w.id INTO v_warehouse_id
        FROM warehouses w
        WHERE w.company_id = v_txn.company_id AND w.is_active = true
        ORDER BY w.created_at ASC
        LIMIT 1;
    END IF;

    IF v_warehouse_id IS NULL THEN
        RAISE EXCEPTION 'No active warehouse found. Create one in Settings first.';
    END IF;

    FOR v_item IN
        SELECT * FROM transaction_items
        WHERE transaction_id = p_transaction_id AND product_id IS NOT NULL
        ORDER BY sort_order
    LOOP
        -- Lock the existing stock row, then read it. `FOR UPDATE` is illegal
        -- on an aggregate query, so the lock and the read must be separate.
        v_current := 0;
        SELECT current_stock INTO v_current
        FROM product_stock
        WHERE product_id = v_item.product_id AND warehouse_id = v_warehouse_id
        FOR UPDATE;

        IF v_txn.type = 'sale' THEN
            v_qty_change := -v_item.quantity;
            v_movement_type := 'sales';
        ELSE
            v_qty_change := v_item.quantity;
            v_movement_type := 'purchase';
        END IF;

        v_new := v_current + v_qty_change;

        IF v_new < 0 THEN
            RAISE EXCEPTION 'Insufficient stock for %: available %, required %',
                v_item.product_name, v_current, v_item.quantity;
        END IF;

        INSERT INTO product_stock (product_id, warehouse_id, current_stock, avg_cost, last_updated)
        VALUES (v_item.product_id, v_warehouse_id, v_new, v_item.rate, now())
        ON CONFLICT (product_id, warehouse_id) DO UPDATE
        SET current_stock = v_new,
            -- Weighted-average cost on inbound, unchanged on outbound
            avg_cost = CASE
                WHEN v_qty_change > 0 AND v_current + v_qty_change > 0
                THEN ((product_stock.avg_cost * product_stock.current_stock)
                      + (v_item.rate * v_qty_change))
                     / (product_stock.current_stock + v_qty_change)
                ELSE product_stock.avg_cost
            END,
            last_updated = now();

        INSERT INTO stock_movements (
            company_id, product_id, warehouse_id, type,
            reference_type, reference_id,
            quantity, balance_after, unit_cost, total_value, notes, created_by
        ) VALUES (
            v_txn.company_id, v_item.product_id, v_warehouse_id, v_movement_type,
            'transaction', p_transaction_id,
            v_qty_change, v_new, v_item.rate, v_item.total_amount,
            v_txn.type || ' - ' || v_txn.document_number, v_user_id
        );
    END LOOP;

    -- Ledger entry so the party account reflects the document
    IF v_txn.type = 'sale' AND v_txn.customer_id IS NOT NULL THEN
        INSERT INTO customer_ledger (
            customer_id, date, description, debit, credit, reference_type, reference_id
        ) VALUES (
            v_txn.customer_id, v_txn.document_date,
            'Sale: ' || v_txn.document_number,
            v_txn.grand_total, 0, 'transaction', p_transaction_id
        );
    ELSIF v_txn.type = 'purchase' AND v_txn.supplier_id IS NOT NULL THEN
        INSERT INTO supplier_ledger (
            supplier_id, date, description, debit, credit, reference_type, reference_id
        ) VALUES (
            v_txn.supplier_id, v_txn.document_date,
            'Purchase: ' || v_txn.document_number,
            0, v_txn.grand_total, 'transaction', p_transaction_id
        );
    END IF;

    UPDATE transactions
    SET status = CASE
            WHEN amount_paid >= grand_total AND grand_total > 0 THEN 'paid'
            WHEN amount_paid > 0 THEN 'partial'
            ELSE 'confirmed'
        END,
        warehouse_id = v_warehouse_id,
        updated_at = now()
    WHERE id = p_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 2. cancel_document_stock
--    Reverses a posted document's stock and ledger effects.
-- ============================================================
CREATE OR REPLACE FUNCTION cancel_document_stock(p_transaction_id UUID)
RETURNS VOID AS $$
DECLARE
    v_txn transactions%ROWTYPE;
    v_item RECORD;
    v_warehouse_id UUID;
    v_current NUMERIC;
    v_new NUMERIC;
    v_qty_change NUMERIC;
    v_movement_type TEXT;
    v_user_id UUID := auth.uid();
BEGIN
    SELECT * INTO v_txn FROM transactions WHERE id = p_transaction_id FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Transaction not found: %', p_transaction_id;
    END IF;

    IF v_txn.status = 'cancelled' THEN
        RAISE EXCEPTION 'Transaction is already cancelled';
    END IF;

    IF v_txn.status NOT IN ('confirmed', 'paid', 'partial') THEN
        UPDATE transactions SET status = 'cancelled', updated_at = now()
        WHERE id = p_transaction_id;
        RETURN;
    END IF;

    IF v_txn.type IN ('sale', 'purchase') THEN
        v_warehouse_id := v_txn.warehouse_id;

        IF v_warehouse_id IS NULL THEN
            SELECT w.id INTO v_warehouse_id
            FROM warehouses w
            WHERE w.company_id = v_txn.company_id AND w.is_active = true
            ORDER BY w.created_at ASC LIMIT 1;
        END IF;

        IF v_warehouse_id IS NULL THEN
            UPDATE transactions SET status = 'cancelled', updated_at = now()
            WHERE id = p_transaction_id;
            RETURN;
        END IF;

        FOR v_item IN
            SELECT * FROM transaction_items
            WHERE transaction_id = p_transaction_id AND product_id IS NOT NULL
            ORDER BY sort_order
        LOOP
            -- Lock the existing stock row, then read it. `FOR UPDATE` is
            -- illegal on an aggregate query.
            v_current := 0;
            SELECT current_stock INTO v_current
            FROM product_stock
            WHERE product_id = v_item.product_id AND warehouse_id = v_warehouse_id
            FOR UPDATE;

            -- Undo the original direction
            IF v_txn.type = 'sale' THEN
                v_qty_change := v_item.quantity;
                v_movement_type := 'sales_return';
            ELSE
                v_qty_change := -v_item.quantity;
                v_movement_type := 'purchase_return';
            END IF;

            v_new := v_current + v_qty_change;

            -- Cancelling a purchase removes stock that may already have been
            -- sold. Refuse rather than silently driving the balance negative.
            IF v_new < 0 THEN
                RAISE EXCEPTION
                    'Cannot cancel: reversing % would leave stock of % at %. Stock has already been consumed.',
                    v_txn.document_number, v_item.product_name, v_new;
            END IF;

            INSERT INTO product_stock (product_id, warehouse_id, current_stock, last_updated)
            VALUES (v_item.product_id, v_warehouse_id, v_new, now())
            ON CONFLICT (product_id, warehouse_id) DO UPDATE
            SET current_stock = v_new, last_updated = now();

            INSERT INTO stock_movements (
                company_id, product_id, warehouse_id, type,
                reference_type, reference_id,
                quantity, balance_after, unit_cost, total_value, notes, created_by
            ) VALUES (
                v_txn.company_id, v_item.product_id, v_warehouse_id, v_movement_type,
                'cancellation', p_transaction_id,
                v_qty_change, v_new, v_item.rate, v_item.total_amount,
                'Cancellation of ' || v_txn.document_number, v_user_id
            );
        END LOOP;
    END IF;

    -- Reverse the ledger entry created at posting time
    IF v_txn.type = 'sale' AND v_txn.customer_id IS NOT NULL THEN
        DELETE FROM customer_ledger
        WHERE reference_type = 'transaction' AND reference_id = p_transaction_id;
    ELSIF v_txn.type = 'purchase' AND v_txn.supplier_id IS NOT NULL THEN
        DELETE FROM supplier_ledger
        WHERE reference_type = 'transaction' AND reference_id = p_transaction_id;
    END IF;

    UPDATE transactions SET status = 'cancelled', updated_at = now()
    WHERE id = p_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 3. apply_document_payment
--    Records a payment and reconciles the linked document in one
--    transaction, so a payment can never be saved without its
--    ledger entry or its invoice status update.
-- ============================================================
CREATE OR REPLACE FUNCTION apply_document_payment(
    p_party_id UUID,
    p_party_type TEXT,
    p_date DATE,
    p_reference_number TEXT,
    p_mode TEXT,
    p_bank_name TEXT,
    p_amount NUMERIC,
    p_notes TEXT,
    p_transaction_id UUID
) RETURNS UUID AS $$
DECLARE
    v_payment_id UUID;
    v_company_id UUID;
    v_txn transactions%ROWTYPE;
    v_user_id UUID := auth.uid();
BEGIN
    IF p_party_type = 'customer' THEN
        SELECT company_id INTO v_company_id FROM customers WHERE id = p_party_id;
        IF v_company_id IS NULL THEN
            RAISE EXCEPTION 'Customer not found';
        END IF;

        INSERT INTO payments_received (
            company_id, customer_id, date, reference_number,
            mode, bank_name, amount, notes, transaction_id, created_by
        ) VALUES (
            v_company_id, p_party_id, p_date, p_reference_number,
            p_mode, p_bank_name, p_amount, p_notes, p_transaction_id, v_user_id
        ) RETURNING id INTO v_payment_id;

        INSERT INTO customer_ledger (
            customer_id, date, description, debit, credit, reference_type, reference_id
        ) VALUES (
            p_party_id, p_date,
            'Payment received' || COALESCE(': ' || p_reference_number, ''),
            0, p_amount, 'payment_received', v_payment_id
        );
    ELSE
        SELECT company_id INTO v_company_id FROM suppliers WHERE id = p_party_id;
        IF v_company_id IS NULL THEN
            RAISE EXCEPTION 'Supplier not found';
        END IF;

        INSERT INTO payments_made (
            company_id, supplier_id, date, reference_number,
            mode, bank_name, amount, notes, transaction_id, created_by
        ) VALUES (
            v_company_id, p_party_id, p_date, p_reference_number,
            p_mode, p_bank_name, p_amount, p_notes, p_transaction_id, v_user_id
        ) RETURNING id INTO v_payment_id;

        INSERT INTO supplier_ledger (
            supplier_id, date, description, debit, credit, reference_type, reference_id
        ) VALUES (
            p_party_id, p_date,
            'Payment made' || COALESCE(': ' || p_reference_number, ''),
            p_amount, 0, 'payment_made', v_payment_id
        );
    END IF;

    IF p_transaction_id IS NOT NULL THEN
        SELECT * INTO v_txn FROM transactions
        WHERE id = p_transaction_id AND company_id = v_company_id FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Document not found for this company';
        END IF;

        IF v_txn.status = 'cancelled' THEN
            RAISE EXCEPTION 'Cannot pay a cancelled document';
        END IF;

        UPDATE transactions
        SET amount_paid = amount_paid + p_amount,
            status = CASE
                WHEN amount_paid + p_amount >= grand_total THEN 'paid'
                WHEN amount_paid + p_amount > 0 THEN 'partial'
                ELSE status
            END,
            updated_at = now()
        WHERE id = p_transaction_id;
    END IF;

    RETURN v_payment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 4. next_document_number
--    Serialises number allocation so two concurrent saves cannot
--    mint the same document number.
-- ============================================================
CREATE OR REPLACE FUNCTION next_document_number(
    p_company_id UUID,
    p_type TEXT
) RETURNS TEXT AS $$
DECLARE
    v_prefix TEXT;
    v_fy TEXT;
    v_next INT;
    v_lock_key BIGINT;
BEGIN
    v_prefix := CASE p_type
        WHEN 'sale' THEN 'INV'
        WHEN 'purchase' THEN 'PUR'
        WHEN 'quotation' THEN 'QUO'
        WHEN 'purchase_order' THEN 'PO'
        WHEN 'proforma_invoice' THEN 'PI'
        ELSE 'DOC'
    END;

    v_fy := CASE
        WHEN EXTRACT(MONTH FROM CURRENT_DATE) >= 4
            THEN TO_CHAR(CURRENT_DATE, 'YY') || TO_CHAR(CURRENT_DATE + INTERVAL '1 year', 'YY')
        ELSE TO_CHAR(CURRENT_DATE - INTERVAL '1 year', 'YY') || TO_CHAR(CURRENT_DATE, 'YY')
    END;

    -- Advisory lock keyed on company + type
    v_lock_key := ('x' || SUBSTRING(md5(p_company_id::TEXT || p_type), 1, 16))::BIT(64)::BIGINT;
    PERFORM pg_advisory_xact_lock(v_lock_key);

    SELECT COALESCE(MAX(
        CAST(SUBSTRING(document_number FROM '[0-9]+$') AS INT)
    ), 0) + 1
    INTO v_next
    FROM transactions
    WHERE company_id = p_company_id
      AND type = p_type
      AND document_number LIKE v_prefix || '/' || v_fy || '/%';

    RETURN v_prefix || '/' || v_fy || '/' || LPAD(v_next::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 5. GRANTS – the client authenticates as `authenticated`
-- ============================================================
GRANT EXECUTE ON FUNCTION post_document_stock(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_document_stock(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION apply_document_payment(UUID, TEXT, DATE, TEXT, TEXT, TEXT, NUMERIC, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION next_document_number(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_document_number(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_customer_balance(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_supplier_balance(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_product_stock(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION adjust_stock(UUID, UUID, NUMERIC, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_dashboard_sales_summary(UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_dashboard_purchase_summary(UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_dashboard_stock_summary(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_dashboard_low_stock(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_dashboard_fast_moving(UUID, DATE, DATE, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_dashboard_customer_outstanding(UUID) TO authenticated;
