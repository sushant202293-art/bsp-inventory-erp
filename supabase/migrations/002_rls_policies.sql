-- ============================================================
-- 002_rls_policies.sql – Row Level Security Policies
-- ============================================================

-- ============================================================
-- HELPER: Get current user's company_id
-- ============================================================
CREATE OR REPLACE FUNCTION public.user_company_id()
RETURNS UUID AS $$
    SELECT company_id FROM profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- ============================================================
-- HELPER: Check if user has a specific permission
-- ============================================================
CREATE OR REPLACE FUNCTION public.user_has_permission(p_module TEXT, p_action TEXT)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1
        FROM user_roles ur
        JOIN role_permissions rp ON rp.role_id = ur.role_id
        JOIN permissions p ON p.id = rp.permission_id
        WHERE ur.user_id = auth.uid()
          AND p.module = p_module
          AND p.action = p_action
    ) OR EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- ============================================================
-- HELPER: Check if user is admin
-- ============================================================
CREATE OR REPLACE FUNCTION public.user_is_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- ============================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments_received ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments_made ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE backup_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- COMPANIES
-- ============================================================
CREATE POLICY "companies_select_own" ON companies
    FOR SELECT USING (
        id = public.user_company_id()
        OR public.user_is_admin()
    );

CREATE POLICY "companies_insert_own" ON companies
    FOR INSERT WITH CHECK (
        public.user_is_admin()
    );

CREATE POLICY "companies_update_own" ON companies
    FOR UPDATE USING (
        id = public.user_company_id()
        OR public.user_is_admin()
    );

-- ============================================================
-- COMPANY_SETTINGS
-- ============================================================
CREATE POLICY "company_settings_select_own" ON company_settings
    FOR SELECT USING (
        company_id = public.user_company_id()
        OR public.user_is_admin()
    );

CREATE POLICY "company_settings_insert_own" ON company_settings
    FOR INSERT WITH CHECK (
        company_id = public.user_company_id()
    );

CREATE POLICY "company_settings_update_own" ON company_settings
    FOR UPDATE USING (
        company_id = public.user_company_id()
        OR public.user_is_admin()
    );

-- ============================================================
-- THEMES
-- ============================================================
CREATE POLICY "themes_select_all" ON themes
    FOR SELECT USING (
        is_system = true
        OR created_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM company_settings cs WHERE cs.theme_id = themes.id AND cs.company_id = public.user_company_id()
        )
    );

CREATE POLICY "themes_insert_own" ON themes
    FOR INSERT WITH CHECK (
        created_by = auth.uid()
    );

-- ============================================================
-- PROFILES
-- ============================================================
CREATE POLICY "profiles_select_own" ON profiles
    FOR SELECT USING (
        company_id = public.user_company_id()
        OR public.user_is_admin()
        OR id = auth.uid()
    );

CREATE POLICY "profiles_insert_own" ON profiles
    FOR INSERT WITH CHECK (
        id = auth.uid()
        OR public.user_is_admin()
    );

CREATE POLICY "profiles_update_own" ON profiles
    FOR UPDATE USING (
        id = auth.uid()
        OR public.user_is_admin()
    );

CREATE POLICY "profiles_delete_admin" ON profiles
    FOR DELETE USING (
        public.user_is_admin()
    );

-- ============================================================
-- ROLES
-- ============================================================
CREATE POLICY "roles_select_own" ON roles
    FOR SELECT USING (
        company_id = public.user_company_id()
        OR public.user_is_admin()
    );

CREATE POLICY "roles_insert_admin" ON roles
    FOR INSERT WITH CHECK (
        public.user_has_permission('roles', 'create')
        OR public.user_is_admin()
    );

CREATE POLICY "roles_update_admin" ON roles
    FOR UPDATE USING (
        public.user_has_permission('roles', 'update')
        OR public.user_is_admin()
    );

