# Database Schema Documentation

## Overview

BSP Inventory uses PostgreSQL (via Supabase) with a multi-tenant architecture. Every table includes `company_id` for tenant isolation, enforced by Row Level Security (RLS) policies.

## Entity Relationship Diagram

```
┌──────────────┐
│  companies   │
└──────┬───────┘
       │ 1
       │
       │ N
┌──────▼───────┬────────────────┬────────────────┐
│  profiles    │   products     │   customers    │
│  warehouses  │   categories   │   suppliers    │
│  brands      │   units        │   transactions │
└──────────────┴────────────────┴────────────────┘
```

## Core Tables

### companies

Master table for multi-tenant architecture.

```sql
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT,
  tagline TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  state_code TEXT,
  pin TEXT,
  country TEXT DEFAULT 'India',
  phone TEXT,
  email TEXT,
  website TEXT,
  gstin TEXT,
  pan TEXT,
  cin TEXT,
  bank_name TEXT,
  bank_account_name TEXT,
  bank_account_number TEXT,
  bank_ifsc TEXT,
  bank_branch TEXT,
  bank_upi TEXT,
  financial_year_start INT DEFAULT 4, -- April
  currency TEXT DEFAULT 'INR',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### profiles

User profiles extending Supabase auth.users.

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  role TEXT DEFAULT 'user', -- super_admin, admin, manager, accountant, user, viewer
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**RLS Policies**:
- Users can view their own profile
- Admins can view all profiles in their company
- Only super_admin can update roles

### products

Product catalog.

```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL, -- SKU
  category_id UUID REFERENCES categories(id),
  brand_id UUID REFERENCES brands(id),
  unit_id UUID REFERENCES units(id),
  description TEXT,
  color TEXT,
  size TEXT,
  hsn_sac TEXT, -- HSN/SAC code for GST
  gst_rate DECIMAL(5,2) DEFAULT 18.00,
  purchase_price DECIMAL(15,2) DEFAULT 0,
  selling_price DECIMAL(15,2) DEFAULT 0,
  mrp DECIMAL(15,2),
  low_stock_level INT DEFAULT 10,
  reorder_level INT DEFAULT 5,
  barcode TEXT,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, code)
);

CREATE INDEX idx_products_company_id ON products(company_id);
CREATE INDEX idx_products_code ON products(code);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_brand_id ON products(brand_id);
```

### categories

Hierarchical product categories (tree structure).

```sql
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES categories(id),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_categories_parent_id ON categories(parent_id);
```

### brands

Product brands.

```sql
CREATE TABLE brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, name)
);
```

### units

Units of measurement.

```sql
CREATE TABLE units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g., "Pieces"
  short_name TEXT NOT NULL, -- e.g., "PCS"
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, short_name)
);
```

### customers

Customer master data.

```sql
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  gstin TEXT,
  pan TEXT,
  contact_person TEXT,
  phone TEXT,
  alt_phone TEXT,
  email TEXT,
  billing_address JSONB, -- {line1, line2, city, state, pin, country}
  shipping_address JSONB,
  city TEXT,
  state TEXT,
  pin TEXT,
  country TEXT DEFAULT 'India',
  credit_limit DECIMAL(15,2) DEFAULT 0,
  credit_period INT DEFAULT 0, -- days
  opening_balance DECIMAL(15,2) DEFAULT 0,
  opening_balance_type TEXT DEFAULT 'debit', -- debit or credit
  current_balance DECIMAL(15,2) DEFAULT 0,
  bank_details JSONB,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_customers_company_id ON customers(company_id);
