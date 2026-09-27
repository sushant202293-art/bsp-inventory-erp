-- ============================================================
-- 003_functions.sql – PostgreSQL Functions
-- ============================================================

-- ============================================================
-- 1. generate_document_number
-- ============================================================
CREATE OR REPLACE FUNCTION generate_document_number(
    p_prefix TEXT,
    p_company_id UUID
) RETURNS TEXT AS $$
DECLARE
    v_next_number INT;
    v_doc_number TEXT;
    v_fiscal_year TEXT;
    v_start_date DATE;
    v_end_date DATE;
BEGIN
    -- Determine fiscal year (April to March)
    IF EXTRACT(MONTH FROM CURRENT_DATE) >= 4 THEN
        v_start_date := DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '3 months';
        v_end_date := v_start_date + INTERVAL '1 year' - INTERVAL '1 day';
    ELSE
        v_start_date := DATE_TRUNC('year', CURRENT_DATE) - INTERVAL '9 months';
        v_end_date := DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '3 months' - INTERVAL '1 day';
    END IF;

    v_fiscal_year := TO_CHAR(v_start_date, 'YY') || TO_CHAR(v_end_date, 'YY');

    -- Get next number within fiscal year
    SELECT COALESCE(MAX(
        CAST(SUBSTRING(document_number FROM LENGTH(p_prefix || '-' || v_fiscal_year || '/') + 1) AS INT)
    ), 0) + 1
    INTO v_next_number
    FROM transactions
    WHERE company_id = p_company_id
      AND document_number LIKE (p_prefix || '-' || v_fiscal_year || '/%');

    v_doc_number := p_prefix || '-' || v_fiscal_year || '/' || LPAD(v_next_number::TEXT, 6, '0');

    RETURN v_doc_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 2. calculate_customer_balance
-- ============================================================
CREATE OR REPLACE FUNCTION calculate_customer_balance(
    p_customer_id UUID
) RETURNS DECIMAL AS $$
DECLARE
    v_opening_balance DECIMAL;
    v_opening_type TEXT;
    v_total_debit DECIMAL;
    v_total_credit DECIMAL;
    v_balance DECIMAL;