CREATE POLICY "roles_delete_admin" ON roles
    FOR DELETE USING (
        public.user_has_permission('roles', 'delete')
        OR public.user_is_admin()
    );

-- ============================================================
-- PERMISSIONS (read-only for authenticated)
-- ============================================================
CREATE POLICY "permissions_select_all" ON permissions
    FOR SELECT USING (
        auth.role() = 'authenticated'
    );

-- ============================================================
-- ROLE_PERMISSIONS
-- ============================================================
CREATE POLICY "role_permissions_select_own" ON role_permissions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM roles r WHERE r.id = role_permissions.role_id AND r.company_id = public.user_company_id()
        )
        OR public.user_is_admin()
    );

CREATE POLICY "role_permissions_insert_admin" ON role_permissions
    FOR INSERT WITH CHECK (
        public.user_has_permission('roles', 'update')
        OR public.user_is_admin()
    );

CREATE POLICY "role_permissions_delete_admin" ON role_permissions
    FOR DELETE USING (
        public.user_has_permission('roles', 'update')
        OR public.user_is_admin()
    );

-- ============================================================
-- USER_ROLES
-- ============================================================
CREATE POLICY "user_roles_select_own" ON user_roles
    FOR SELECT USING (
        company_id = public.user_company_id()
        OR public.user_is_admin()
    );

CREATE POLICY "user_roles_insert_admin" ON user_roles
    FOR INSERT WITH CHECK (
        public.user_has_permission('users', 'update')
        OR public.user_is_admin()
    );

CREATE POLICY "user_roles_delete_admin" ON user_roles
    FOR DELETE USING (
        public.user_has_permission('users', 'update')
        OR public.user_is_admin()
    );

-- ============================================================
-- WAREHOUSES
-- ============================================================
CREATE POLICY "warehouses_select_own" ON warehouses
    FOR SELECT USING (
        company_id = public.user_company_id()
        OR public.user_is_admin()
    );

CREATE POLICY "warehouses_insert_own" ON warehouses
    FOR INSERT WITH CHECK (
        company_id = public.user_company_id()
        AND (public.user_has_permission('warehouses', 'create') OR public.user_is_admin())
    );

CREATE POLICY "warehouses_update_own" ON warehouses
    FOR UPDATE USING (
        company_id = public.user_company_id()
        AND (public.user_has_permission('warehouses', 'update') OR public.user_is_admin())
    );

CREATE POLICY "warehouses_delete_own" ON warehouses
    FOR DELETE USING (
        company_id = public.user_company_id()
        AND (public.user_has_permission('warehouses', 'delete') OR public.user_is_admin())
    );

-- ============================================================
-- CATEGORIES
-- ============================================================
CREATE POLICY "categories_select_own" ON categories
    FOR SELECT USING (
        company_id = public.user_company_id()
        OR public.user_is_admin()
    );

CREATE POLICY "categories_insert_own" ON categories
    FOR INSERT WITH CHECK (
        company_id = public.user_company_id()
        AND (public.user_has_permission('categories', 'create') OR public.user_is_admin())
    );

CREATE POLICY "categories_update_own" ON categories
    FOR UPDATE USING (
        company_id = public.user_company_id()
        AND (public.user_has_permission('categories', 'update') OR public.user_is_admin())
    );

CREATE POLICY "categories_delete_own" ON categories
    FOR DELETE USING (
        company_id = public.user_company_id()
        AND (public.user_has_permission('categories', 'delete') OR public.user_is_admin())
    );

-- ============================================================
-- BRANDS
-- ============================================================
CREATE POLICY "brands_select_own" ON brands
    FOR SELECT USING (
        company_id = public.user_company_id()
        OR public.user_is_admin()
    );

CREATE POLICY "brands_insert_own" ON brands
    FOR INSERT WITH CHECK (
        company_id = public.user_company_id()
        AND (public.user_has_permission('brands', 'create') OR public.user_is_admin())
    );

