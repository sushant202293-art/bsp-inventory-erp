-- ============================================================
-- 004_document_fields.sql – Document-level fields referenced by
-- the app but missing from the original schema, plus HSN on
-- line items so GST reports can group correctly.
-- ============================================================

-- ============================================================
-- 1. TRANSACTIONS: document-specific fields
-- ============================================================
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS gstin TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS validity_date DATE;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS expected_delivery DATE;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS salesperson TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_validity ON transactions(validity_date);
CREATE INDEX IF NOT EXISTS idx_transactions_salesperson ON transactions(salesperson);

-- ============================================================
-- 2. TRANSACTION_ITEMS: snapshot HSN/SAC + description
--    Snapshotting keeps historic GST returns correct even if the
--    product's HSN code is later corrected.
-- ============================================================
ALTER TABLE transaction_items ADD COLUMN IF NOT EXISTS hsn_sac TEXT;
ALTER TABLE transaction_items ADD COLUMN IF NOT EXISTS description TEXT;

CREATE INDEX IF NOT EXISTS idx_transaction_items_hsn ON transaction_items(hsn_sac);

-- Backfill HSN from the linked product for existing rows
UPDATE transaction_items ti
SET hsn_sac = p.hsn_sac
FROM products p
WHERE p.id = ti.product_id
  AND ti.hsn_sac IS NULL
  AND p.hsn_sac IS NOT NULL;

-- ============================================================
-- 3. STATUS CONSTRAINT
--    The app can produce 'confirmed' | 'approved' | 'cancelled' |
--    'paid' | 'partial' | 'draft'. Drop the old CHECK and replace it
--    with the same set so re-applying is safe.
-- ============================================================
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_status_check;
ALTER TABLE transactions
    ADD CONSTRAINT transactions_status_check
    CHECK (status IN ('draft', 'confirmed', 'approved', 'cancelled', 'paid', 'partial'));

-- ============================================================
-- 4. DOCUMENT NUMBER UNIQUENESS
--    Without this, two concurrent saves can mint the same number.
-- ============================================================
CREATE UNIQUE INDEX IF NOT EXISTS uq_transactions_company_type_docnum
    ON transactions(company_id, type, document_number);

-- ============================================================
-- 5. PRODUCT_STOCK: index for warehouse lookups used by posting
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_product_stock_product_warehouse
    ON product_stock(product_id, warehouse_id);

-- ============================================================
-- 6. LEDGER: indexes for running-balance recalculation
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_customer_ledger_customer_date
    ON customer_ledger(customer_id, date, created_at);
CREATE INDEX IF NOT EXISTS idx_supplier_ledger_supplier_date
    ON supplier_ledger(supplier_id, date, created_at);
