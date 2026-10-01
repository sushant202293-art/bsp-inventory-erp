-- ============================================================
-- 8. RBAC BACKFILL FOR EXISTING COMPANIES
--
-- Why this migration exists
-- -----------------------
-- 005_onboarding.sql seeds the `roles` table with a
--     INSERT INTO roles ... FROM companies c CROSS JOIN (VALUES ...)
-- statement. That is correct but it is a one-shot, non-triggered seed: if the
-- `companies` table was still empty when 005 ran, the statement inserted zero
-- rows and nothing ever back-filled them. Because the `WHERE NOT EXISTS` guard
-- only de-duplicates rows that already exist, re-running is safe.
--
-- The live project hit exactly this: `permissions` had 77 rows, but
-- `roles`, `role_permissions` and `user_roles` were all empty. The app still
-- appeared to work because PermissionContext falls back to the hardcoded
-- `getUserPermissions()` map, but the database-driven RBAC path -- the one all
-- the RLS helper functions actually read -- was completely dead.
--
-- Everything below is idempotent: re-running it is a no-op on an already
-- correct database. It is the same logic as 005, re-run at the point where the
-- company rows are guaranteed to exist.
-- ============================================================

-- 8.1 DEFAULT SYSTEM ROLES (one set per company)
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

-- 8.2 LINK PROFILES TO THEIR ROLE (profiles.role is a text label; role_permissions
--     is keyed on roles.id, so the two have to be bridged for RLS to work)
INSERT INTO user_roles (user_id, role_id, company_id)
SELECT p.id, r.id, p.company_id
FROM profiles p
JOIN roles r ON r.company_id = p.company_id AND lower(r.name) = lower(p.role)
WHERE p.company_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM user_roles ur WHERE ur.user_id = p.id AND ur.company_id = p.company_id
  );

-- 8.3 ADMIN: every permission
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE lower(r.name) = 'admin'
  AND NOT EXISTS (
      SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- 8.4 MANAGER / ACCOUNTANT / VIEWER: starter permission sets
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