CREATE POLICY "brands_update_own" ON brands
    FOR UPDATE USING (
        company_id = public.user_company_id()
        AND (public.user_has_permission('brands', 'update') OR public.user_is_admin())
    );

CREATE POLICY "brands_delete_own" ON brands
    FOR DELETE USING (
        company_id = public.user_company_id()
        AND (public.user_has_permission('brands', 'delete') OR public.user_is_admin())
    );

-- ============================================================
-- UNITS
-- ============================================================
CREATE POLICY "units_select_own" ON units
    FOR SELECT USING (
        company_id = public.user_company_id()
        OR public.user_is_admin()
    );

CREATE POLICY "units_insert_own" ON units
    FOR INSERT WITH CHECK (
        company_id = public.user_company_id()
    );

CREATE POLICY "units_update_own" ON units
    FOR UPDATE USING (
        company_id = public.user_company_id()
    );

CREATE POLICY "units_delete_own" ON units
    FOR DELETE USING (
        company_id = public.user_company_id()
    );

-- ============================================================
-- PRODUCTS
-- ============================================================
CREATE POLICY "products_select_own" ON products
    FOR SELECT USING (
        company_id = public.user_company_id()
        OR public.user_is_admin()
    );

CREATE POLICY "products_insert_own" ON products
    FOR INSERT WITH CHECK (
        company_id = public.user_company_id()
        AND (public.user_has_permission('products', 'create') OR public.user_is_admin())
    );

CREATE POLICY "products_update_own" ON products
    FOR UPDATE USING (
        company_id = public.user_company_id()
        AND (public.user_has_permission('products', 'update') OR public.user_is_admin())
    );

CREATE POLICY "products_delete_own" ON products
    FOR DELETE USING (
        company_id = public.user_company_id()
        AND (public.user_has_permission('products', 'delete') OR public.user_is_admin())
    );

-- ============================================================
-- PRODUCT_STOCK
-- ============================================================
CREATE POLICY "product_stock_select_own" ON product_stock
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM products p WHERE p.id = product_stock.product_id AND p.company_id = public.user_company_id()
        )
        OR public.user_is_admin()
    );

CREATE POLICY "product_stock_insert_own" ON product_stock
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM products p WHERE p.id = product_stock.product_id AND p.company_id = public.user_company_id()
        )
        AND (public.user_has_permission('stock', 'adjust') OR public.user_is_admin())
    );

CREATE POLICY "product_stock_update_own" ON product_stock
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM products p WHERE p.id = product_stock.product_id AND p.company_id = public.user_company_id()
        )
        AND (public.user_has_permission('stock', 'adjust') OR public.user_is_admin())
    );

-- ============================================================
-- CUSTOMERS
-- ============================================================
CREATE POLICY "customers_select_own" ON customers
    FOR SELECT USING (
        company_id = public.user_company_id()
        OR public.user_is_admin()
    );

CREATE POLICY "customers_insert_own" ON customers
    FOR INSERT WITH CHECK (
        company_id = public.user_company_id()
        AND (public.user_has_permission('customers', 'create') OR public.user_is_admin())
    );

CREATE POLICY "customers_update_own" ON customers
    FOR UPDATE USING (
        company_id = public.user_company_id()
        AND (public.user_has_permission('customers', 'update') OR public.user_is_admin())
    );

CREATE POLICY "customers_delete_own" ON customers
    FOR DELETE USING (
        company_id = public.user_company_id()
        AND (public.user_has_permission('customers', 'delete') OR public.user_is_admin())
    );

-- ============================================================
-- SUPPLIERS
-- ============================================================
CREATE POLICY "suppliers_select_own" ON suppliers
    FOR SELECT USING (
        company_id = public.user_company_id()
        OR public.user_is_admin()
    );

CREATE POLICY "suppliers_insert_own" ON suppliers
    FOR INSERT WITH CHECK (
        company_id = public.user_company_id()
        AND (public.user_has_permission('suppliers', 'create') OR public.user_is_admin())
    );

