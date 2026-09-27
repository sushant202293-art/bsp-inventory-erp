-- ============================================================
-- 001_initial_schema.sql – Complete ERP Database Schema
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. COMPANIES
-- ============================================================
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    logo_url TEXT,
    tagline TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    pin TEXT,
    country TEXT DEFAULT 'India',
    phone TEXT,
    email TEXT,
    website TEXT,
    gstin TEXT,
    pan TEXT,
    cin TEXT,
    state_code TEXT,
    bank_name TEXT,
    bank_account_name TEXT,
    bank_account_number TEXT,
    bank_ifsc TEXT,
    bank_branch TEXT,
    bank_upi TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_companies_gstin ON companies(gstin);
CREATE INDEX idx_companies_pan ON companies(pan);

-- ============================================================
-- 2. COMPANY SETTINGS
-- ============================================================
CREATE TABLE company_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    document_prefixes JSONB DEFAULT '{"sale":"INV","purchase":"PUR","quotation":"QUO","proforma":"PI","purchase_order":"PO"}'::jsonb,
    tax_settings JSONB DEFAULT '{"cgst_rate":9,"sgst_rate":9,"igst_rate":18,"tax_inclusive":false}'::jsonb,
    payment_settings JSONB DEFAULT '{"default_credit_period":0,"default_credit_limit":0,"late_fee_percent":0}'::jsonb,
    bank_accounts JSONB DEFAULT '[]'::jsonb,
    general_settings JSONB DEFAULT '{"currency":"INR","currency_symbol":"₹","date_format":"DD/MM/YYYY","fiscal_year_start":"04-01"}'::jsonb,
    theme_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_company_settings_company UNIQUE(company_id)
);

-- ============================================================
-- 3. THEMES
-- ============================================================
CREATE TABLE themes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_system BOOLEAN DEFAULT false,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE company_settings
    ADD CONSTRAINT fk_company_settings_theme
    FOREIGN KEY (theme_id) REFERENCES themes(id) ON DELETE SET NULL;

-- ============================================================
-- 4. PROFILES
-- ============================================================
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    full_name TEXT,
    username TEXT,
    email TEXT,
    contact TEXT,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'viewer',
    department TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_profiles_company ON profiles(company_id);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_username ON profiles(username);

-- ============================================================
-- 5. ROLES
-- ============================================================
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_roles_company_name UNIQUE(company_id, name)
);

-- ============================================================
-- 6. PERMISSIONS
-- ============================================================
CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module TEXT NOT NULL,
    action TEXT NOT NULL,
    description TEXT,
    CONSTRAINT uq_permissions_module_action UNIQUE(module, action)
);