CREATE INDEX idx_customers_gstin ON customers(gstin);
```

### suppliers

Supplier master data (same structure as customers).

```sql
CREATE TABLE suppliers (
  -- Same columns as customers
  ...
);
```

### transactions

Universal transaction table (sales, purchases, quotations, POs, PIs).

```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- sale, purchase, quotation, purchase_order, proforma_invoice
  document_number TEXT NOT NULL,
  document_date DATE NOT NULL,
  reference_number TEXT,
  reference_date DATE,
  customer_id UUID REFERENCES customers(id),
  supplier_id UUID REFERENCES suppliers(id),
  billing_address JSONB,
  shipping_address JSONB,
  subtotal DECIMAL(15,2) DEFAULT 0,
  discount_amount DECIMAL(15,2) DEFAULT 0,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  round_off DECIMAL(15,2) DEFAULT 0,
  grand_total DECIMAL(15,2) DEFAULT 0,
  amount_paid DECIMAL(15,2) DEFAULT 0,
  status TEXT DEFAULT 'draft', -- draft, confirmed, paid, partial, cancelled, approved
  notes TEXT,
  terms TEXT,
  gstin TEXT, -- Customer/Supplier GSTIN snapshot
  validity_date DATE, -- For quotations
  expected_delivery DATE, -- For POs
  salesperson TEXT,
  created_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, document_number)
);

CREATE INDEX idx_transactions_company_id ON transactions(company_id);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_document_date ON transactions(document_date);
CREATE INDEX idx_transactions_customer_id ON transactions(customer_id);
CREATE INDEX idx_transactions_supplier_id ON transactions(supplier_id);
CREATE INDEX idx_transactions_status ON transactions(status);
```

### transaction_items

Line items for transactions.

```sql
CREATE TABLE transaction_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  product_name TEXT NOT NULL,
  product_code TEXT,
  brand_name TEXT,
  description TEXT,
  hsn_sac TEXT,
  quantity DECIMAL(15,3) NOT NULL,
  unit TEXT,
  rate DECIMAL(15,2) NOT NULL,
  discount_percent DECIMAL(5,2) DEFAULT 0,
  discount_amount DECIMAL(15,2) DEFAULT 0,
  taxable_value DECIMAL(15,2) NOT NULL,
  gst_rate DECIMAL(5,2) DEFAULT 18.00,
  cgst_amount DECIMAL(15,2) DEFAULT 0,
  sgst_amount DECIMAL(15,2) DEFAULT 0,
  igst_amount DECIMAL(15,2) DEFAULT 0,
  total_amount DECIMAL(15,2) NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_transaction_items_transaction_id ON transaction_items(transaction_id);
CREATE INDEX idx_transaction_items_product_id ON transaction_items(product_id);
```

### stock

Current stock balances per product.

```sql
CREATE TABLE stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  quantity DECIMAL(15,3) DEFAULT 0,
  reserved_quantity DECIMAL(15,3) DEFAULT 0, -- For sales orders
  available_quantity DECIMAL(15,3) GENERATED ALWAYS AS (quantity - reserved_quantity) STORED,
  last_purchase_date DATE,
  last_sale_date DATE,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, product_id, warehouse_id)
);

CREATE INDEX idx_stock_product_id ON stock(product_id);
CREATE INDEX idx_stock_warehouse_id ON stock(warehouse_id);
```

### stock_movements

Audit trail of all stock changes.

```sql
CREATE TABLE stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  warehouse_id UUID NOT NULL REFERENCES warehouses(id),
  transaction_id UUID REFERENCES transactions(id),
  type TEXT NOT NULL, -- purchase, sale, adjustment, transfer, return, opening
  quantity DECIMAL(15,3) NOT NULL, -- positive for in, negative for out
  balance_after DECIMAL(15,3) NOT NULL,
  reference_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_stock_movements_product_id ON stock_movements(product_id);
CREATE INDEX idx_stock_movements_transaction_id ON stock_movements(transaction_id);
CREATE INDEX idx_stock_movements_created_at ON stock_movements(created_at DESC);
```

### warehouses

Warehouse/location master.

```sql
CREATE TABLE warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  pin TEXT,
  phone TEXT,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, code)
);
```

### payments

Payment records.

```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- received, made
  payment_number TEXT NOT NULL,
  payment_date DATE NOT NULL,
  customer_id UUID REFERENCES customers(id),
  supplier_id UUID REFERENCES suppliers(id),
  amount DECIMAL(15,2) NOT NULL,
  payment_mode TEXT NOT NULL, -- cash, cheque, bank_transfer, upi, card
  reference_number TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, payment_number)
);