CREATE POLICY "suppliers_update_own" ON suppliers
    FOR UPDATE USING (
        company_id = public.user_company_id()
        AND (public.user_has_permission('suppliers', 'update') OR public.user_is_admin())
    );

CREATE POLICY "suppliers_delete_own" ON suppliers
    FOR DELETE USING (
        company_id = public.user_company_id()
        AND (public.user_has_permission('suppliers', 'delete') OR public.user_is_admin())
    );

-- ============================================================
-- TRANSACTIONS
-- ============================================================
CREATE POLICY "transactions_select_own" ON transactions
    FOR SELECT USING (
        company_id = public.user_company_id()
        OR public.user_is_admin()
    );

CREATE POLICY "transactions_insert_own" ON transactions
    FOR INSERT WITH CHECK (
        company_id = public.user_company_id()
        AND (
            public.user_has_permission('sales', 'create')
            OR public.user_has_permission('purchases', 'create')
            OR public.user_has_permission('quotations', 'create')
            OR public.user_has_permission('purchase_orders', 'create')
            OR public.user_has_permission('proforma_invoices', 'create')
            OR public.user_is_admin()
        )
    );

CREATE POLICY "transactions_update_own" ON transactions
    FOR UPDATE USING (
        company_id = public.user_company_id()
        AND (
            public.user_has_permission('sales', 'update')
            OR public.user_has_permission('purchases', 'update')
            OR public.user_has_permission('quotations', 'update')
            OR public.user_has_permission('purchase_orders', 'update')
            OR public.user_has_permission('proforma_invoices', 'update')
            OR public.user_is_admin()
        )
    );

CREATE POLICY "transactions_delete_own" ON transactions
    FOR DELETE USING (
        company_id = public.user_company_id()
        AND (
            public.user_has_permission('sales', 'delete')
            OR public.user_has_permission('purchases', 'delete')
            OR public.user_has_permission('quotations', 'delete')
            OR public.user_has_permission('purchase_orders', 'delete')
            OR public.user_has_permission('proforma_invoices', 'delete')
            OR public.user_is_admin()
        )
    );

-- ============================================================
-- TRANSACTION_ITEMS
-- ============================================================
CREATE POLICY "transaction_items_select_own" ON transaction_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM transactions t WHERE t.id = transaction_items.transaction_id AND t.company_id = public.user_company_id()
        )
        OR public.user_is_admin()
    );

CREATE POLICY "transaction_items_insert_own" ON transaction_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM transactions t WHERE t.id = transaction_items.transaction_id AND t.company_id = public.user_company_id()
        )
    );

CREATE POLICY "transaction_items_update_own" ON transaction_items
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM transactions t WHERE t.id = transaction_items.transaction_id AND t.company_id = public.user_company_id()
        )
    );

CREATE POLICY "transaction_items_delete_own" ON transaction_items
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM transactions t WHERE t.id = transaction_items.transaction_id AND t.company_id = public.user_company_id()
        )
    );

-- ============================================================
-- STOCK_MOVEMENTS
-- ============================================================
CREATE POLICY "stock_movements_select_own" ON stock_movements
    FOR SELECT USING (
        company_id = public.user_company_id()
        OR public.user_is_admin()
    );

CREATE POLICY "stock_movements_insert_own" ON stock_movements
    FOR INSERT WITH CHECK (
        company_id = public.user_company_id()
    );

-- ============================================================
-- PAYMENTS_RECEIVED
-- ============================================================
CREATE POLICY "payments_received_select_own" ON payments_received
    FOR SELECT USING (
        company_id = public.user_company_id()
        OR public.user_is_admin()
    );

CREATE POLICY "payments_received_insert_own" ON payments_received
    FOR INSERT WITH CHECK (
        company_id = public.user_company_id()
        AND (public.user_has_permission('payments_received', 'create') OR public.user_is_admin())
    );