-- Seed default permissions
INSERT INTO permissions (module, action, description) VALUES
-- Dashboard
('dashboard', 'read', 'View dashboard'),
-- Products
('products', 'create', 'Create products'),
('products', 'read', 'View products'),
('products', 'update', 'Update products'),
('products', 'delete', 'Delete products'),
-- Categories
('categories', 'create', 'Create categories'),
('categories', 'read', 'View categories'),
('categories', 'update', 'Update categories'),
('categories', 'delete', 'Delete categories'),
-- Brands
('brands', 'create', 'Create brands'),
('brands', 'read', 'View brands'),
('brands', 'update', 'Update brands'),
('brands', 'delete', 'Delete brands'),
-- Customers
('customers', 'create', 'Create customers'),
('customers', 'read', 'View customers'),
('customers', 'update', 'Update customers'),
('customers', 'delete', 'Delete customers'),
-- Suppliers
('suppliers', 'create', 'Create suppliers'),
('suppliers', 'read', 'View suppliers'),
('suppliers', 'update', 'Update suppliers'),
('suppliers', 'delete', 'Delete suppliers'),
-- Sales
('sales', 'create', 'Create sales invoices'),
('sales', 'read', 'View sales invoices'),
('sales', 'update', 'Update sales invoices'),
('sales', 'delete', 'Delete sales invoices'),
('sales', 'approve', 'Approve sales invoices'),
-- Purchases
('purchases', 'create', 'Create purchase invoices'),
('purchases', 'read', 'View purchase invoices'),
('purchases', 'update', 'Update purchase invoices'),
('purchases', 'delete', 'Delete purchase invoices'),
('purchases', 'approve', 'Approve purchase invoices'),
-- Quotations
('quotations', 'create', 'Create quotations'),
('quotations', 'read', 'View quotations'),
('quotations', 'update', 'Update quotations'),
('quotations', 'delete', 'Delete quotations'),
-- Purchase Orders
('purchase_orders', 'create', 'Create purchase orders'),
('purchase_orders', 'read', 'View purchase orders'),
('purchase_orders', 'update', 'Update purchase orders'),
('purchase_orders', 'delete', 'Delete purchase orders'),
-- Proforma Invoices
('proforma_invoices', 'create', 'Create proforma invoices'),
('proforma_invoices', 'read', 'View proforma invoices'),
('proforma_invoices', 'update', 'Update proforma invoices'),
('proforma_invoices', 'delete', 'Delete proforma invoices'),
-- Payments Received
('payments_received', 'create', 'Record payments received'),
('payments_received', 'read', 'View payments received'),
('payments_received', 'update', 'Update payments received'),
('payments_received', 'delete', 'Delete payments received'),
-- Payments Made
('payments_made', 'create', 'Record payments made'),
('payments_made', 'read', 'View payments made'),
('payments_made', 'update', 'Update payments made'),
('payments_made', 'delete', 'Delete payments made'),
-- Stock
('stock', 'read', 'View stock levels'),
('stock', 'adjust', 'Adjust stock'),
('stock', 'transfer', 'Transfer stock between warehouses'),
-- Warehouses
('warehouses', 'create', 'Create warehouses'),
('warehouses', 'read', 'View warehouses'),
('warehouses', 'update', 'Update warehouses'),
('warehouses', 'delete', 'Delete warehouses'),
-- Reports
('reports', 'sales', 'View sales reports'),
('reports', 'purchase', 'View purchase reports'),
('reports', 'stock', 'View stock reports'),
('reports', 'financial', 'View financial reports'),
-- Settings
('settings', 'read', 'View settings'),
('settings', 'update', 'Update settings'),
-- Users
('users', 'create', 'Create users'),
('users', 'read', 'View users'),
('users', 'update', 'Update users'),
('users', 'delete', 'Delete users'),
-- Roles
('roles', 'create', 'Create roles'),
('roles', 'read', 'View roles'),
('roles', 'update', 'Update roles'),
('roles', 'delete', 'Delete roles'),
-- Audit Logs
('audit_logs', 'read', 'View audit logs'),
-- Backups
('backups', 'create', 'Create backups'),
('backups', 'read', 'View backup logs'),
-- Notifications
('notifications', 'read', 'View notifications'),
('notifications', 'update', 'Manage notifications');

-- ============================================================
-- 7. ROLE_PERMISSIONS
-- ============================================================
CREATE TABLE role_permissions (
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- ============================================================
-- 8. USER_ROLES
-- ============================================================
CREATE TABLE user_roles (
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id, company_id)
);

CREATE INDEX idx_user_roles_company ON user_roles(company_id);

-- ============================================================
-- 9. WAREHOUSES
-- ============================================================
CREATE TABLE warehouses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_warehouses_company ON warehouses(company_id);

-- ============================================================
-- 10. CATEGORIES
-- ============================================================
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_categories_company ON categories(company_id);
CREATE INDEX idx_categories_parent ON categories(parent_id);

-- ============================================================
-- 11. BRANDS
-- ============================================================
CREATE TABLE brands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    logo_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_brands_company ON brands(company_id);

-- ============================================================
-- 12. UNITS
-- ============================================================
CREATE TABLE units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    short_name TEXT NOT NULL,
    base_unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
    conversion_factor DECIMAL(12,4) DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_units_company ON units(company_id);

-- ============================================================
-- 13. PRODUCTS
-- ============================================================
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
    color TEXT,
    size TEXT,
    unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
    gst_rate DECIMAL(5,2) NOT NULL DEFAULT 18,
    hsn_sac TEXT,
    description TEXT,
    purchase_price DECIMAL(12,2) DEFAULT 0,
    selling_price DECIMAL(12,2) DEFAULT 0,
    low_stock_level INT DEFAULT 10,
    reorder_level INT DEFAULT 20,
    image_url TEXT,
    barcode TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_products_company_code UNIQUE(company_id, code)
);

CREATE INDEX idx_products_company ON products(company_id);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_brand ON products(brand_id);
CREATE INDEX idx_products_unit ON products(unit_id);
CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_products_code ON products(code);

-- ============================================================
-- 14. PRODUCT_STOCK
-- ============================================================
CREATE TABLE product_stock (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    current_stock DECIMAL(12,4) NOT NULL DEFAULT 0,
    avg_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
    last_updated TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_product_stock_product_warehouse UNIQUE(product_id, warehouse_id)
);

