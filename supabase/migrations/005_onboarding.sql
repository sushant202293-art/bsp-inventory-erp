-- ============================================================
-- 005_onboarding.sql – Onboarding automation and seed data
--
-- Without these the app cannot be used at all:
--   * no profile row is created on signup, so every service
--     call fails with "User profile not found"
--   * no warehouse exists, so posting a sale/purchase fails
--   * the logo upload bucket referenced by CompanyContext does
--     not exist
-- ============================================================

-- ============================================================
-- 1. PROFILE AUTO-CREATION ON SIGNUP
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_company_id UUID;
    v_role TEXT := 'viewer';
BEGIN
    -- Attach the new user to a company if one was supplied at signup
    -- (raw_app_meta_data ->> 'company_id'), otherwise leave unassigned
    -- so an admin can provision them.
    BEGIN
        v_company_id := NULLIF(NEW.raw_app_meta_data ->> 'company_id', '')::UUID;
    EXCEPTION WHEN others THEN
        v_company_id := NULL;
    END;

    IF v_company_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM companies WHERE id = v_company_id) THEN
        v_company_id := NULL;
    END IF;

    INSERT INTO public.profiles (id, company_id, email, full_name, role, is_active)
    VALUES (
        NEW.id,
        v_company_id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
        v_role,
        true
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 2. DEFAULT WAREHOUSE + COMPANY SETTINGS ON COMPANY CREATE
-- ============================================================
-- The app resolves "the default warehouse" by an explicit flag, but
-- warehouses had no such column, so every default-warehouse lookup
-- failed. Add it and backfill the first warehouse of every company.
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS code TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_warehouses_company_default
    ON warehouses(company_id) WHERE is_default;

-- Only one default per company: clear others, then promote the oldest.
UPDATE warehouses w SET is_default = false
WHERE w.is_default
  AND w.id <> (
      SELECT w2.id FROM warehouses w2
      WHERE w2.company_id = w.company_id
      ORDER BY w2.created_at ASC, w2.id ASC
      LIMIT 1
  );

UPDATE warehouses w SET is_default = true
WHERE w.id IN (
    SELECT DISTINCT ON (w2.company_id) w2.id
    FROM warehouses w2
    ORDER BY w2.company_id, w2.created_at ASC, w2.id ASC
);

CREATE OR REPLACE FUNCTION public.handle_new_company()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.warehouses (company_id, name, address, is_active, is_default, code)
    VALUES (NEW.id, 'Main Warehouse', NEW.address, true, true, 'MAIN');

    INSERT INTO public.company_settings (company_id)
    VALUES (NEW.id);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_company_created ON companies;
CREATE TRIGGER on_company_created
    AFTER INSERT ON companies
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_company();

-- Backfill company_settings for any company created before this migration
INSERT INTO company_settings (company_id)
SELECT c.id FROM companies c
WHERE NOT EXISTS (SELECT 1 FROM company_settings cs WHERE cs.company_id = c.id);

-- Backfill a default warehouse for any company that has none
INSERT INTO warehouses (company_id, name, address, is_active, is_default, code)
SELECT c.id, 'Main Warehouse', c.address, true, true, 'MAIN'
FROM companies c
WHERE NOT EXISTS (SELECT 1 FROM warehouses w WHERE w.company_id = c.id);

-- ============================================================
-- 3. DEFAULT ROLE FROM PROFILE.ROLE
--    The app stores a simple role string on the profile, but all
--    RLS helpers read role_permissions. Bridge the two so a user
--    marked 'admin' is actually an admin.
-- ============================================================
INSERT INTO roles (company_id, name, description, is_system)
SELECT c.id, r.name, r.description, true
FROM companies c
CROSS JOIN (VALUES
    ('admin',      'Full access to all modules'),
    ('manager',    'Manages day-to-day operations and inventory'),
    ('accountant', 'Access to finance, ledgers and GST reports'),
    ('viewer',     'Read-only access')
) AS r(name, description)
WHERE NOT EXISTS (
    SELECT 1 FROM roles er WHERE er.company_id = c.id AND er.name = r.name
);

CREATE OR REPLACE FUNCTION public.sync_role_permissions()
RETURNS TRIGGER AS $$
DECLARE
    v_role_id UUID;
BEGIN
    IF NEW.role IS NULL OR NEW.role = '' THEN
        RETURN NEW;
    END IF;

    SELECT id INTO v_role_id
    FROM roles
    WHERE company_id = NEW.company_id AND lower(name) = lower(NEW.role)
    LIMIT 1;

    IF v_role_id IS NOT NULL THEN
        INSERT INTO user_roles (user_id, role_id, company_id)
        VALUES (NEW.id, v_role_id, NEW.company_id)
        ON CONFLICT DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_profile_role_sync ON profiles;
CREATE TRIGGER on_profile_role_sync
    AFTER INSERT OR UPDATE OF role, company_id ON profiles
    FOR EACH ROW WHEN (NEW.company_id IS NOT NULL)
    EXECUTE FUNCTION public.sync_role_permissions();

-- Backfill user_roles for every profile that already has a company
INSERT INTO user_roles (user_id, role_id, company_id)
SELECT p.id, r.id, p.company_id
FROM profiles p
JOIN roles r ON r.company_id = p.company_id AND lower(r.name) = lower(p.role)
WHERE p.company_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM user_roles ur WHERE ur.user_id = p.id AND ur.company_id = p.company_id
  );

