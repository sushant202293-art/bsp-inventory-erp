import { describe, it, expect } from 'vitest';
import {
  translatePermission,
  translatePermissions,
  resolvePermissions,
} from '@/lib/permission-mapping';
import { getUserPermissions, normalizeRole, isAdminRole } from '@/lib/permissions';
import { menuConfig } from '@/config/menu.config';

// These are the exact rows the live `permissions` table is seeded with
// (supabase/migrations/001_initial_schema.sql), for one admin role.
const DB_ROWS = [
  { module: 'dashboard', action: 'read' },
  { module: 'products', action: 'create' },
  { module: 'products', action: 'read' },
  { module: 'products', action: 'update' },
  { module: 'products', action: 'delete' },
  { module: 'stock', action: 'read' },
  { module: 'stock', action: 'adjust' },
  { module: 'stock', action: 'transfer' },
  { module: 'backups', action: 'read' },
  { module: 'payments_received', action: 'read' },
  { module: 'payments_made', action: 'write' },
  { module: 'reports', action: 'sales' },
  { module: 'users', action: 'read' },
  { module: 'audit_logs', action: 'read' },
];

describe('translatePermission', () => {
  it('maps the database create/update actions onto the app\'s :write', () => {
    expect(translatePermission({ module: 'products', action: 'create' })).toEqual([
      'products:write',
    ]);
    expect(translatePermission({ module: 'products', action: 'update' })).toEqual([
      'products:write',
    ]);
  });

  it('maps create + update to a single :write', () => {
    const result = translatePermissions([
      { module: 'products', action: 'create' },
      { module: 'products', action: 'update' },
    ]);
    expect(result).toEqual(['products:write']);
  });

  it('renames the backups module to the backup module the menu uses', () => {
    expect(translatePermission({ module: 'backups', action: 'read' })).toEqual([
      'backup:read',
    ]);
  });

  it('folds both payment modules into the app\'s payments module', () => {
    const result = translatePermissions([
      { module: 'payments_received', action: 'read' },
      { module: 'payments_made', action: 'read' },
    ]);
    expect(result).toEqual(['payments:read']);
  });

  it('treats a stock adjustment as granting :write as well as :adjust', () => {
    expect(translatePermission({ module: 'stock', action: 'adjust' })).toEqual([
      'stock:adjust',
      'stock:write',
    ]);
  });

  it('ignores rows with no app equivalent', () => {
    expect(translatePermission({ module: 'audit_logs', action: 'read' })).toEqual([]);
    expect(translatePermission({ module: 'products', action: 'levitate' })).toEqual([]);
    expect(translatePermission({ module: '', action: '' })).toEqual([]);
  });
});

describe('resolvePermissions', () => {
  it('always keeps the baseline even when the database grants nothing', () => {
    const baseline = getUserPermissions('admin');
    const result = resolvePermissions([], baseline);
    expect(result).toEqual(baseline);
  });

  it('lets the database add grants the baseline does not have', () => {
    const result = resolvePermissions(
      [{ module: 'products', action: 'approve' }],
      getUserPermissions('viewer'),
    );
    expect(result).toContain('products:approve');
    expect(result).toContain('dashboard:read');
  });

  it('does not duplicate permissions present in both sources', () => {
    const result = resolvePermissions(DB_ROWS, getUserPermissions('admin'));
    expect(new Set(result).size).toBe(result.length);
  });
});

describe('normalizeRole', () => {
  it('passes through known roles', () => {
    expect(normalizeRole('admin')).toBe('admin');
    expect(normalizeRole('sales')).toBe('sales');
    expect(normalizeRole('super_admin')).toBe('super_admin');
  });

  it('is case and whitespace insensitive', () => {
    expect(normalizeRole('  Admin ')).toBe('admin');
    expect(normalizeRole('MANAGER')).toBe('manager');
  });

  it('maps legacy labels onto roles that have permissions', () => {
    expect(normalizeRole('sales_person')).toBe('sales');
    expect(normalizeRole('warehouse')).toBe('inventory');
    expect(normalizeRole('Super Admin')).toBe('super_admin');
  });

  it('falls back to viewer for unknown or empty values', () => {
    expect(normalizeRole('wizard')).toBe('viewer');
    expect(normalizeRole('')).toBe('viewer');
    expect(normalizeRole(null)).toBe('viewer');
    expect(normalizeRole(undefined)).toBe('viewer');
  });

  it('gives every selectable role a non-empty permission set', () => {
    const labels = [
      'super_admin', 'admin', 'manager', 'sales',
      'purchase', 'accounts', 'inventory', 'viewer',
    ];
    for (const label of labels) {
      const perms = getUserPermissions(normalizeRole(label));
      expect(perms.length, `role ${label} resolved to no permissions`).toBeGreaterThan(0);
    }
  });
});