CREATE INDEX idx_product_stock_product ON product_stock(product_id);
CREATE INDEX idx_product_stock_warehouse ON product_stock(warehouse_id);

-- ============================================================
-- 15. CUSTOMERS
-- ============================================================
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT,
    gstin TEXT,
    pan TEXT,
    contact_person TEXT,
    phone TEXT,
    alt_phone TEXT,
    email TEXT,
    billing_address JSONB,
    shipping_address JSONB,
    city TEXT,
    state TEXT,
    pin TEXT,
    country TEXT DEFAULT 'India',
    credit_limit DECIMAL(12,2) DEFAULT 0,
    credit_period INT DEFAULT 0,
    opening_balance DECIMAL(12,2) DEFAULT 0,
    opening_balance_type TEXT DEFAULT 'debit' CHECK (opening_balance_type IN ('debit', 'credit')),
    bank_details JSONB,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_customers_company ON customers(company_id);
CREATE INDEX idx_customers_code ON customers(company_id, code);
CREATE INDEX idx_customers_gstin ON customers(gstin);
CREATE INDEX idx_customers_phone ON customers(phone);

-- ============================================================
-- 16. SUPPLIERS
-- ============================================================
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT,
    gstin TEXT,
    pan TEXT,
    contact_person TEXT,
    phone TEXT,
    alt_phone TEXT,
    email TEXT,
    billing_address JSONB,
    shipping_address JSONB,
    city TEXT,
    state TEXT,
    pin TEXT,
    country TEXT DEFAULT 'India',
    credit_limit DECIMAL(12,2) DEFAULT 0,
    credit_period INT DEFAULT 0,
    opening_balance DECIMAL(12,2) DEFAULT 0,
    opening_balance_type TEXT DEFAULT 'credit' CHECK (opening_balance_type IN ('debit', 'credit')),
    payment_terms TEXT,
    bank_details JSONB,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_suppliers_company ON suppliers(company_id);
CREATE INDEX idx_suppliers_code ON suppliers(company_id, code);
CREATE INDEX idx_suppliers_gstin ON suppliers(gstin);
CREATE INDEX idx_suppliers_phone ON suppliers(phone);

-- ============================================================
-- 17. TRANSACTIONS
-- ============================================================
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('sale', 'purchase', 'quotation', 'purchase_order', 'proforma_invoice')),
    document_number TEXT NOT NULL,
    document_date DATE NOT NULL DEFAULT CURRENT_DATE,
    reference_number TEXT,
    reference_date DATE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    billing_address JSONB,
    shipping_address JSONB,
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    round_off DECIMAL(12,2) NOT NULL DEFAULT 0,
    grand_total DECIMAL(12,2) NOT NULL DEFAULT 0,
    amount_paid DECIMAL(12,2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'approved', 'cancelled', 'paid', 'partial')),
    notes TEXT,
    terms TEXT,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_transactions_company ON transactions(company_id);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_document_number ON transactions(company_id, document_number);
CREATE INDEX idx_transactions_document_date ON transactions(document_date);
CREATE INDEX idx_transactions_customer ON transactions(customer_id);
CREATE INDEX idx_transactions_supplier ON transactions(supplier_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_created_by ON transactions(created_by);

-- ============================================================
-- 18. TRANSACTION_ITEMS
-- ============================================================
CREATE TABLE transaction_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    product_code TEXT,
    brand_name TEXT,
    quantity DECIMAL(12,4) NOT NULL DEFAULT 0,
    unit TEXT,
    rate DECIMAL(12,2) NOT NULL DEFAULT 0,
    discount_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    taxable_value DECIMAL(12,2) NOT NULL DEFAULT 0,
    gst_rate DECIMAL(5,2) NOT NULL DEFAULT 18,
    cgst_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    sgst_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    igst_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    sort_order INT NOT NULL DEFAULT 0
);

CREATE INDEX idx_transaction_items_transaction ON transaction_items(transaction_id);
CREATE INDEX idx_transaction_items_product ON transaction_items(product_id);

-- ============================================================
-- 19. STOCK_MOVEMENTS
-- ============================================================
CREATE TABLE stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('opening', 'purchase', 'purchase_return', 'sales', 'sales_return', 'adjustment_in', 'adjustment_out', 'transfer_in', 'transfer_out')),
    reference_type TEXT,
    reference_id UUID,
    quantity DECIMAL(12,4) NOT NULL,
    balance_after DECIMAL(12,4) NOT NULL,
    unit_cost DECIMAL(12,2) DEFAULT 0,
    total_value DECIMAL(12,2) DEFAULT 0,
    notes TEXT,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_stock_movements_company ON stock_movements(company_id);