-- ============================================================
-- 4. ADMIN ROLE: every permission
-- ============================================================
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE lower(r.name) = 'admin'
  AND NOT EXISTS (
      SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- ============================================================
-- 5. MANAGER / ACCOUNTANT / VIEWER STARTER PERMISSIONS
-- ============================================================
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE (lower(r.name) = 'manager'
       AND p.module IN ('dashboard','products','categories','brands','customers','suppliers',
                        'sales','purchases','quotations','purchase_orders','proforma_invoices',
                        'stock','warehouses')
       AND p.action <> 'delete')
   OR (lower(r.name) = 'accountant'
       AND p.module IN ('dashboard','sales','purchases','quotations','proforma_invoices',
                        'payments_received','payments_made','reports','audit_logs'))
   OR (lower(r.name) = 'viewer'
       AND p.action IN ('read', 'dashboard'))
ON CONFLICT DO NOTHING;

-- ============================================================
-- 6. STORAGE BUCKET FOR COMPANY ASSETS (logos)
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'company-assets',
    'company-assets',
    true,
    2097152,
    ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "company_assets_read" ON storage.objects;
CREATE POLICY "company_assets_read" ON storage.objects
    FOR SELECT USING (bucket_id = 'company-assets');

DROP POLICY IF EXISTS "company_assets_insert" ON storage.objects;
CREATE POLICY "company_assets_insert" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'company-assets'
        AND (storage.foldername(name))[1] = public.user_company_id()::TEXT
    );

DROP POLICY IF EXISTS "company_assets_update" ON storage.objects;
CREATE POLICY "company_assets_update" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'company-assets'
        AND (storage.foldername(name))[1] = public.user_company_id()::TEXT
    );

DROP POLICY IF EXISTS "company_assets_delete" ON storage.objects;
CREATE POLICY "company_assets_delete" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'company-assets'
        AND (storage.foldername(name))[1] = public.user_company_id()::TEXT
    );

-- ============================================================
-- 7. NOTIFICATION TRIGGER: low-stock alerts
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_low_stock()
RETURNS TRIGGER AS $$
DECLARE
    v_company_id UUID;
    v_product_name TEXT;
    v_current NUMERIC;
    v_low_level INT;
BEGIN
    IF NEW.current_stock >= 0 THEN
        RETURN NEW;
    END IF;

    SELECT p.company_id, p.name, p.low_stock_level
    INTO v_company_id, v_product_name, v_low_level
    FROM products p WHERE p.id = NEW.product_id;

    IF v_company_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT COALESCE(SUM(ps.current_stock), 0)
    INTO v_current
    FROM product_stock ps WHERE ps.product_id = NEW.product_id;

    IF v_current <= v_low_level THEN
        INSERT INTO notifications (company_id, user_id, title, message, type, link)
        SELECT
            v_company_id,
            pr.id,
            'Low stock: ' || v_product_name,
            'Stock level is ' || v_current || ' (reorder at ' || v_low_level || ')',
            'warning',
            '/stock/low-stock'
        FROM profiles pr
        WHERE pr.company_id = v_company_id AND pr.is_active = true
        LIMIT 20;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_low_stock_notify ON product_stock;
CREATE TRIGGER on_low_stock_notify
    AFTER UPDATE ON product_stock
    FOR EACH ROW EXECUTE FUNCTION public.notify_low_stock();