describe('isAdminRole', () => {
  it('accepts the labels the admin UI offers', () => {
    expect(isAdminRole('admin')).toBe(true);
    expect(isAdminRole('super_admin')).toBe(true);
    expect(isAdminRole('owner')).toBe(true);
  });

  it('rejects non-admin roles', () => {
    expect(isAdminRole('manager')).toBe(false);
    expect(isAdminRole('viewer')).toBe(false);
    expect(isAdminRole(null)).toBe(false);
  });
});

describe('every menu module is reachable for an admin', () => {
  const modules = new Set<string>();
  for (const section of menuConfig) {
    for (const item of section.items) {
      if (item.module) modules.add(item.module);
      for (const child of item.children ?? []) {
        if (child.module) modules.add(child.module);
      }
    }
  }

  // The exact `can*()` arguments used by the pages and the sidebar. `stock` and
  // the master-data modules are read-only in the UI, so they are not expected to
  // grant :write, and :export only exists for the modules that actually export.
  const CRUD_MODULES = ['sales', 'quotations', 'purchases', 'purchase_orders', 'proforma_invoices', 'customers', 'suppliers', 'products'];
  const EXPORT_MODULES = ['customers', 'suppliers', 'products'];

  it('resolves a :read permission for every sidebar module', () => {
    const perms = resolvePermissions(DB_ROWS, getUserPermissions('admin'));
    const missing = [...modules].filter(
      (m) => !perms.includes(`${m}:read` as never),
    );
    expect(missing, `no :read permission granted for: ${missing.join(', ')}`).toEqual([]);
  });

  it('resolves :write for every module whose pages have create/edit buttons', () => {
    const perms = resolvePermissions(DB_ROWS, getUserPermissions('admin'));
    const missing = CRUD_MODULES.filter((m) => !perms.includes(`${m}:write` as never));
    expect(missing, `create/edit hidden for: ${missing.join(', ')}`).toEqual([]);
  });

  it('resolves :export for the modules that offer an export button', () => {
    const perms = resolvePermissions(DB_ROWS, getUserPermissions('admin'));
    const missing = EXPORT_MODULES.filter((m) => !perms.includes(`${m}:export` as never));
    expect(missing, `export hidden for: ${missing.join(', ')}`).toEqual([]);
  });

  it('resolves :delete for the modules that offer a delete button', () => {
    const perms = resolvePermissions(DB_ROWS, getUserPermissions('admin'));
    const missing = CRUD_MODULES.filter((m) => !perms.includes(`${m}:delete` as never));
    expect(missing, `delete hidden for: ${missing.join(', ')}`).toEqual([]);
  });
});

describe('combining database grants with the role matrix', () => {
  it('never removes a permission the baseline grants', () => {
    const baseline = getUserPermissions('viewer');
    const result = resolvePermissions(DB_ROWS, baseline);
    for (const p of baseline) expect(result).toContain(p);
  });

  it('is additive: the database can only grant more, never fewer', () => {
    // This is why PermissionContext discards the database rows outright when the
    // `user_roles` bridge no longer matches `profiles.role` — otherwise a stale
    // bridge row would keep handing the old role's grants to a downgraded user.
    const viewerBaseline = getUserPermissions('viewer');
    const withAdminRows = resolvePermissions(DB_ROWS, viewerBaseline);
    const withViewerRows = resolvePermissions(
      [{ module: 'products', action: 'read' }],
      viewerBaseline,
    );
    expect(withAdminRows.length).toBeGreaterThan(withViewerRows.length);
    expect(withAdminRows).toContain('products:write');
    expect(withViewerRows).not.toContain('products:write');
  });

  it('gives a viewer read-only access to every module it should see', () => {
    const perms = resolvePermissions(
      [{ module: 'products', action: 'read' }],
      getUserPermissions('viewer'),
    );
    for (const m of ['products', 'customers', 'suppliers', 'sales', 'stock', 'reports', 'ledgers']) {
      expect(perms, `${m}:read`).toContain(`${m}:read` as never);
    }
    expect(perms).not.toContain('users:write');
    expect(perms).not.toContain('settings:write');
  });
});