CREATE INDEX idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX idx_stock_movements_warehouse ON stock_movements(warehouse_id);
CREATE INDEX idx_stock_movements_type ON stock_movements(type);
CREATE INDEX idx_stock_movements_reference ON stock_movements(reference_type, reference_id);
CREATE INDEX idx_stock_movements_created_at ON stock_movements(created_at);

-- ============================================================
-- 20. PAYMENTS_RECEIVED
-- ============================================================
CREATE TABLE payments_received (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    reference_number TEXT,
    mode TEXT NOT NULL CHECK (mode IN ('cash', 'bank', 'upi', 'cheque', 'other')),
    bank_name TEXT,
    amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    notes TEXT,
    transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_received_company ON payments_received(company_id);
CREATE INDEX idx_payments_received_customer ON payments_received(customer_id);
CREATE INDEX idx_payments_received_date ON payments_received(date);
CREATE INDEX idx_payments_received_transaction ON payments_received(transaction_id);

-- ============================================================
-- 21. PAYMENTS_MADE
-- ============================================================
CREATE TABLE payments_made (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    reference_number TEXT,
    mode TEXT NOT NULL CHECK (mode IN ('cash', 'bank', 'upi', 'cheque', 'other')),
    bank_name TEXT,
    amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    notes TEXT,
    transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_made_company ON payments_made(company_id);
CREATE INDEX idx_payments_made_supplier ON payments_made(supplier_id);
CREATE INDEX idx_payments_made_date ON payments_made(date);
CREATE INDEX idx_payments_made_transaction ON payments_made(transaction_id);

-- ============================================================
-- 22. CUSTOMER_LEDGER
-- ============================================================
CREATE TABLE customer_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT,
    debit DECIMAL(12,2) NOT NULL DEFAULT 0,
    credit DECIMAL(12,2) NOT NULL DEFAULT 0,
    balance DECIMAL(12,2) NOT NULL DEFAULT 0,
    reference_type TEXT,
    reference_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_customer_ledger_customer ON customer_ledger(customer_id);
CREATE INDEX idx_customer_ledger_date ON customer_ledger(date);
CREATE INDEX idx_customer_ledger_reference ON customer_ledger(reference_type, reference_id);

-- ============================================================
-- 23. SUPPLIER_LEDGER
-- ============================================================
CREATE TABLE supplier_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT,
    debit DECIMAL(12,2) NOT NULL DEFAULT 0,
    credit DECIMAL(12,2) NOT NULL DEFAULT 0,
    balance DECIMAL(12,2) NOT NULL DEFAULT 0,
    reference_type TEXT,
    reference_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_supplier_ledger_supplier ON supplier_ledger(supplier_id);
CREATE INDEX idx_supplier_ledger_date ON supplier_ledger(date);
CREATE INDEX idx_supplier_ledger_reference ON supplier_ledger(reference_type, reference_id);

-- ============================================================
-- 24. AUDIT_LOGS
-- ============================================================
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    module TEXT NOT NULL,
    record_id UUID,
    old_value JSONB,
    new_value JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_company ON audit_logs(company_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_module ON audit_logs(module);
CREATE INDEX idx_audit_logs_record ON audit_logs(record_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- ============================================================
-- 25. NOTIFICATIONS
-- ============================================================
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT,
    type TEXT NOT NULL DEFAULT 'info',
    is_read BOOLEAN NOT NULL DEFAULT false,
    link TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_company ON notifications(company_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(is_read);

-- ============================================================
-- 26. BACKUP_LOGS
-- ============================================================
CREATE TABLE backup_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('export', 'import')),
    format TEXT NOT NULL DEFAULT 'csv',
    file_name TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    records_count INT DEFAULT 0,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_backup_logs_company ON backup_logs(company_id);
CREATE INDEX idx_backup_logs_created_at ON backup_logs(created_at);

-- ============================================================
-- updated_at TRIGGER FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER trg_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_company_settings_updated_at BEFORE UPDATE ON company_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_brands_updated_at BEFORE UPDATE ON brands FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_suppliers_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_transactions_updated_at BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_payments_received_updated_at BEFORE UPDATE ON payments_received FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_payments_made_updated_at BEFORE UPDATE ON payments_made FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