BEGIN
    -- Get opening balance
    SELECT opening_balance, opening_balance_type
    INTO v_opening_balance, v_opening_type
    FROM customers WHERE id = p_customer_id;

    IF v_opening_balance IS NULL THEN v_opening_balance := 0; END IF;

    -- Calculate from ledger
    SELECT
        COALESCE(SUM(debit), 0),
        COALESCE(SUM(credit), 0)
    INTO v_total_debit, v_total_credit
    FROM customer_ledger
    WHERE customer_id = p_customer_id;

    -- Opening balance: debit = positive (customer owes us), credit = negative (we owe customer)
    IF v_opening_type = 'credit' THEN
        v_balance := v_total_debit - v_total_credit - v_opening_balance;
    ELSE
        v_balance := v_opening_balance + v_total_debit - v_total_credit;
    END IF;

    RETURN COALESCE(v_balance, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 3. calculate_supplier_balance
-- ============================================================
CREATE OR REPLACE FUNCTION calculate_supplier_balance(
    p_supplier_id UUID
) RETURNS DECIMAL AS $$
DECLARE
    v_opening_balance DECIMAL;
    v_opening_type TEXT;
    v_total_debit DECIMAL;
    v_total_credit DECIMAL;
    v_balance DECIMAL;
BEGIN
    SELECT opening_balance, opening_balance_type
    INTO v_opening_balance, v_opening_type
    FROM suppliers WHERE id = p_supplier_id;

    IF v_opening_balance IS NULL THEN v_opening_balance := 0; END IF;

    SELECT
        COALESCE(SUM(debit), 0),
        COALESCE(SUM(credit), 0)
    INTO v_total_debit, v_total_credit
    FROM supplier_ledger
    WHERE supplier_id = p_supplier_id;

    -- Supplier: credit = we owe supplier, debit = we paid supplier
    IF v_opening_type = 'debit' THEN
        v_balance := v_total_credit - v_total_debit - v_opening_balance;
    ELSE
        v_balance := v_opening_balance + v_total_credit - v_total_debit;
    END IF;

    RETURN COALESCE(v_balance, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 4. calculate_product_stock
-- ============================================================
CREATE OR REPLACE FUNCTION calculate_product_stock(
    p_product_id UUID
) RETURNS DECIMAL AS $$
DECLARE
    v_total DECIMAL;
BEGIN
    SELECT COALESCE(SUM(current_stock), 0)
    INTO v_total
    FROM product_stock
    WHERE product_id = p_product_id;

    RETURN COALESCE(v_total, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 5. post_sales_transaction
-- ============================================================
CREATE OR REPLACE FUNCTION post_sales_transaction(
    p_transaction_id UUID
) RETURNS VOID AS $$
DECLARE
    v_transaction RECORD;
    v_item RECORD;
    v_warehouse_id UUID;
    v_current_stock DECIMAL;
    v_new_stock DECIMAL;
    v_company_id UUID;
BEGIN
    -- Get transaction details
    SELECT * INTO v_transaction FROM transactions WHERE id = p_transaction_id;

    IF v_transaction IS NULL THEN
        RAISE EXCEPTION 'Transaction not found: %', p_transaction_id;
    END IF;

    IF v_transaction.type != 'sale' THEN
        RAISE EXCEPTION 'Transaction is not a sale type';
    END IF;

    IF v_transaction.status = 'cancelled' THEN
        RAISE EXCEPTION 'Cannot post a cancelled transaction';
    END IF;

    v_company_id := v_transaction.company_id;

    -- Get default warehouse
    SELECT id INTO v_warehouse_id
    FROM warehouses
    WHERE company_id = v_company_id AND is_active = true
    ORDER BY created_at ASC
    LIMIT 1;

    IF v_warehouse_id IS NULL THEN
        RAISE EXCEPTION 'No active warehouse found for company';
    END IF;

    -- Process each item
    FOR v_item IN
        SELECT * FROM transaction_items WHERE transaction_id = p_transaction_id
    LOOP
        -- Get current stock
        SELECT current_stock INTO v_current_stock
        FROM product_stock
        WHERE product_id = v_item.product_id AND warehouse_id = v_warehouse_id;

        IF v_current_stock IS NULL THEN
            v_current_stock := 0;
        END IF;

        v_new_stock := v_current_stock - v_item.quantity;

        IF v_new_stock < 0 THEN
            RAISE EXCEPTION 'Insufficient stock for product %: available %, required %',
                v_item.product_name, v_current_stock, v_item.quantity;
        END IF;

        -- Update or insert product_stock
        INSERT INTO product_stock (product_id, warehouse_id, current_stock, avg_cost, last_updated)
        VALUES (v_item.product_id, v_warehouse_id, v_new_stock, v_item.rate, now())
        ON CONFLICT (product_id, warehouse_id)
        DO UPDATE SET
            current_stock = v_new_stock,
            last_updated = now();

        -- Create stock movement
        INSERT INTO stock_movements (
            company_id, product_id, warehouse_id, type,
            reference_type, reference_id,
            quantity, balance_after, unit_cost, total_value,
            created_by
        ) VALUES (
            v_company_id, v_item.product_id, v_warehouse_id, 'sales',
            'transaction', p_transaction_id,
            -v_item.quantity, v_new_stock, v_item.rate, v_item.total_amount,
            v_transaction.created_by
        );
    END LOOP;

    -- Create customer ledger entry (debit - customer owes us)
    IF v_transaction.customer_id IS NOT NULL THEN
        INSERT INTO customer_ledger (
            customer_id, date, description, debit, credit, balance,
            reference_type, reference_id
        ) VALUES (
            v_transaction.customer_id,
            v_transaction.document_date,
            'Sale: ' || v_transaction.document_number,
            v_transaction.grand_total,
            0,
            calculate_customer_balance(v_transaction.customer_id),
            'transaction',
            p_transaction_id
        );
    END IF;

    -- Update transaction status
    UPDATE transactions
    SET status = 'confirmed'
    WHERE id = p_transaction_id AND status = 'draft';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 6. post_purchase_transaction
-- ============================================================
CREATE OR REPLACE FUNCTION post_purchase_transaction(
    p_transaction_id UUID
) RETURNS VOID AS $$
DECLARE
    v_transaction RECORD;
    v_item RECORD;
    v_warehouse_id UUID;
    v_current_stock DECIMAL;
    v_new_stock DECIMAL;
    v_company_id UUID;
BEGIN
    SELECT * INTO v_transaction FROM transactions WHERE id = p_transaction_id;

    IF v_transaction IS NULL THEN
        RAISE EXCEPTION 'Transaction not found: %', p_transaction_id;
    END IF;

    IF v_transaction.type != 'purchase' THEN
        RAISE EXCEPTION 'Transaction is not a purchase type';
    END IF;

    IF v_transaction.status = 'cancelled' THEN
        RAISE EXCEPTION 'Cannot post a cancelled transaction';
    END IF;

    v_company_id := v_transaction.company_id;

    SELECT id INTO v_warehouse_id
    FROM warehouses
    WHERE company_id = v_company_id AND is_active = true
    ORDER BY created_at ASC
    LIMIT 1;

    IF v_warehouse_id IS NULL THEN
        RAISE EXCEPTION 'No active warehouse found for company';
    END IF;

    FOR v_item IN
        SELECT * FROM transaction_items WHERE transaction_id = p_transaction_id
    LOOP
        SELECT current_stock INTO v_current_stock
        FROM product_stock
        WHERE product_id = v_item.product_id AND warehouse_id = v_warehouse_id;

        IF v_current_stock IS NULL THEN
            v_current_stock := 0;
        END IF;

        v_new_stock := v_current_stock + v_item.quantity;

        INSERT INTO product_stock (product_id, warehouse_id, current_stock, avg_cost, last_updated)
        VALUES (v_item.product_id, v_warehouse_id, v_new_stock, v_item.rate, now())
        ON CONFLICT (product_id, warehouse_id)
        DO UPDATE SET
            current_stock = v_new_stock,
            avg_cost = CASE
                WHEN v_new_stock > 0 THEN
                    ((product_stock.avg_cost * product_stock.current_stock) + (v_item.rate * v_item.quantity)) / v_new_stock
                ELSE v_item.rate
            END,
            last_updated = now();

        INSERT INTO stock_movements (
            company_id, product_id, warehouse_id, type,
            reference_type, reference_id,
            quantity, balance_after, unit_cost, total_value,
            created_by
        ) VALUES (
            v_company_id, v_item.product_id, v_warehouse_id, 'purchase',
            'transaction', p_transaction_id,
            v_item.quantity, v_new_stock, v_item.rate, v_item.total_amount,
            v_transaction.created_by
        );
    END LOOP;

    -- Create supplier ledger entry (credit - we owe supplier)
    IF v_transaction.supplier_id IS NOT NULL THEN
        INSERT INTO supplier_ledger (
            supplier_id, date, description, debit, credit, balance,
            reference_type, reference_id
        ) VALUES (
            v_transaction.supplier_id,
            v_transaction.document_date,
            'Purchase: ' || v_transaction.document_number,
            0,
            v_transaction.grand_total,
            calculate_supplier_balance(v_transaction.supplier_id),
            'transaction',
            p_transaction_id
        );
    END IF;

    UPDATE transactions
    SET status = 'confirmed'
    WHERE id = p_transaction_id AND status = 'draft';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 7. create_payment_received
-- ============================================================
CREATE OR REPLACE FUNCTION create_payment_received(
    p_customer_id UUID,
    p_date DATE,
    p_reference_number TEXT,
    p_mode TEXT,
    p_bank_name TEXT,
    p_amount DECIMAL,
    p_notes TEXT,
    p_transaction_id UUID,
    p_created_by UUID
) RETURNS UUID AS $$
DECLARE
    v_payment_id UUID;
    v_company_id UUID;
    v_customer RECORD;
BEGIN
    SELECT company_id INTO v_company_id FROM customers WHERE id = p_customer_id;
    IF v_company_id IS NULL THEN
        RAISE EXCEPTION 'Customer not found';
    END IF;

    -- Create payment
    INSERT INTO payments_received (
        company_id, customer_id, date, reference_number,
        mode, bank_name, amount, notes, transaction_id, created_by
    ) VALUES (
        v_company_id, p_customer_id, p_date, p_reference_number,
        p_mode, p_bank_name, p_amount, p_notes, p_transaction_id, p_created_by
    ) RETURNING id INTO v_payment_id;

    -- Create customer ledger entry (credit - customer paid us)
    INSERT INTO customer_ledger (
        customer_id, date, description, debit, credit, balance,
        reference_type, reference_id
    ) VALUES (
        p_customer_id,
        p_date,
        'Payment received: ' || COALESCE(p_reference_number, ''),
        0,
        p_amount,
        calculate_customer_balance(p_customer_id),
        'payment_received',
        v_payment_id
    );

    -- Update transaction amount_paid if linked
    IF p_transaction_id IS NOT NULL THEN
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
-- 8. create_payment_made
-- ============================================================
CREATE OR REPLACE FUNCTION create_payment_made(
    p_supplier_id UUID,
    p_date DATE,
    p_reference_number TEXT,
    p_mode TEXT,
    p_bank_name TEXT,
    p_amount DECIMAL,
    p_notes TEXT,
    p_transaction_id UUID,
    p_created_by UUID
) RETURNS UUID AS $$
DECLARE
    v_payment_id UUID;
    v_company_id UUID;
BEGIN
    SELECT company_id INTO v_company_id FROM suppliers WHERE id = p_supplier_id;
    IF v_company_id IS NULL THEN
        RAISE EXCEPTION 'Supplier not found';
    END IF;

    INSERT INTO payments_made (
        company_id, supplier_id, date, reference_number,
        mode, bank_name, amount, notes, transaction_id, created_by
    ) VALUES (
        v_company_id, p_supplier_id, p_date, p_reference_number,
        p_mode, p_bank_name, p_amount, p_notes, p_transaction_id, p_created_by
    ) RETURNING id INTO v_payment_id;

    -- Create supplier ledger entry (debit - we paid supplier)
    INSERT INTO supplier_ledger (
        supplier_id, date, description, debit, credit, balance,
        reference_type, reference_id
    ) VALUES (
        p_supplier_id,
        p_date,
        'Payment made: ' || COALESCE(p_reference_number, ''),
        p_amount,
        0,
        calculate_supplier_balance(p_supplier_id),
        'payment_made',
        v_payment_id
    );

    IF p_transaction_id IS NOT NULL THEN
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
-- 9. adjust_stock
-- ============================================================
CREATE OR REPLACE FUNCTION adjust_stock(
    p_product_id UUID,
    p_warehouse_id UUID,
    p_quantity DECIMAL,
    p_type TEXT,
    p_notes TEXT
) RETURNS VOID AS $$
DECLARE
    v_company_id UUID;
    v_current_stock DECIMAL;
    v_new_stock DECIMAL;
    v_product RECORD;
BEGIN
    SELECT company_id INTO v_company_id FROM products WHERE id = p_product_id;
    IF v_company_id IS NULL THEN
        RAISE EXCEPTION 'Product not found';
    END IF;

    SELECT current_stock INTO v_current_stock
    FROM product_stock
    WHERE product_id = p_product_id AND warehouse_id = p_warehouse_id;

    IF v_current_stock IS NULL THEN
        v_current_stock := 0;
    END IF;

    IF p_type = 'adjustment_in' THEN
        v_new_stock := v_current_stock + ABS(p_quantity);
    ELSIF p_type = 'adjustment_out' THEN
        v_new_stock := v_current_stock - ABS(p_quantity);
        IF v_new_stock < 0 THEN
            RAISE EXCEPTION 'Insufficient stock for adjustment. Available: %, Requested: %', v_current_stock, ABS(p_quantity);
        END IF;
    ELSE
        RAISE EXCEPTION 'Invalid adjustment type: %. Must be adjustment_in or adjustment_out', p_type;
    END IF;

    INSERT INTO product_stock (product_id, warehouse_id, current_stock, last_updated)
    VALUES (p_product_id, p_warehouse_id, v_new_stock, now())
    ON CONFLICT (product_id, warehouse_id)
    DO UPDATE SET current_stock = v_new_stock, last_updated = now();

    INSERT INTO stock_movements (
        company_id, product_id, warehouse_id, type,
        reference_type, quantity, balance_after, notes, created_at
    ) VALUES (
        v_company_id, p_product_id, p_warehouse_id, p_type,
        'adjustment', p_quantity, v_new_stock, p_notes, now()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 10. get_dashboard_sales_summary
-- ============================================================
CREATE OR REPLACE FUNCTION get_dashboard_sales_summary(
    p_company_id UUID,
    p_date_from DATE DEFAULT NULL,
    p_date_to DATE DEFAULT NULL
) RETURNS TABLE (
    total_sales DECIMAL,
    total_invoices BIGINT,
    total_items_sold DECIMAL,
    avg_invoice_value DECIMAL,
    today_sales DECIMAL,
    month_sales DECIMAL
) AS $$
BEGIN
    -- Default date range: current fiscal year
    IF p_date_from IS NULL THEN
        IF EXTRACT(MONTH FROM CURRENT_DATE) >= 4 THEN
            p_date_from := DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '3 months';
        ELSE
            p_date_from := DATE_TRUNC('year', CURRENT_DATE) - INTERVAL '9 months';
        END IF;
    END IF;

    IF p_date_to IS NULL THEN
        p_date_to := CURRENT_DATE;
    END IF;

    RETURN QUERY
    SELECT
        COALESCE(SUM(t.grand_total), 0) AS total_sales,
        COUNT(t.id) AS total_invoices,
        COALESCE(SUM(ti.quantity), 0) AS total_items_sold,
        CASE WHEN COUNT(t.id) > 0 THEN SUM(t.grand_total) / COUNT(t.id) ELSE 0 END AS avg_invoice_value,
        COALESCE(SUM(CASE WHEN t.document_date = CURRENT_DATE THEN t.grand_total ELSE 0 END), 0) AS today_sales,
        COALESCE(SUM(CASE WHEN t.document_date >= DATE_TRUNC('month', CURRENT_DATE) THEN t.grand_total ELSE 0 END), 0) AS month_sales
    FROM transactions t
    LEFT JOIN transaction_items ti ON ti.transaction_id = t.id
    WHERE t.company_id = p_company_id
      AND t.type = 'sale'
      AND t.status NOT IN ('cancelled', 'draft')
      AND t.document_date BETWEEN p_date_from AND p_date_to;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 11. get_dashboard_purchase_summary
-- ============================================================
CREATE OR REPLACE FUNCTION get_dashboard_purchase_summary(
    p_company_id UUID,
    p_date_from DATE DEFAULT NULL,
    p_date_to DATE DEFAULT NULL
) RETURNS TABLE (
    total_purchases DECIMAL,
    total_invoices BIGINT,
    total_items_purchased DECIMAL,
    avg_invoice_value DECIMAL,
    today_purchases DECIMAL,
    month_purchases DECIMAL
) AS $$
BEGIN
    IF p_date_from IS NULL THEN
        IF EXTRACT(MONTH FROM CURRENT_DATE) >= 4 THEN
            p_date_from := DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '3 months';
        ELSE
            p_date_from := DATE_TRUNC('year', CURRENT_DATE) - INTERVAL '9 months';
        END IF;
    END IF;

    IF p_date_to IS NULL THEN
        p_date_to := CURRENT_DATE;
    END IF;

    RETURN QUERY
    SELECT
        COALESCE(SUM(t.grand_total), 0) AS total_purchases,
        COUNT(t.id) AS total_invoices,
        COALESCE(SUM(ti.quantity), 0) AS total_items_purchased,
        CASE WHEN COUNT(t.id) > 0 THEN SUM(t.grand_total) / COUNT(t.id) ELSE 0 END AS avg_invoice_value,
        COALESCE(SUM(CASE WHEN t.document_date = CURRENT_DATE THEN t.grand_total ELSE 0 END), 0) AS today_purchases,
        COALESCE(SUM(CASE WHEN t.document_date >= DATE_TRUNC('month', CURRENT_DATE) THEN t.grand_total ELSE 0 END), 0) AS month_purchases
    FROM transactions t
    LEFT JOIN transaction_items ti ON ti.transaction_id = t.id
    WHERE t.company_id = p_company_id
      AND t.type = 'purchase'
      AND t.status NOT IN ('cancelled', 'draft')
      AND t.document_date BETWEEN p_date_from AND p_date_to;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 12. get_dashboard_stock_summary
-- ============================================================
CREATE OR REPLACE FUNCTION get_dashboard_stock_summary(
    p_company_id UUID
) RETURNS TABLE (
    total_products BIGINT,
    total_stock_value DECIMAL,
    total_stock_quantity DECIMAL,
    low_stock_count BIGINT,
    out_of_stock_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(DISTINCT p.id) AS total_products,
        COALESCE(SUM(ps.current_stock * ps.avg_cost), 0) AS total_stock_value,
        COALESCE(SUM(ps.current_stock), 0) AS total_stock_quantity,
        COUNT(DISTINCT CASE WHEN COALESCE(calc_stock.total, 0) <= p.low_stock_level AND COALESCE(calc_stock.total, 0) > 0 THEN p.id END) AS low_stock_count,
        COUNT(DISTINCT CASE WHEN COALESCE(calc_stock.total, 0) = 0 THEN p.id END) AS out_of_stock_count
    FROM products p
    LEFT JOIN product_stock ps ON ps.product_id = p.id
    LEFT JOIN (
        SELECT product_id, SUM(current_stock) AS total
        FROM product_stock ps2
        GROUP BY product_id
    ) calc_stock ON calc_stock.product_id = p.id
    WHERE p.company_id = p_company_id
      AND p.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 13. get_dashboard_low_stock
-- ============================================================
CREATE OR REPLACE FUNCTION get_dashboard_low_stock(
    p_company_id UUID
) RETURNS TABLE (
    product_id UUID,
    product_name TEXT,
    product_code TEXT,
    current_stock DECIMAL,
    low_stock_level INT,
    brand_name TEXT,
    category_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id AS product_id,
        p.name AS product_name,
        p.code AS product_code,
        COALESCE(calc_stock.total, 0) AS current_stock,
        p.low_stock_level,
        b.name AS brand_name,
        c.name AS category_name
    FROM products p
    LEFT JOIN (
        SELECT product_id, SUM(current_stock) AS total
        FROM product_stock ps
        GROUP BY product_id
    ) calc_stock ON calc_stock.product_id = p.id
    LEFT JOIN brands b ON b.id = p.brand_id
    LEFT JOIN categories c ON c.id = p.category_id
    WHERE p.company_id = p_company_id
      AND p.is_active = true
      AND COALESCE(calc_stock.total, 0) <= p.low_stock_level
    ORDER BY COALESCE(calc_stock.total, 0) ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 14. get_dashboard_fast_moving
-- ============================================================
CREATE OR REPLACE FUNCTION get_dashboard_fast_moving(
    p_company_id UUID,
    p_date_from DATE DEFAULT NULL,
    p_date_to DATE DEFAULT NULL,
    p_limit INT DEFAULT 10
) RETURNS TABLE (
    product_id UUID,
    product_name TEXT,
    product_code TEXT,
    total_quantity DECIMAL,
    total_revenue DECIMAL,
    order_count BIGINT
) AS $$
BEGIN
    IF p_date_from IS NULL THEN
        p_date_from := CURRENT_DATE - INTERVAL '30 days';
    END IF;
    IF p_date_to IS NULL THEN
        p_date_to := CURRENT_DATE;
    END IF;

    RETURN QUERY
    SELECT
        p.id AS product_id,
        p.name AS product_name,
        p.code AS product_code,
        COALESCE(SUM(ti.quantity), 0) AS total_quantity,
        COALESCE(SUM(ti.total_amount), 0) AS total_revenue,
        COUNT(DISTINCT t.id) AS order_count
    FROM products p
    JOIN transaction_items ti ON ti.product_id = p.id
    JOIN transactions t ON t.id = ti.transaction_id
    WHERE t.company_id = p_company_id
      AND t.type = 'sale'
      AND t.status NOT IN ('cancelled', 'draft')
      AND t.document_date BETWEEN p_date_from AND p_date_to
    GROUP BY p.id, p.name, p.code
    ORDER BY total_quantity DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 15. get_dashboard_customer_outstanding
-- ============================================================
CREATE OR REPLACE FUNCTION get_dashboard_customer_outstanding(
    p_company_id UUID
) RETURNS TABLE (
    customer_id UUID,
    customer_name TEXT,
    outstanding_balance DECIMAL,
    credit_limit DECIMAL,
    over_limit BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id AS customer_id,
        c.name AS customer_name,
        calculate_customer_balance(c.id) AS outstanding_balance,
        c.credit_limit,
        CASE WHEN calculate_customer_balance(c.id) > c.credit_limit AND c.credit_limit > 0 THEN true ELSE false END AS over_limit
    FROM customers c
    WHERE c.company_id = p_company_id
      AND c.is_active = true
      AND calculate_customer_balance(c.id) > 0
    ORDER BY outstanding_balance DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 16. Recalculate trigger for customer_ledger
--     Keeps the denormalised `balance` column a true running
--     balance, seeded from the customer's opening balance.
-- ============================================================
CREATE OR REPLACE FUNCTION recalculate_customer_balance_trigger()
RETURNS TRIGGER AS $$
DECLARE
    v_party UUID;
BEGIN
    -- A running total must be seeded from every preceding row, so a partial
    -- recalculation starting at the changed row would report wrong balances.
    -- The previous version compared a 2-column row against a 1-column
    -- subquery (a hard error) and started the running total at zero.
    --
    -- Two corrections over that version:
    --   1. `NEW` is an unassigned record on DELETE, so `COALESCE(NEW.x, OLD.x)`
    --      raised "record new is not assigned yet". Branch on TG_OP instead.
    --   2. Reassigning a row to a different customer left the OLD customer's
    --      running balances stale, because only one party was recalculated.
    --      Walk the distinct set of affected parties so both are fixed.
    FOREACH v_party IN ARRAY COALESCE((
        SELECT ARRAY_AGG(DISTINCT p)
        FROM (
            SELECT CASE WHEN TG_OP <> 'INSERT' THEN OLD.customer_id END AS p
            UNION
            SELECT CASE WHEN TG_OP <> 'DELETE' THEN NEW.customer_id END
        ) ids
        WHERE p IS NOT NULL
    ), ARRAY[]::UUID[]) LOOP
        PERFORM refresh_customer_running_balance(v_party);
    END LOOP;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 15b. refresh_customer_running_balance
--     Recomputes the whole running balance for one customer.
-- ============================================================
CREATE OR REPLACE FUNCTION refresh_customer_running_balance(p_customer_id UUID)
RETURNS VOID AS $$
DECLARE
    v_opening NUMERIC := 0;
BEGIN
    SELECT CASE WHEN COALESCE(opening_balance_type, 'debit') = 'credit'
                THEN -COALESCE(opening_balance, 0)
                ELSE COALESCE(opening_balance, 0) END
    INTO v_opening
    FROM customers WHERE id = p_customer_id;

    v_opening := COALESCE(v_opening, 0);

    WITH ordered AS (
        SELECT id,
               SUM(COALESCE(debit, 0) - COALESCE(credit, 0)) OVER (
                   PARTITION BY customer_id
                   ORDER BY date ASC, created_at ASC, id ASC
                   ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
               ) AS running
        FROM customer_ledger
        WHERE customer_id = p_customer_id
    )
    UPDATE customer_ledger cl
    SET balance = v_opening + ordered.running
    FROM ordered
    WHERE cl.id = ordered.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_customer_ledger_balance ON customer_ledger;
CREATE TRIGGER trg_customer_ledger_balance
    AFTER INSERT OR DELETE ON customer_ledger
    FOR EACH ROW
    EXECUTE FUNCTION recalculate_customer_balance_trigger();

-- Separate UPDATE trigger with a WHEN guard: this function writes to
-- customer_ledger.balance, so without the guard the recalculation would
-- re-enter itself forever.
DROP TRIGGER IF EXISTS trg_customer_ledger_balance_update ON customer_ledger;
CREATE TRIGGER trg_customer_ledger_balance_update
    AFTER UPDATE ON customer_ledger
    FOR EACH ROW
    WHEN (OLD.debit IS DISTINCT FROM NEW.debit
          OR OLD.credit IS DISTINCT FROM NEW.credit
          OR OLD.customer_id IS DISTINCT FROM NEW.customer_id
          OR OLD.date IS DISTINCT FROM NEW.date)
    EXECUTE FUNCTION recalculate_customer_balance_trigger();

-- ============================================================
-- 17. Recalculate trigger for supplier_ledger
-- ============================================================
CREATE OR REPLACE FUNCTION recalculate_supplier_balance_trigger()
RETURNS TRIGGER AS $$
DECLARE
    v_party UUID;
BEGIN
    -- Same two corrections as the customer trigger: `NEW` is unassigned on
    -- DELETE, and reassigning a row must refresh the old supplier too.
    FOREACH v_party IN ARRAY COALESCE((
        SELECT ARRAY_AGG(DISTINCT p)
        FROM (
            SELECT CASE WHEN TG_OP <> 'INSERT' THEN OLD.supplier_id END AS p
            UNION
            SELECT CASE WHEN TG_OP <> 'DELETE' THEN NEW.supplier_id END
        ) ids
        WHERE p IS NOT NULL
    ), ARRAY[]::UUID[]) LOOP
        PERFORM refresh_supplier_running_balance(v_party);
    END LOOP;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 17b. refresh_supplier_running_balance
-- ============================================================
CREATE OR REPLACE FUNCTION refresh_supplier_running_balance(p_supplier_id UUID)
RETURNS VOID AS $$
DECLARE
    v_opening NUMERIC := 0;
BEGIN
    SELECT CASE WHEN COALESCE(opening_balance_type, 'credit') = 'debit'
                THEN -COALESCE(opening_balance, 0)
                ELSE COALESCE(opening_balance, 0) END
    INTO v_opening
    FROM suppliers WHERE id = p_supplier_id;

    v_opening := COALESCE(v_opening, 0);

    -- Supplier balances run credit-minus-debit (what we owe).
    WITH ordered AS (
        SELECT id,
               SUM(COALESCE(credit, 0) - COALESCE(debit, 0)) OVER (
                   PARTITION BY supplier_id
                   ORDER BY date ASC, created_at ASC, id ASC
                   ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
               ) AS running
        FROM supplier_ledger
        WHERE supplier_id = p_supplier_id
    )
    UPDATE supplier_ledger sl
    SET balance = v_opening + ordered.running
    FROM ordered
    WHERE sl.id = ordered.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_supplier_ledger_balance ON supplier_ledger;
CREATE TRIGGER trg_supplier_ledger_balance
    AFTER INSERT OR DELETE ON supplier_ledger
    FOR EACH ROW
    EXECUTE FUNCTION recalculate_supplier_balance_trigger();

-- Guarded for the same reason as the customer ledger: the function writes
-- `balance`, so an unguarded AFTER UPDATE trigger would recurse.
DROP TRIGGER IF EXISTS trg_supplier_ledger_balance_update ON supplier_ledger;
CREATE TRIGGER trg_supplier_ledger_balance_update
    AFTER UPDATE ON supplier_ledger
    FOR EACH ROW
    WHEN (OLD.debit IS DISTINCT FROM NEW.debit
          OR OLD.credit IS DISTINCT FROM NEW.credit
          OR OLD.supplier_id IS DISTINCT FROM NEW.supplier_id
          OR OLD.date IS DISTINCT FROM NEW.date)
    EXECUTE FUNCTION recalculate_supplier_balance_trigger();