CREATE INDEX idx_payments_customer_id ON payments(customer_id);
CREATE INDEX idx_payments_supplier_id ON payments(supplier_id);
CREATE INDEX idx_payments_payment_date ON payments(payment_date);
```

### payment_allocations

Link payments to invoices.

```sql
CREATE TABLE payment_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  amount DECIMAL(15,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_payment_allocations_payment_id ON payment_allocations(payment_id);
CREATE INDEX idx_payment_allocations_transaction_id ON payment_allocations(transaction_id);
```

## Security Tables

### roles

Role definitions.

```sql
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE, -- super_admin, admin, manager, accountant, user, viewer
  description TEXT,
  level INT NOT NULL DEFAULT 0, -- Higher = more access
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### permissions

Permission definitions.

```sql
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module TEXT NOT NULL, -- products, customers, transactions, etc.
  action TEXT NOT NULL, -- read, write, delete, approve, export, import
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(module, action)
);
```

### role_permissions

Role-permission mappings.

```sql
CREATE TABLE role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(role_id, permission_id)
);
```

### user_roles

User-role assignments.

```sql
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, role_id, company_id)
);
```

### company_settings

Company-specific settings and configurations.

```sql
CREATE TABLE company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE UNIQUE,
  document_settings JSONB,
  tax_settings JSONB,
  payment_settings JSONB,
  bank_accounts JSONB, -- Array of bank accounts
  general_settings JSONB,
  theme_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

## Database Functions

### get_current_company_id()

Returns the company_id for the current user.

```sql
CREATE OR REPLACE FUNCTION get_current_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL STABLE SECURITY DEFINER;
```

### has_permission(p_permission TEXT)

Checks if current user has a specific permission.

```sql
CREATE OR REPLACE FUNCTION has_permission(p_permission TEXT)
RETURNS BOOLEAN AS $$
  -- Implementation checks user's role permissions
$$ LANGUAGE SQL STABLE SECURITY DEFINER;
```

### next_document_number(p_company_id UUID, p_type TEXT)

Allocates the next document number with advisory locking.

```sql
CREATE OR REPLACE FUNCTION next_document_number(
  p_company_id UUID,
  p_type TEXT
)
RETURNS TEXT AS $$
DECLARE
  v_last_number INT;
  v_prefix TEXT;
  v_fy TEXT;
  v_new_number TEXT;
BEGIN
  -- Advisory lock to prevent race conditions
  PERFORM pg_advisory_xact_lock(hashtext(p_company_id::text || p_type));
  
  -- Get last number and increment
  SELECT COALESCE(MAX(CAST(SPLIT_PART(document_number, '/', 3) AS INT)), 0) + 1
  INTO v_last_number
  FROM transactions
  WHERE company_id = p_company_id AND type = p_type;
  
  -- Format: PREFIX/FY/NUMBER (e.g., INV/2024-25/0001)
  v_prefix := CASE
    WHEN p_type = 'sale' THEN 'INV'
    WHEN p_type = 'purchase' THEN 'PINV'
    WHEN p_type = 'quotation' THEN 'QT'
    WHEN p_type = 'purchase_order' THEN 'PO'
    WHEN p_type = 'proforma_invoice' THEN 'PI'
  END;
  
  v_fy := TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || TO_CHAR(CURRENT_DATE + INTERVAL '1 year', 'YY');
  v_new_number := v_prefix || '/' || v_fy || '/' || LPAD(v_last_number::TEXT, 4, '0');
  
  RETURN v_new_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### post_document_stock(p_transaction_id UUID)

Posts stock movements atomically.

```sql
CREATE OR REPLACE FUNCTION post_document_stock(p_transaction_id UUID)
RETURNS VOID AS $$
DECLARE
  v_transaction RECORD;
  v_item RECORD;
  v_warehouse_id UUID;
  v_quantity DECIMAL;
BEGIN
  -- Get transaction details
  SELECT * INTO v_transaction
  FROM transactions
  WHERE id = p_transaction_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found';
  END IF;
  
  IF v_transaction.status != 'draft' THEN
    RAISE EXCEPTION 'Only draft transactions can be posted';
  END IF;
  
  -- Get default warehouse
  SELECT id INTO v_warehouse_id
  FROM warehouses
  WHERE company_id = v_transaction.company_id
    AND is_default = true
  LIMIT 1;
  
  -- Process each item
  FOR v_item IN
    SELECT * FROM transaction_items WHERE transaction_id = p_transaction_id
  LOOP
    v_quantity := CASE
      WHEN v_transaction.type IN ('purchase', 'purchase_return_out') THEN v_item.quantity
      WHEN v_transaction.type IN ('sale', 'sales_return_in') THEN -v_item.quantity
      ELSE 0
    END;
    
    -- Update stock
    INSERT INTO stock (company_id, product_id, warehouse_id, quantity)
    VALUES (v_transaction.company_id, v_item.product_id, v_warehouse_id, v_quantity)
    ON CONFLICT (company_id, product_id, warehouse_id)
    DO UPDATE SET
      quantity = stock.quantity + v_quantity,
      updated_at = now();
    
    -- Record movement
    INSERT INTO stock_movements (
      company_id, product_id, warehouse_id, transaction_id,
      type, quantity, balance_after, reference_number, created_by
    )
    SELECT
      v_transaction.company_id,
      v_item.product_id,
      v_warehouse_id,
      p_transaction_id,
      v_transaction.type,
      v_quantity,
      s.quantity,
      v_transaction.document_number,
      v_transaction.created_by
    FROM stock s
    WHERE s.company_id = v_transaction.company_id
      AND s.product_id = v_item.product_id
      AND s.warehouse_id = v_warehouse_id;
  END LOOP;
  
  -- Mark transaction as posted
  UPDATE transactions
  SET status = 'confirmed', updated_at = now()
  WHERE id = p_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### cancel_document_stock(p_transaction_id UUID)

Reverses stock movements.

```sql
CREATE OR REPLACE FUNCTION cancel_document_stock(p_transaction_id UUID)
RETURNS VOID AS $$
  -- Similar to post_document_stock but reverses quantities
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Triggers

### updated_at Trigger

Automatically updates `updated_at` timestamp.

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at column
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

## Row Level Security (RLS) Policies

All tables have RLS enabled with policies enforcing:

1. **SELECT**: Users can view rows from their company
2. **INSERT**: Users can insert rows with their company_id
3. **UPDATE**: Users can update rows from their company
4. **DELETE**: Admins can delete rows from their company

Example for products table:

```sql
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Products: View company products"
  ON products FOR SELECT
  USING (company_id = get_current_company_id());

CREATE POLICY "Products: Insert company products"
  ON products FOR INSERT
  WITH CHECK (
    company_id = get_current_company_id()
    AND has_permission('products:write')
  );

CREATE POLICY "Products: Update company products"
  ON products FOR UPDATE
  USING (company_id = get_current_company_id())
  WITH CHECK (
    company_id = get_current_company_id()
    AND has_permission('products:write')
  );

CREATE POLICY "Products: Delete company products"
  ON products FOR DELETE
  USING (
    company_id = get_current_company_id()
    AND has_permission('products:delete')
  );
```

## Backup & Recovery

### Automated Backups (Supabase)
- Daily automated backups
- Point-in-time recovery (PITR)
- 7-day retention on free tier, 30+ days on paid

### Manual Backups

```bash
# Export all data
pg_dump -h db.xxx.supabase.co -U postgres > backup.sql

# Export specific tables
pg_dump -h db.xxx.supabase.co -U postgres -t companies -t products > partial.sql

# Restore
psql -h db.xxx.supabase.co -U postgres < backup.sql
```

---

**Document Version**: 1.0  
**Last Updated**: 2026-09-27  
**Database Version**: PostgreSQL 15 (Supabase)
