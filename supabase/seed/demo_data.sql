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
-- To reset everything:  see the bottom of this file.
--
-- Demo company is in Odisha (GST state code 21), so:
--   - parties in Odisha        -> CGST + SGST  (intra-state)
--   - parties outside Odisha   -> IGST         (inter-state)
-- Both paths are represented below so GST reports can be checked.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. COMPANY
-- ============================================================
INSERT INTO companies (id, name, gstin, pan, state, state_code, address, city, pin, country, phone, email, website)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    'BSP Traders',
    '21AABCB1234C1Z5',
    'AABCB1234C',
    'Odisha',
    '21',
    'Plot 42, Nayapalli',
    'Bhubaneswar',
    '751012',
    'India',
    '+91 97774 00001',
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
    'Plot 42, Nayapalli, Bhubaneswar, Odisha 751012',
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
--    Two products sit below their reorder thresholds so the low-stock
--    and reorder alerts have something to show.
-- ============================================================
INSERT INTO product_stock (product_id, warehouse_id, current_stock, avg_cost, last_updated) VALUES
    ('60000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 180,  65.00, now()),
    ('60000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000001',  28, 540.00, now()),
    ('60000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000001',   9, 620.00, now()),  -- below reorder level (40)
    ('60000000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-000000000001',  95, 150.00, now()),
    ('60000000-0000-0000-0000-000000000005', '50000000-0000-0000-0000-000000000001',  72, 210.00, now()),
    ('60000000-0000-0000-0000-000000000006', '50000000-0000-0000-0000-000000000001', 140,  90.00, now()),
    ('60000000-0000-0000-0000-000000000007', '50000000-0000-0000-0000-000000000001', 340,  18.00, now()),
    ('60000000-0000-0000-0000-000000000008', '50000000-0000-0000-0000-000000000001',  45,  32.00, now())   -- below low stock level (80)
ON CONFLICT (product_id, warehouse_id) DO NOTHING;

-- ============================================================
-- 6. CUSTOMERS
--    Bhubaneswar / Cuttack = intra-state (Odisha)
--    Kolkata                = inter-state (West Bengal)
-- ============================================================
INSERT INTO customers (
    id, company_id, name, code, gstin, contact_person, phone, email,
    billing_address, shipping_address, city, state, pin, country,
    credit_limit, credit_period, opening_balance, opening_balance_type, is_active
) VALUES
    ('70000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Shreeji Retail Pvt Ltd', 'CUS-0001', '21AABCS1234D1ZP',
     'Rajesh Mahapatra', '+91 97774 11111', 'purchase@shreeji.example',
     '{"line1":"Unit 4, Sunrise Plaza","line2":null,"city":"Bhubaneswar","state":"Odisha","pin":"751012","country":"India"}'::jsonb,
     '{"line1":"Unit 4, Sunrise Plaza","line2":null,"city":"Bhubaneswar","state":"Odisha","pin":"751012","country":"India"}'::jsonb,
     'Bhubaneswar', 'Odisha', '751012', 'India', 250000, 30, 0, 'debit', true),
    ('70000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Puri Tech Solutions',  'CUS-0002', '21AAECP5678E1ZQ',
     'Anita Nayak', '+91 97774 22222', 'accounts@puritech.example',
     '{"line1":"3rd Floor, Sterling Centre","line2":null,"city":"Puri","state":"Odisha","pin":"752001","country":"India"}'::jsonb,
     '{"line1":"3rd Floor, Sterling Centre","line2":null,"city":"Puri","state":"Odisha","pin":"752001","country":"India"}'::jsonb,
     'Puri', 'Odisha', '752001', 'India', 150000, 45, 0, 'debit', true),
    ('70000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Kolkata Traders',     'CUS-0003', '19AABCK9012F1ZR',
     'Suresh Das', '+91 98310 33333', 'sales@kolkatatraders.example',
     '{"line1":"No. 22, Park Street","line2":null,"city":"Kolkata","state":"West Bengal","pin":"700016","country":"India"}'::jsonb,
     '{"line1":"No. 22, Park Street","line2":null,"city":"Kolkata","state":"West Bengal","pin":"700016","country":"India"}'::jsonb,
     'Kolkata', 'West Bengal', '700016', 'India', 100000, 30, 0, 'debit', true),
    ('70000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'Sunrise Office Supplies','CUS-0004', '21AADCS3456G1ZR',
     'Neha Kar', '+91 97774 44444', 'neha@sunriseoffice.example',
     '{"line1":"Bungalow 7, Green Park","line2":null,"city":"Cuttack","state":"Odisha","pin":"753001","country":"India"}'::jsonb,
     '{"line1":"Bungalow 7, Green Park","line2":null,"city":"Cuttack","state":"Odisha","pin":"753001","country":"India"}'::jsonb,
     'Cuttack', 'Odisha', '753001', 'India', 40000, 15, 0, 'debit', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 7. SUPPLIERS
--    Bhubaneswar = intra-state (Odisha)
--    Mumbai / Delhi = inter-state
-- ============================================================
INSERT INTO suppliers (
    id, company_id, name, code, gstin, contact_person, phone, email,
    billing_address, city, state, pin, country,
    credit_limit, credit_period, opening_balance, opening_balance_type, payment_terms, is_active
) VALUES
    ('80000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Bhubaneswar Electronics',   'SUP-0001', '21AAEFM1122H1ZV',
     'Vikram Sahu', '+91 97774 55555', 'sales@bbsrelec.example',
     '{"line1":"Shop 88, Machhua Bazaar","line2":null,"city":"Bhubaneswar","state":"Odisha","pin":"751001","country":"India"}'::jsonb,
     'Bhubaneswar', 'Odisha', '751001', 'India', 300000, 30, 0, 'credit', 'Net 30', true),
    ('80000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Mumbai Stationery Depot',  'SUP-0002', '27AABFD2233J1ZW',
     'Kavita Rao', '+91 98200 66666', 'orders@mundhistationery.example',
     '{"line1":"145, Lajpat Rai Market","line2":null,"city":"Mumbai","state":"Maharashtra","pin":"400006","country":"India"}'::jsonb,
     'Mumbai', 'Maharashtra', '400006', 'India', 200000, 45, 0, 'credit', 'Net 45', true),
    ('80000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Kolkata Packaging Works',  'SUP-0003', '19AAGFA3344K1ZX',
     'Dhiraj Ghosh', '+91 98310 77777', 'export@kolkatapack.example',
     '{"line1":"Plot 31, Belghoria Industrial Area","line2":null,"city":"Kolkata","state":"West Bengal","pin":"700056","country":"India"}'::jsonb,
     'Kolkata', 'West Bengal', '700056', 'India', 150000, 30, 0, 'credit', 'Net 30', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 8. TRANSACTIONS
--
-- GST arithmetic below is exactly what the app computes:
--   intra-state  -> cgst = sgst = taxable * rate / 2
--   inter-state  -> igst = taxable * rate
-- Header totals always equal the sum of their line items.
-- ============================================================
INSERT INTO transactions (
    id, company_id, type, document_number, document_date,
    customer_id, billing_address, shipping_address,
    subtotal, discount_amount, tax_amount, round_off, grand_total, amount_paid,
    status, notes, terms, gstin, salesperson, expected_delivery
) VALUES
    -- INV-0001 : Bhubaneswar customer -> intra-state (CGST 108 + SGST 108 + 72 + 72 = 360)
    ('90000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'sale', 'INV/2026-27/0001', '2026-08-08',
     '70000000-0000-0000-0000-000000000001',
     '{"line1":"Unit 4, Sunrise Plaza","line2":null,"city":"Bhubaneswar","state":"Odisha","pin":"751012","country":"India"}'::jsonb,
     '{"line1":"Unit 4, Sunrise Plaza","line2":null,"city":"Bhubaneswar","state":"Odisha","pin":"751012","country":"India"}'::jsonb,
     2000.00, 0, 360.00, 0, 2360.00, 2360.00, 'paid',
     'Delivered in one lot.', 'Payment received in full.', '21AABCS1234D1ZP', 'Neha Kar', '2026-08-15'),
    -- INV-0002 : Kolkata customer -> inter-state (IGST 900 on 5000 taxable)
    ('90000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'sale', 'INV/2026-27/0002', '2026-08-12',
     '70000000-0000-0000-0000-000000000003',
     '{"line1":"No. 22, Park Street","line2":null,"city":"Kolkata","state":"West Bengal","pin":"700016","country":"India"}'::jsonb,
     '{"line1":"No. 22, Park Street","line2":null,"city":"Kolkata","state":"West Bengal","pin":"700016","country":"India"}'::jsonb,
     5200.00, 200.00, 900.00, 0, 5900.00, 3000.00, 'partial',
     'Split shipment; balance on second lot.', 'Balance due in 15 days.', '19AABCK9012F1ZR', 'Neha Kar', '2026-08-26'),
    -- INV-0003 : sales return to Bhubaneswar customer -> intra-state
    ('90000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'sale', 'INV/2026-27/0003', '2026-08-18',
     '70000000-0000-0000-0000-000000000001',
     '{"line1":"Unit 4, Sunrise Plaza","line2":null,"city":"Bhubaneswar","state":"Odisha","pin":"751012","country":"India"}'::jsonb,
     '{"line1":"Unit 4, Sunrise Plaza","line2":null,"city":"Bhubaneswar","state":"Odisha","pin":"751012","country":"India"}'::jsonb,
     120.00, 0, 21.60, 0, 141.60, 0, 'confirmed',
     'Credit note for 2 damaged cables.', 'Credit note against INV/2026-27/0001.', '21AABCS1234D1ZP', 'Neha Kar', NULL),
    -- PUR-0001 : Bhubaneswar supplier -> intra-state purchase
    ('90000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'purchase', 'PUR/2026-27/0001', '2026-08-05',
     NULL,
     '{"line1":"Shop 88, Machhua Bazaar","line2":null,"city":"Bhubaneswar","state":"Odisha","pin":"751001","country":"India"}'::jsonb,
     '{"line1":"Shop 88, Machhua Bazaar","line2":null,"city":"Bhubaneswar","state":"Odisha","pin":"751001","country":"India"}'::jsonb,
     15000.00, 0, 2700.00, 0, 17700.00, 17700.00, 'paid',
     'Monthly restock.', 'Net 30 from invoice date.', NULL, 'Vikram Sahu', NULL),
    -- QUO-0001 : Puri customer -> intra-state, still valid
    ('90000000-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'quotation', 'QUO/2026-27/0001', '2026-08-20',
     '70000000-0000-0000-0000-000000000002',
     '{"line1":"3rd Floor, Sterling Centre","line2":null,"city":"Puri","state":"Odisha","pin":"752001","country":"India"}'::jsonb,
     '{"line1":"3rd Floor, Sterling Centre","line2":null,"city":"Puri","state":"Odisha","pin":"752001","country":"India"}'::jsonb,
     8420.00, 0, 1515.60, 0, 9935.60, 0, 'approved',
     'Submitted as part of the Q2 tender.', 'Quotation valid for 15 days.', '21AAECP5678E1ZQ', 'Neha Kar', NULL),
    -- QUO-0002 : validity already lapsed, so the list page shows Expired
    ('90000000-0000-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', 'quotation', 'QUO/2026-27/0002', '2026-07-01',
     '70000000-0000-0000-0000-000000000004',
     '{"line1":"Bungalow 7, Green Park","line2":null,"city":"Cuttack","state":"Odisha","pin":"753001","country":"India"}'::jsonb,
     '{"line1":"Bungalow 7, Green Park","line2":null,"city":"Cuttack","state":"Odisha","pin":"753001","country":"India"}'::jsonb,
     680.00, 0, 81.60, 0, 761.60, 0, 'draft',
     'Stationery for the new office.', 'Quotation valid for 15 days.', '21AADCS3456G1ZR', 'Neha Kar', NULL),
    -- PO-0001 : Kolkata supplier -> inter-state
    ('90000000-0000-0000-0000-000000000007', '11111111-1111-1111-1111-111111111111', 'purchase_order', 'PO/2026-27/0001', '2026-08-22',
     NULL,
     '{"line1":"Plot 31, Belghoria Industrial Area","line2":null,"city":"Kolkata","state":"West Bengal","pin":"700056","country":"India"}'::jsonb,
     '{"line1":"Plot 31, Belghoria Industrial Area","line2":null,"city":"Kolkata","state":"West Bengal","pin":"700056","country":"India"}'::jsonb,
     9000.00, 0, 1620.00, 0, 10620.00, 0, 'draft',
     'Packaging reorder for Q3.', 'Supply in two lots.', NULL, 'Dhiraj Ghosh', '2026-09-15'),
    -- PI-0001 : Kolkata customer -> inter-state
    ('90000000-0000-0000-0000-000000000008', '11111111-1111-1111-1111-111111111111', 'proforma_invoice', 'PI/2026-27/0001', '2026-08-25',
     '70000000-0000-0000-0000-000000000003',
     '{"line1":"No. 22, Park Street","line2":null,"city":"Kolkata","state":"West Bengal","pin":"700016","country":"India"}'::jsonb,
     '{"line1":"No. 22, Park Street","line2":null,"city":"Kolkata","state":"West Bengal","pin":"700016","country":"India"}'::jsonb,
     9500.00, 0, 1710.00, 0, 11210.00, 0, 'approved',
     'Advance invoice for the confirmed order.', 'Advance 50% on delivery.', '19AABCK9012F1ZR', 'Neha Kar', '2026-09-20')
ON CONFLICT (id) DO NOTHING;

-- QUO-0001 is still inside its 15-day window; QUO-0002 has lapsed.
UPDATE transactions
SET validity_date = DATE '2026-09-04'
WHERE id = '90000000-0000-0000-0000-000000000005'
  AND validity_date IS NULL;

UPDATE transactions
SET validity_date = DATE '2026-07-16'
WHERE id = '90000000-0000-0000-0000-000000000006'
  AND validity_date IS NULL;

-- ============================================================
-- 9. TRANSACTION ITEMS
--
-- INV-0002 carries the 200.00 header discount on its single line, so
-- line taxable (5000) + header subtotal (5200) - discount (200) agree.
-- PO-0001 has one line of 9000; its header was previously wrong.
--
-- transaction_items has no natural unique key, so ON CONFLICT cannot be
-- used here. Guard on the transaction_id to keep re-runs idempotent.
-- ============================================================
INSERT INTO transaction_items (
    transaction_id, product_id, product_name, product_code, brand_name,
    quantity, unit, rate, discount_percent, discount_amount,
    taxable_value, gst_rate, cgst_amount, sgst_amount, igst_amount,
    total_amount, sort_order, hsn_sac
)
SELECT v.*
FROM (VALUES
    -- INV-0001 intra-state 18%: 1200 -> 108 + 108, 800 -> 72 + 72
    ('90000000-0000-0000-0000-000000000001'::uuid, '60000000-0000-0000-0000-000000000001'::uuid, 'USB-C Charging Cable 1m',   'CAB-USB-C-1M', 'Generic',  10::numeric, 'NOS', 120.00, 0,   0.00,   1200.00, 18, 108.00, 108.00, 0.00, 1416.00, 0, '8544'),
    ('90000000-0000-0000-0000-000000000001'::uuid, '60000000-0000-0000-0000-000000000002'::uuid, '65W GaN Fast Charger',      'CHG-GAN-65W',  'Generic',   1::numeric, 'NOS', 800.00, 0,   0.00,    800.00, 18,  72.00,  72.00, 0.00,  944.00, 1, '8504'),
    -- INV-0002 inter-state 18%: 5200 - 200 discount = 5000 -> IGST 900
    ('90000000-0000-0000-0000-000000000002'::uuid, '60000000-0000-0000-0000-000000000003'::uuid, 'Samsung 128GB microSD',     'MEM-SD-128',   'Samsung',   5::numeric, 'NOS', 1040.00, 0, 200.00,  5000.00, 18,  0.00,   0.00, 900.00, 5900.00, 0, '8523'),
    -- INV-0003 intra-state 18% return: 120 -> 10.80 + 10.80
    ('90000000-0000-0000-0000-000000000003'::uuid, '60000000-0000-0000-0000-000000000001'::uuid, 'USB-C Charging Cable 1m',   'CAB-USB-C-1M', 'Generic',   1::numeric, 'NOS', 120.00, 0,   0.00,    120.00, 18,  10.80,  10.80, 0.00,  141.60, 0, '8544'),
    -- PUR-0001 intra-state 18%: 13500 -> 1215 + 1215, 1500 -> 135 + 135
    ('90000000-0000-0000-0000-000000000004'::uuid, '60000000-0000-0000-0000-000000000002'::uuid, '65W GaN Fast Charger',      'CHG-GAN-65W',  'Generic',  25::numeric, 'NOS', 540.00, 0,   0.00,  13500.00, 18, 1215.00, 1215.00, 0.00, 15930.00, 0, '8504'),
    ('90000000-0000-0000-0000-000000000004'::uuid, '60000000-0000-0000-0000-000000000004'::uuid, 'D-Link CAT6 Patch Cable 3m','NET-CAT6-3M',  'D-Link',   10::numeric, 'NOS', 150.00, 0,   0.00,   1500.00, 18,  135.00,  135.00, 0.00,  1770.00, 1, '8544'),
    -- QUO-0001 intra-state 18%: 3300 -> 297 + 297, 5120 -> 460.80 + 460.80
    ('90000000-0000-0000-0000-000000000005'::uuid, '60000000-0000-0000-0000-000000000006'::uuid, 'Gel Pen Box of 12',         'PEN-GEL-12',   'Generic',  20::numeric, 'BOX', 165.00, 0,   0.00,   3300.00, 18,  297.00,  297.00, 0.00,  3894.00, 0, '9608'),
    ('90000000-0000-0000-0000-000000000005'::uuid, '60000000-0000-0000-0000-000000000007'::uuid, 'Corrugated Box Medium',     'BOX-CRM-M',    'Generic', 160::numeric, 'NOS',  32.00, 0,   0.00,   5120.00, 18,  460.80,  460.80, 0.00,  6041.60, 1, '4819'),
    -- QUO-0002 intra-state 12%: 680 -> 40.80 + 40.80 = 81.60
    ('90000000-0000-0000-0000-000000000006'::uuid, '60000000-0000-0000-0000-000000000005'::uuid, 'A4 Copy Paper 500 sheets',  'PPR-A4-500',   'Generic',   2::numeric, 'NOS', 340.00, 0,   0.00,    680.00, 12,   40.80,   40.80, 0.00,   761.60, 0, '4802'),
    -- PO-0001 inter-state 18%: 9000 -> IGST 1620
    ('90000000-0000-0000-0000-000000000007'::uuid, '60000000-0000-0000-0000-000000000007'::uuid, 'Corrugated Box Medium',     'BOX-CRM-M',    'Generic', 500::numeric, 'NOS',  18.00, 0,   0.00,   9000.00, 18,   0.00,    0.00, 1620.00, 10620.00, 0, '4819'),
    -- PI-0001 inter-state 18%: 9500 -> IGST 1710
    ('90000000-0000-0000-0000-000000000008'::uuid, '60000000-0000-0000-0000-000000000004'::uuid, 'D-Link CAT6 Patch Cable 3m','NET-CAT6-3M',  'D-Link',  50::numeric, 'NOS', 190.00, 0,   0.00,   9500.00, 18,   0.00,    0.00, 1710.00, 11210.00, 0, '8544')
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
    ('a0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '70000000-0000-0000-0000-000000000001', '2026-08-09', 'NEFT/884512',  'bank',  'SBI Bhubaneswar', 2360.00, 'Full settlement', '90000000-0000-0000-0000-000000000001'),
    ('a0000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', '70000000-0000-0000-0000-000000000003', '2026-08-14', 'NEFT/885190',  'bank',  'HDFC Kolkata',    3000.00, 'Part payment',     '90000000-0000-0000-0000-000000000002')
ON CONFLICT (id) DO NOTHING;

INSERT INTO payments_made (id, company_id, supplier_id, date, reference_number, mode, bank_name, amount, notes, transaction_id) VALUES
    ('b0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '80000000-0000-0000-0000-000000000001', '2026-08-12', 'NEFT/771203', 'bank', 'SBI Bhubaneswar', 17700.00, 'Full settlement', '90000000-0000-0000-0000-000000000004')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 12. LEDGER ENTRIES
--     customer_ledger / supplier_ledger have no company_id column;
--     tenant scoping is done by the RLS policies in 002, which join
--     through customers.company_id / suppliers.company_id.
--     The `balance` column is left at 0 on insert; the recalculation
--     triggers in 003 fill it in.
-- ============================================================
INSERT INTO customer_ledger (id, customer_id, date, reference_type, reference_id, description, debit, credit) VALUES
    -- Shreeji (Bhubaneswar): INV-0001 debit 2360, payment credit 2360 -> 0
    ('c0000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', '2026-08-08', 'transaction', '90000000-0000-0000-0000-000000000001', 'Sales invoice INV/2026-27/0001', 2360.00, 0),
    ('c0000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000001', '2026-08-09', 'payment',      'a0000000-0000-0000-0000-000000000001', 'Payment received NEFT/884512',    0, 2360.00),
    -- Kolkata Traders: INV-0002 debit 5900, payment credit 3000 -> 2900 outstanding
    ('c0000000-0000-0000-0000-000000000003', '70000000-0000-0000-0000-000000000003', '2026-08-12', 'transaction', '90000000-0000-0000-0000-000000000002', 'Sales invoice INV/2026-27/0002', 5900.00, 0),
    ('c0000000-0000-0000-0000-000000000004', '70000000-0000-0000-0000-000000000003', '2026-08-14', 'payment',      'a0000000-0000-0000-0000-000000000002', 'Payment received NEFT/885190',    0, 3000.00)
ON CONFLICT (id) DO NOTHING;

INSERT INTO supplier_ledger (id, supplier_id, date, reference_type, reference_id, description, debit, credit) VALUES
    -- Bhubaneswar Electronics: PUR-0001 credit 17700, payment debit 17700 -> 0
    ('d0000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', '2026-08-05', 'transaction', '90000000-0000-0000-0000-000000000004', 'Purchase invoice PUR/2026-27/0001', 0, 17700.00),
    ('d0000000-0000-0000-0000-000000000002', '80000000-0000-0000-0000-000000000001', '2026-08-12', 'payment',      'b0000000-0000-0000-0000-000000000001', 'Payment made NEFT/771203',      17700.00, 0)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 13. COMPANY SETTINGS
--     This table stores everything in JSONB columns.
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
        'state', 'Odisha',
        'state_code', '21',
        'terms_and_conditions', 'Goods once sold will not be taken back. Interest @18% p.a. applies on overdue payments.'
    )
)
ON CONFLICT (company_id) DO NOTHING;

COMMIT;

-- ============================================================
-- EXPECTED RESULT (sanity check)
--
--   companies 1   warehouses 1   units 5   categories 4   brands 4
--   products 8    customers 4    suppliers 3
--   transactions 8   transaction_items 11
--   payments_received 2   payments_made 1
--   customer_ledger 4   supplier_ledger 2   stock_movements 8
--
-- GST, company in Odisha (21):
--   intra-state  (CGST = SGST)  INV-0001 2360  PUR-0001 17700
--                                QUO-0001 9935.60  QUO-0002 761.60
--   inter-state  (IGST)         INV-0002 5900  PO-0001 10620.00
--                                PI-0001 11210.00
--   Every line's CGST+SGST+IGST must equal its own taxable * rate,
--   and each header total must equal the sum of its lines.
--
-- Balances after the trigger recalculation:
--   Shreeji Retail (CUS-0001)        0.00
--   Kolkata Traders  (CUS-0003)   2900.00   (5900 invoice - 3000 paid)
--   Bhubaneswar Electronics (SUP-0001)  0.00
--
-- To wipe the demo data:
--   DELETE FROM companies WHERE id = '11111111-1111-1111-1111-111111111111';
-- (cascades to every child table)
-- ============================================================