CREATE POLICY "payments_received_update_own" ON payments_received
    FOR UPDATE USING (
        company_id = public.user_company_id()
        AND (public.user_has_permission('payments_received', 'update') OR public.user_is_admin())
    );

CREATE POLICY "payments_received_delete_own" ON payments_received
    FOR DELETE USING (
        company_id = public.user_company_id()
        AND (public.user_has_permission('payments_received', 'delete') OR public.user_is_admin())
    );

-- ============================================================
-- PAYMENTS_MADE
-- ============================================================
CREATE POLICY "payments_made_select_own" ON payments_made
    FOR SELECT USING (
        company_id = public.user_company_id()
        OR public.user_is_admin()
    );

CREATE POLICY "payments_made_insert_own" ON payments_made
    FOR INSERT WITH CHECK (
        company_id = public.user_company_id()
        AND (public.user_has_permission('payments_made', 'create') OR public.user_is_admin())
    );

CREATE POLICY "payments_made_update_own" ON payments_made
    FOR UPDATE USING (
        company_id = public.user_company_id()
        AND (public.user_has_permission('payments_made', 'update') OR public.user_is_admin())
    );

CREATE POLICY "payments_made_delete_own" ON payments_made
    FOR DELETE USING (
        company_id = public.user_company_id()
        AND (public.user_has_permission('payments_made', 'delete') OR public.user_is_admin())
    );

-- ============================================================
-- CUSTOMER_LEDGER
-- ============================================================
CREATE POLICY "customer_ledger_select_own" ON customer_ledger
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM customers c WHERE c.id = customer_ledger.customer_id AND c.company_id = public.user_company_id()
        )
        OR public.user_is_admin()
    );

CREATE POLICY "customer_ledger_insert_own" ON customer_ledger
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM customers c WHERE c.id = customer_ledger.customer_id AND c.company_id = public.user_company_id()
        )
    );

-- ============================================================
-- SUPPLIER_LEDGER
-- ============================================================
CREATE POLICY "supplier_ledger_select_own" ON supplier_ledger
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM suppliers s WHERE s.id = supplier_ledger.supplier_id AND s.company_id = public.user_company_id()
        )
        OR public.user_is_admin()
    );

CREATE POLICY "supplier_ledger_insert_own" ON supplier_ledger
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM suppliers s WHERE s.id = supplier_ledger.supplier_id AND s.company_id = public.user_company_id()
        )
    );

-- ============================================================
-- AUDIT_LOGS
-- ============================================================
CREATE POLICY "audit_logs_select_own" ON audit_logs
    FOR SELECT USING (
        company_id = public.user_company_id()
        OR public.user_is_admin()
    );

CREATE POLICY "audit_logs_insert_own" ON audit_logs
    FOR INSERT WITH CHECK (
        company_id = public.user_company_id()
    );

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE POLICY "notifications_select_own" ON notifications
    FOR SELECT USING (
        (company_id = public.user_company_id() AND user_id = auth.uid())
        OR public.user_is_admin()
    );

CREATE POLICY "notifications_insert_own" ON notifications
    FOR INSERT WITH CHECK (
        company_id = public.user_company_id()
    );

CREATE POLICY "notifications_update_own" ON notifications
    FOR UPDATE USING (
        (company_id = public.user_company_id() AND user_id = auth.uid())
        OR public.user_is_admin()
    );

CREATE POLICY "notifications_delete_own" ON notifications
    FOR DELETE USING (
        (company_id = public.user_company_id() AND user_id = auth.uid())
        OR public.user_is_admin()
    );

-- ============================================================
-- BACKUP_LOGS
-- ============================================================
CREATE POLICY "backup_logs_select_own" ON backup_logs
    FOR SELECT USING (
        company_id = public.user_company_id()
        OR public.user_is_admin()
    );

CREATE POLICY "backup_logs_insert_own" ON backup_logs
    FOR INSERT WITH CHECK (
        company_id = public.user_company_id()
        AND (public.user_has_permission('backups', 'create') OR public.user_is_admin())
    );
