-- ============================================================
-- demo_data.sql
--
-- Idempotent demo dataset for local development and screenshots.
--
-- Run AFTER 001..006. Creates one demo company with a full catalog,
-- stock, customers, suppliers, documents, ledger entries and payments.
--
--   psql "$DATABASE_URL" -f supabase/seed/demo_data.sql
--
-- Every insert is guarded so re-running will not duplicate rows.
-- To reset everything:  TRUNCATE ... (see the bottom of this file).
-- ============================================================

BEGIN;

-- ============================================================
-- 1. COMPANY
-- ============================================================
INSERT INTO companies (id, name, gstin, pan, state, state_code, address, city, pin, country, phone, email, website)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    'BSP Traders',
    '27AABCB1234C1Z5',
    'AABCB1234C',
    'Maharashtra',
    '27',
    'Shop 12, Gandhi Market, Andheri East',
    'Mumbai',
    '400069',
    'India',
    '+91 98200 00001',
    'accounts@bsptraders.example',
    'www.bsptraders.example'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 2. UNITS / CATEGORIES / BRANDS
-- ============================================================
INSERT INTO units (id, company_id, name, short_name, conversion_factor) VALUES
    ('20000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Each',        'NOS', 1),
    ('20000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Kilogram',    'KG',  1),
    ('20000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Litre',       'LTR', 1),
    ('20000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'Metre',       'MTR', 1),
    ('20000000-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'Box (12)',    'BOX', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO categories (id, company_id, name, description, parent_id) VALUES
    ('30000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Electronics',  'Consumer electronics', NULL),
    ('30000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Accessories',  'Cables, chargers, cases', '30000000-0000-0000-0000-000000000001'),
    ('30000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Stationery',   'Office consumables', NULL),
    ('30000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'Packaging',    'Cartons, tape, bubble wrap', NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO brands (id, company_id, name, description) VALUES
    ('40000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Generic',   'No-brand budget line'),
    ('40000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Samsung',   'Consumer electronics'),
    ('40000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'HP',        'Printers and consumables'),
    ('40000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'D-Link',    'Networking')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 3. WAREHOUSE
--    (Migration 005 normally creates this via trigger; created here
--     explicitly so the seed works on a database where the company
--     row already existed before 005 ran.)
-- ============================================================
INSERT INTO warehouses (id, company_id, name, code, address, is_active, is_default)
VALUES (
    '50000000-0000-0000-0000-000000000001',
    '11111111-1111-1111-1111-111111111111',
    'Main Warehouse',
    'MAIN',
    'Shop 12, Gandhi Market, Andheri East, Mumbai 400069',
    true,
    true
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 4. PRODUCTS
-- ============================================================
INSERT INTO products (
    id, company_id, name, code, category_id, brand_id, unit_id,
    gst_rate, hsn_sac, description,
    purchase_price, selling_price, low_stock_level, reorder_level, is_active
) VALUES
    ('60000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'USB-C Charging Cable 1m',   'CAB-USB-C-1M',  '30000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 18,   '8544', 'Braided cable, 60W',                    65.00,  120.00, 40, 100, true),
    ('60000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', '65W GaN Fast Charger',      'CHG-GAN-65W',   '30000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000001', 18,   '8504', 'Dual port GaN charger',                 540.00,  950.00, 20,  50, true),
    ('60000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Samsung 128GB microSD',     'MEM-SD-128',    '30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000002', 18,   '8523', 'Class 10, with adapter',                 620.00, 1050.00, 15,  40, true),
    ('60000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'D-Link CAT6 Patch Cable 3m','NET-CAT6-3M',   '30000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000004', 18,   '8544', 'Snagless, 3 metre',                     150.00,  290.00, 30,  80, true),
    ('60000000-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'A4 Copy Paper 500 sheets',  'PPR-A4-500',    '30000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000001', 12,   '4802', '80 GSM white',                          210.00,  340.00, 60, 150, true),
    ('60000000-0000-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', 'Gel Pen Box of 12',         'PEN-GEL-12',    '30000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000001', 18,   '9608', 'Assorted colours',                       90.00,  165.00, 50, 120, true),
    ('60000000-0000-0000-0000-000000000007', '11111111-1111-1111-1111-111111111111', 'Corrugated Box Medium',     'BOX-CRM-M',     '30000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000001', 18,   '4819', '12x9x9 inch, 3 ply',                     18.00,   32.00, 200, 500, true),
    ('60000000-0000-0000-0000-000000000008', '11111111-1111-1111-1111-111111111111', 'BOPP Packing Tape 2in',      'TAP-BOPP-2',    '30000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000001', 18,   '3919', '50 micron, transparent',                32.00,   58.00,  80, 200, true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 5. OPENING STOCK
-- ============================================================
INSERT INTO product_stock (product_id, warehouse_id, current_stock, avg_cost, last_updated) VALUES
    ('60000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 180,  65.00, now()),
    ('60000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000001',  28, 540.00, now()),
    ('60000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000001',   9, 620.00, now()),  -- below reorder level
    ('60000000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-000000000001',  95, 150.00, now()),
    ('60000000-0000-0000-0000-000000000005', '50000000-0000-0000-0000-000000000001',  72, 210.00, now()),
    ('60000000-0000-0000-0000-000000000006', '50000000-0000-0000-0000-000000000001', 140,  90.00, now()),
    ('60000000-0000-0000-0000-000000000007', '50000000-0000-0000-0000-000000000001', 340,  18.00, now()),
    ('60000000-0000-0000-0000-000000000008', '50000000-0000-0000-0000-000000000001',  45,  32.00, now())   -- below low stock level
ON CONFLICT (product_id, warehouse_id) DO NOTHING;

-- ============================================================
-- 6. CUSTOMERS  (Mumbai = intra-state, Pune = inter-state)
-- ============================================================
INSERT INTO customers (
    id, company_id, name, code, gstin, contact_person, phone, email,
    billing_address, shipping_address, city, state, pin, country,
    credit_limit, credit_period, opening_balance, opening_balance_type, is_active
) VALUES
    ('70000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Shreeji Retail Pvt Ltd', 'CUS-0001', '27AABCS1234D1ZP',
     'Rajesh Mehta', '+91 98330 11111', 'purchase@shreeji.example',
     '{"line1":"Unit 4, Sunrise Plaza","line2":null,"city":"Mumbai","state":"Maharashtra","pin":"400060","country":"India"}'::jsonb,
     '{"line1":"Unit 4, Sunrise Plaza","line2":null,"city":"Mumbai","state":"Maharashtra","pin":"400060","country":"India"}'::jsonb,
     'Mumbai', 'Maharashtra', '400060', 'India', 250000, 30, 0, 'debit', true),
    ('70000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Pune Tech Solutions',  'CUS-0002', '27AAECP5678E1ZQ',
     'Anita Deshpande', '+91 98220 22222', 'accounts@punetech.example',
     '{"line1":"3rd Floor, Sterling Centre","line2":null,"city":"Pune","state":"Maharashtra","pin":"411001","country":"India"}'::jsonb,
     '{"line1":"3rd Floor, Sterling Centre","line2":null,"city":"Pune","state":"Maharashtra","pin":"411001","country":"India"}'::jsonb,
     'Pune', 'Maharashtra', '411001', 'India', 150000, 45, 0, 'debit', true),
    ('70000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Karnataka Traders',     'CUS-0003', '29AABCK9012F1ZR',
     'Suresh Iyer', '+91 94440 33333', 'sales@karnatakatraders.example',
     '{"line1":"No. 22, Brigade Road","line2":null,"city":"Bengaluru","state":"Karnataka","pin":"560001","country":"India"}'::jsonb,
     '{"line1":"No. 22, Brigade Road","line2":null,"city":"Bengaluru","state":"Karnataka","pin":"560001","country":"India"}'::jsonb,
     'Bengaluru', 'Karnataka', '560001', 'India', 100000, 30, 0, 'debit', true),
    ('70000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'Sunrise Office Supplies','CUS-0004', '27AADCS3456G1ZR',
     'Neha Kulkarni', '+91 90040 44444', 'nehu@sunriseoffice.example',
     '{"line1":"Bungalow 7, Green Park","line2":null,"city":"Pune","state":"Maharashtra","pin":"411037","country":"India"}'::jsonb,
     '{"line1":"Bungalow 7, Green Park","line2":null,"city":"Pune","state":"Maharashtra","pin":"411037","country":"India"}'::jsonb,
     'Pune', 'Maharashtra', '411037', 'India', 40000, 15, 0, 'debit', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 7. SUPPLIERS
-- ============================================================
INSERT INTO suppliers (
    id, company_id, name, code, gstin, contact_person, phone, email,
    billing_address, city, state, pin, country,
    credit_limit, credit_period, opening_balance, opening_balance_type, payment_terms, is_active
) VALUES
    ('80000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Mumbai Electronics Wholesale', 'SUP-0001', '27AAEFM1122H1ZV',
     'Vikram Shah', '+91 98111 55555', 'sales@mumbaielec.example',
     '{"line1":"Shop 88, Lamington Road","line2":null,"city":"Mumbai","state":"Maharashtra","pin":"400025","country":"India"}'::jsonb,
     'Mumbai', 'Maharashtra', '400025', 'India', 300000, 30, 0, 'credit', 'Net 30', true),
    ('80000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Delhi Stationery Depot',      'SUP-0002', '07AABFD2233J1ZW',
     'Kavita Rao', '+91 98120 66666', 'orders@delhistationery.example',
     '{"line1":"145, Lajpat Rai Market","line2":null,"city":"New Delhi","state":"Delhi","pin":"110006","country":"India"}'::jsonb,
     'New Delhi', 'Delhi', '110006', 'India', 200000, 45, 0, 'credit', 'Net 45', true),
    ('80000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Ahmedabad Packaging Works',  'SUP-0003', '24AAGFA3344K1ZX',
     'Dhiraj Patel', '+91 98250 77777', 'export@ahmedabadpack.example',
     '{"line1":"Plot 31, Naroda Industrial Area","line2":null,"city":"Ahmedabad","state":"Gujarat","pin":"382330","country":"India"}'::jsonb,
     'Ahmedabad', 'Gujarat', '382330', 'India', 150000, 30, 0, 'credit', 'Net 30', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 8. TRANSACTIONS
--
-- GST is computed the same way the app does: intra-state splits into
-- CGST + SGST, inter-state is charged as IGST.
-- ============================================================
INSERT INTO transactions (
    id, company_id, type, document_number, document_date,
    customer_id, billing_address, shipping_address,
    subtotal, discount_amount, tax_amount, round_off, grand_total, amount_paid,
    status, notes, terms, gstin, salesperson, expected_delivery
) VALUES
    -- INV/2025-26/0001 : Mumbai customer -> intra-state (CGST + SGST)
    ('90000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'sale', 'INV/2025-26/0001', '2025-04-08',
     '70000000-0000-0000-0000-000000000001',
     '{"line1":"Unit 4, Sunrise Plaza","line2":null,"city":"Mumbai","state":"Maharashtra","pin":"400060","country":"India"}'::jsonb,
     '{"line1":"Unit 4, Sunrise Plaza","line2":null,"city":"Mumbai","state":"Maharashtra","pin":"400060","country":"India"}'::jsonb,
     2000.00, 0, 360.00, 0, 2360.00, 2360.00, 'paid',
     'Delivered in one lot.', 'Payment received in full.', '27AABCS1234D1ZP', 'Neha Kulkarni', '2025-04-15'),
    -- INV/2025-26/0002 : Bengaluru customer -> inter-state (IGST)
    ('90000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'sale', 'INV/2025-26/0002', '2025-04-12',
     '70000000-0000-0000-0000-000000000003',
     '{"line1":"No. 22, Brigade Road","line2":null,"city":"Bengaluru","state":"Karnataka","pin":"560001","country":"India"}'::jsonb,
     '{"line1":"No. 22, Brigade Road","line2":null,"city":"Bengaluru","state":"Karnataka","pin":"560001","country":"India"}'::jsonb,
     5200.00, 200.00, 900.00, 0, 5900.00, 3000.00, 'partial',
     'Split shipment; balance on second lot.', 'Balance due in 15 days.', '29AABCK9012F1ZR', 'Neha Kulkarni', '2025-04-26'),
    -- SALES RETURN
    ('90000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'sale', 'INV/2025-26/0003', '2025-04-18',
     '70000000-0000-0000-0000-000000000001',
     '{"line1":"Unit 4, Sunrise Plaza","line2":null,"city":"Mumbai","state":"Maharashtra","pin":"400060","country":"India"}'::jsonb,
     '{"line1":"Unit 4, Sunrise Plaza","line2":null,"city":"Mumbai","state":"Maharashtra","pin":"400060","country":"India"}'::jsonb,
     120.00, 0, 21.60, 0, 141.60, 0, 'confirmed',
     'Credit note for 2 damaged cables.', 'Credit note against INV/2025-26/0001.', '27AABCS1234D1ZP', 'Neha Kulkarni', NULL),
    -- PURCHASE
    ('90000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'purchase', 'PUR/2025-26/0001', '2025-04-05',
     NULL,
     '{"line1":"Shop 88, Lamington Road","line2":null,"city":"Mumbai","state":"Maharashtra","pin":"400025","country":"India"}'::jsonb,
     '{"line1":"Shop 88, Lamington Road","line2":null,"city":"Mumbai","state":"Maharashtra","pin":"400025","country":"India"}'::jsonb,
     15000.00, 0, 2700.00, 0, 17700.00, 17700.00, 'paid',
     'Monthly restock.', 'Net 30 from invoice date.', NULL, 'Vikram Shah', NULL),
    -- QUOTATION (Pune -> inter-state)
    ('90000000-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'quotation', 'QUO/2025-26/0001', '2025-04-20',
     '70000000-0000-0000-0000-000000000002',
     '{"line1":"3rd Floor, Sterling Centre","line2":null,"city":"Pune","state":"Maharashtra","pin":"411001","country":"India"}'::jsonb,
     '{"line1":"3rd Floor, Sterling Centre","line2":null,"city":"Pune","state":"Maharashtra","pin":"411001","country":"India"}'::jsonb,
     8420.00, 0, 1515.60, 0, 9935.60, 0, 'approved',
     'Submitted as part of the Q2 tender.', 'Quotation valid for 15 days.', '27AAECP5678E1ZQ', 'Neha Kulkarni', NULL),
    -- QUOTATION validity (used by the "Expired" badge on the list page)
    ('90000000-0000-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', 'quotation', 'QUO/2025-26/0002', '2025-03-01',
     '70000000-0000-0000-0000-000000000004',
     '{"line1":"Bungalow 7, Green Park","line2":null,"city":"Pune","state":"Maharashtra","pin":"411037","country":"India"}'::jsonb,
     '{"line1":"Bungalow 7, Green Park","line2":null,"city":"Pune","state":"Maharashtra","pin":"411037","country":"India"}'::jsonb,
     680.00, 0, 122.40, 0, 802.40, 0, 'draft',
     'Stationery for the new office.', 'Quotation valid for 15 days.', '27AADCS3456G1ZR', 'Neha Kulkarni', NULL),
    -- PURCHASE ORDER
    ('90000000-0000-0000-0000-000000000007', '11111111-1111-1111-1111-111111111111', 'purchase_order', 'PO/2025-26/0001', '2025-04-22',
     NULL,
     '{"line1":"Plot 31, Naroda Industrial Area","line2":null,"city":"Ahmedabad","state":"Gujarat","pin":"382330","country":"India"}'::jsonb,
     '{"line1":"Plot 31, Naroda Industrial Area","line2":null,"city":"Ahmedabad","state":"Gujarat","pin":"382330","country":"India"}'::jsonb,
     12600.00, 0, 2268.00, 0, 14868.00, 0, 'draft',
     'Packaging reorder for Q2.', 'Supply in two lots.', NULL, 'Dhiraj Patel', '2025-05-15'),
    -- PROFORMA INVOICE
    ('90000000-0000-0000-0000-000000000008', '11111111-1111-1111-1111-111111111111', 'proforma_invoice', 'PI/2025-26/0001', '2025-04-25',
     '70000000-0000-0000-0000-000000000003',
     '{"line1":"No. 22, Brigade Road","line2":null,"city":"Bengaluru","state":"Karnataka","pin":"560001","country":"India"}'::jsonb,
     '{"line1":"No. 22, Brigade Road","line2":null,"city":"Bengaluru","state":"Karnataka","pin":"560001","country":"India"}'::jsonb,
     9500.00, 0, 1710.00, 0, 11210.00, 0, 'approved',
     'Advance invoice for the confirmed order.', 'Advance 50% on delivery.', '29AABCK9012F1ZR', 'Neha Kulkarni', '2025-05-20')
ON CONFLICT (id) DO NOTHING;

-- QUO/2025-26/0002 needs an explicit expiry so the Expired badge shows.
UPDATE transactions
SET validity_date = DATE '2025-03-16'
WHERE id = '90000000-0000-0000-0000-000000000006'
  AND validity_date IS NULL;

UPDATE transactions
SET validity_date = DATE '2025-05-05'
WHERE id = '90000000-0000-0000-0000-000000000005'
  AND validity_date IS NULL;

-- ============================================================
-- 9. TRANSACTION ITEMS
-- ============================================================
-- transaction_items has no natural unique key, so ON CONFLICT cannot be
-- used here. Guard on the transaction_id to keep re-runs idempotent.
INSERT INTO transaction_items (
    transaction_id, product_id, product_name, product_code, brand_name,
    quantity, unit, rate, discount_percent, discount_amount,
    taxable_value, gst_rate, cgst_amount, sgst_amount, igst_amount,
    total_amount, sort_order, hsn_sac
)
SELECT v.*
FROM (VALUES
    -- INV/0001 : intra-state, 18% -> CGST 9% + SGST 9%
    ('90000000-0000-0000-0000-000000000001'::uuid, '60000000-0000-0000-0000-000000000001'::uuid, 'USB-C Charging Cable 1m',   'CAB-USB-C-1M', 'Generic',  10::numeric, 'NOS', 120.00, 0,   0.00,   1200.00, 18, 108.00, 108.00, 0.00, 1416.00, 0, '8544'),
    ('90000000-0000-0000-0000-000000000001'::uuid, '60000000-0000-0000-0000-000000000002'::uuid, '65W GaN Fast Charger',      'CHG-GAN-65W',  'Generic',   1::numeric, 'NOS', 800.00, 0,   0.00,    800.00, 18,  72.00,  72.00, 0.00,  944.00, 1, '8504'),
    -- INV/0002 : inter-state, 18% -> IGST 18%
    ('90000000-0000-0000-0000-000000000002'::uuid, '60000000-0000-0000-0000-000000000003'::uuid, 'Samsung 128GB microSD',     'MEM-SD-128',   'Samsung',   5::numeric, 'NOS', 1040.00, 0,  0.00,   5200.00, 18,  0.00,   0.00, 936.00, 6136.00, 0, '8523'),
    -- INV/0003 : return
    ('90000000-0000-0000-0000-000000000003'::uuid, '60000000-0000-0000-0000-000000000001'::uuid, 'USB-C Charging Cable 1m',   'CAB-USB-C-1M', 'Generic',   1::numeric, 'NOS', 120.00, 0,   0.00,    120.00, 18,  10.80,  10.80, 0.00,  141.60, 0, '8544'),
    -- PUR/0001 : inter-state supplier, purchase tax
    ('90000000-0000-0000-0000-000000000004'::uuid, '60000000-0000-0000-0000-000000000002'::uuid, '65W GaN Fast Charger',      'CHG-GAN-65W',  'Generic',  25::numeric, 'NOS', 540.00, 0,   0.00,  13500.00, 18,   0.00,   0.00, 2430.00, 15930.00, 0, '8504'),
    ('90000000-0000-0000-0000-000000000004'::uuid, '60000000-0000-0000-0000-000000000004'::uuid, 'D-Link CAT6 Patch Cable 3m','NET-CAT6-3M',  'D-Link',   10::numeric, 'NOS', 150.00, 0,   0.00,   1500.00, 18,   0.00,   0.00, 270.00,  1770.00, 1, '8544'),
    -- QUO/0001 : Pune -> inter-state
    ('90000000-0000-0000-0000-000000000005'::uuid, '60000000-0000-0000-0000-000000000006'::uuid, 'Gel Pen Box of 12',         'PEN-GEL-12',   'Generic',  20::numeric, 'BOX', 165.00, 0,   0.00,   3300.00, 18,   0.00,   0.00, 594.00,  3894.00, 0, '9608'),
    ('90000000-0000-0000-0000-000000000005'::uuid, '60000000-0000-0000-0000-000000000007'::uuid, 'Corrugated Box Medium',     'BOX-CRM-M',    'Generic', 160::numeric, 'NOS',  32.00, 0,   0.00,   5120.00, 18,   0.00,   0.00, 921.60,  6041.60, 1, '4819'),
    -- QUO/0002
    ('90000000-0000-0000-0000-000000000006'::uuid, '60000000-0000-0000-0000-000000000005'::uuid, 'A4 Copy Paper 500 sheets',  'PPR-A4-500',   'Generic',   2::numeric, 'NOS', 340.00, 0,   0.00,    680.00, 12,   40.80,  40.80, 0.00,   761.60, 0, '4802'),
    -- PO/0001 : inter-state supplier
    ('90000000-0000-0000-0000-000000000007'::uuid, '60000000-0000-0000-0000-000000000007'::uuid, 'Corrugated Box Medium',     'BOX-CRM-M',    'Generic', 500::numeric, 'NOS',  18.00, 0,   0.00,   9000.00, 18,   0.00,   0.00, 1620.00, 10620.00, 0, '4819'),
    ('90000000-0000-0000-0000-000000000008'::uuid, '60000000-0000-0000-0000-000000000007'::uuid, 'Corrugated Box Medium',     'BOX-CRM-M',    'Generic', 200::numeric, 'NOS',  18.00, 0,   0.00,   3600.00, 18,   0.00,   0.00, 648.00,  4248.00, 1, '4819'),
    -- PI/0001 : Bengaluru -> inter-state
    ('90000000-0000-0000-0000-000000000008'::uuid, '60000000-0000-0000-0000-000000000004'::uuid, 'D-Link CAT6 Patch Cable 3m','NET-CAT6-3M',  'D-Link',  50::numeric, 'NOS', 190.00, 0,   0.00,   9500.00, 18,   0.00,   0.00, 1710.00, 11210.00, 0, '8544')
) AS v (
    transaction_id, product_id, product_name, product_code, brand_name,
    quantity, unit, rate, discount_percent, discount_amount,
    taxable_value, gst_rate, cgst_amount, sgst_amount, igst_amount,
    total_amount, sort_order, hsn_sac
)
WHERE NOT EXISTS (
    SELECT 1 FROM transaction_items ti WHERE ti.transaction_id = v.transaction_id
);

-- ============================================================
-- 10. STOCK MOVEMENTS (opening balances, so the stock ledger is
--     not empty on first login)
-- ============================================================
INSERT INTO stock_movements (
    company_id, product_id, warehouse_id, type, reference_type, reference_id,
    quantity, balance_after, unit_cost, total_value, notes
)
SELECT
    '11111111-1111-1111-1111-111111111111',
    ps.product_id,
    ps.warehouse_id,
    'opening',
    'seed',
    NULL,
    ps.current_stock,
    ps.current_stock,
    ps.avg_cost,
    ps.current_stock * ps.avg_cost,
    'Opening stock from demo seed'
FROM product_stock ps
JOIN products p ON p.id = ps.product_id
WHERE p.company_id = '11111111-1111-1111-1111-111111111111'
  AND NOT EXISTS (
      SELECT 1 FROM stock_movements m
      WHERE m.product_id = ps.product_id
        AND m.warehouse_id = ps.warehouse_id
        AND m.type = 'opening'
  );

-- ============================================================
-- 11. PAYMENTS
-- ============================================================
INSERT INTO payments_received (id, company_id, customer_id, date, reference_number, mode, bank_name, amount, notes, transaction_id) VALUES
    ('a0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '70000000-0000-0000-0000-000000000001', '2025-04-09', 'NEFT/884512',  'bank',  'HDFC Bank', 2360.00, 'Full settlement', '90000000-0000-0000-0000-000000000001'),
    ('a0000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', '70000000-0000-0000-0000-000000000003', '2025-04-14', 'NEFT/885190',  'bank',  'ICICI Bank', 3000.00, 'Part payment',     '90000000-0000-0000-0000-000000000002')
ON CONFLICT (id) DO NOTHING;

INSERT INTO payments_made (id, company_id, supplier_id, date, reference_number, mode, bank_name, amount, notes, transaction_id) VALUES
    ('b0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '80000000-0000-0000-0000-000000000001', '2025-04-12', 'NEFT/771203', 'bank', 'HDFC Bank', 17700.00, 'Full settlement', '90000000-0000-0000-0000-000000000004')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 12. LEDGER ENTRIES
--     Balance is maintained by the recalculation triggers, so only
--     debit/credit are inserted here.
-- ============================================================
-- NOTE: customer_ledger / supplier_ledger have no company_id column.
-- Tenant scoping is done by the RLS policies in 002, which join through
-- customers.company_id / suppliers.company_id.
INSERT INTO customer_ledger (id, customer_id, date, reference_type, reference_id, description, debit, credit) VALUES
    -- Shreeji: INV-0001 (debit 2360), payment 2360 (credit) -> 0
    ('c0000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', '2025-04-08', 'transaction', '90000000-0000-0000-0000-000000000001', 'Sales invoice INV/2025-26/0001', 2360.00, 0),
    ('c0000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000001', '2025-04-09', 'payment',      'a0000000-0000-0000-0000-000000000001', 'Payment received NEFT/884512',    0, 2360.00),
    -- Karnataka Traders: INV-0002 (debit 5900), payment 3000 (credit) -> 2900 outstanding
    ('c0000000-0000-0000-0000-000000000003', '70000000-0000-0000-0000-000000000003', '2025-04-12', 'transaction', '90000000-0000-0000-0000-000000000002', 'Sales invoice INV/2025-26/0002', 5900.00, 0),
    ('c0000000-0000-0000-0000-000000000004', '70000000-0000-0000-0000-000000000003', '2025-04-14', 'payment',      'a0000000-0000-0000-0000-000000000002', 'Payment received NEFT/885190',    0, 3000.00)
ON CONFLICT (id) DO NOTHING;

INSERT INTO supplier_ledger (id, supplier_id, date, reference_type, reference_id, description, debit, credit) VALUES
    -- Mumbai Electronics: PUR-0001 (credit 17700), payment 17700 (debit) -> 0
    ('d0000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', '2025-04-05', 'transaction', '90000000-0000-0000-0000-000000000004', 'Purchase invoice PUR/2025-26/0001', 0, 17700.00),
    ('d0000000-0000-0000-0000-000000000002', '80000000-0000-0000-0000-000000000001', '2025-04-12', 'payment',      'b0000000-0000-0000-0000-000000000001', 'Payment made NEFT/771203',      17700.00, 0)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 13. COMPANY SETTINGS
--     Note: this table stores everything in JSONB columns.
-- ============================================================
INSERT INTO company_settings (company_id, document_prefixes, tax_settings, payment_settings, general_settings)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    '{"sale":"INV","purchase":"PUR","quotation":"QUO","proforma":"PI","purchase_order":"PO"}'::jsonb,
    '{"cgst_rate":9,"sgst_rate":9,"igst_rate":18,"tax_inclusive":false}'::jsonb,
    '{"default_credit_period":30,"default_credit_limit":0,"late_fee_percent":18}'::jsonb,
    jsonb_build_object(
        'currency', 'INR',
        'currency_symbol', U&'\20B9',
        'date_format', 'DD/MM/YYYY',
        'fiscal_year_start', '04-01',
        'terms_and_conditions', 'Goods once sold will not be taken back. Interest @18% p.a. applies on overdue payments.'
    )
)
ON CONFLICT (company_id) DO NOTHING;

COMMIT;

-- ============================================================
-- EXPECTED RESULT (sanity check)
--
--   customers  4   suppliers  3   products  8   warehouses  1
--   transactions 8   transaction_items 12
--   payments_received 2   payments_made 1
--   Customer balances : Shreeji 0.00 | Karnataka Traders 2900.00
--   Supplier balances : Mumbai Electronics 0.00
--
-- To wipe the demo data:
--   DELETE FROM companies WHERE id = '11111111-1111-1111-1111-111111111111';
-- (cascades to every child table)
-- ============================================================
