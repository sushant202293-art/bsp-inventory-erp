// Translates the database's `permissions` rows into the permission strings the
// UI actually asks about.
//
// Why this exists
// ---------------
// The `permissions` table was seeded with a different vocabulary than the app
// uses. It stores `create`/`update`, while `PermissionContext.canCreate()` and
// `canEdit()` both check `:<action>` `:write`, and it stores `backups` /
// `payments_received` / `payments_made` where the menu asks for `backup` /
// `payments`. Reading those rows straight through therefore produced permission
// sets that matched nothing: `canCreate()` and `canEdit()` were permanently
// false, which hid every "New" button and made `CustomerFormPage` /
// `SupplierFormPage` bail out before rendering.
//
// This module is the single place that reconciles the two, so the rest of the
// app can keep using one vocabulary.

import type { Permission } from '@/lib/permissions';

/** A `permissions` row as selected by `PermissionContext`. */
export interface DbPermissionRow {
  module: string;
  action: string;
}

/**
 * Database action -> app action. `create` and `update` both mean "may change
 * this module", which the app spells `write`.
 */
const ACTION_MAP: Record<string, string[]> = {
  read: ['read'],
  create: ['write'],
  update: ['write'],
  delete: ['delete'],
  approve: ['approve'],
  adjust: ['adjust', 'write'],
  transfer: ['write'],
  manage: ['manage', 'write'],
  import: ['import'],
  export: ['export'],
};

/**
 * Database module -> app module(s). A single database module can back more than
 * one app module (`payments_received` + `payments_made` together are the app's
 * `payments`), so every value is a list.
 */
const MODULE_MAP: Record<string, string[]> = {
  backups: ['backup'],
  backup: ['backup'],
  payments_received: ['payments'],
  payments_made: ['payments'],
  payments: ['payments'],
  invoices: ['invoices'],
  units: ['units'],
  ledgers: ['ledgers'],
  reports: ['reports'],
};

/**
 * Modules whose rows should not be turned into app permissions.
 * `audit_logs` and `roles` have no counterpart in the app's vocabulary, and
 * `dashboard` has only a `read` action in the database.
 */
const IGNORED_MODULES = new Set(['audit_logs', 'roles', 'warehouses']);

function expand(module: string): string[] {
  return MODULE_MAP[module] ?? [module];
}

/**
 * Converts one database row into every app permission it implies. Returns an
 * empty array for rows with no app equivalent so callers can ignore them.
 */
export function translatePermission(row: DbPermissionRow): Permission[] {
  const module = row.module?.trim().toLowerCase();
  const action = row.action?.trim().toLowerCase();
  if (!module || !action) return [];
  if (IGNORED_MODULES.has(module)) return [];

  const actions = ACTION_MAP[action];
  if (!actions) return [];

  const out: Permission[] = [];
  for (const m of expand(module)) {
    for (const a of actions) {
      const permission = `${m}:${a}` as Permission;
      if (!out.includes(permission)) out.push(permission);
    }
  }
  return out;
}

/**
 * Translates a whole set of database rows, de-duplicated.
 */
export function translatePermissions(rows: DbPermissionRow[]): Permission[] {
  const out: Permission[] = [];
  for (const row of rows) {
    for (const permission of translatePermission(row)) {
      if (!out.includes(permission)) out.push(permission);
    }
  }
  return out;
}

/**
 * Combines the database grants with the static role matrix.
 *
 * The database is authoritative for anything it actually defines, but it is not
 * a superset: it has no `export`/`import` actions at all, and it has no rows for
 * the `units`, `ledgers` or `purchases` modules. Treating it as the whole truth
 * is what hid those capabilities, so the static matrix for the user's role acts
 * as the baseline and the database rows are added on top.
 *
 * This is safe here because the application never writes to `role_permissions`
 * — it only reads them — so there is no editor whose choices could be undone.
 */
export function resolvePermissions(
  dbRows: DbPermissionRow[],
  baseline: Permission[],
): Permission[] {
  const out = [...baseline];
  for (const permission of translatePermissions(dbRows)) {
    if (!out.includes(permission)) out.push(permission);
  }
  return out;
}
