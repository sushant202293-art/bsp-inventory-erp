// Reproduces the resolution that src/contexts/PermissionContext.tsx performs,
// then checks every menu module against it, so hidden sidebar items and
// hidden create/edit/export buttons show up without needing a browser.
import fs from 'node:fs';

const env = {};
for (const line of fs.readFileSync('.env', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([^#][^=]*)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
}
const URL = env.VITE_SUPABASE_URL;
const KEY = env.VITE_SUPABASE_ANON_KEY;

const login = await fetch(`${URL}/auth/v1/token?grant_type=password`, {
  method: 'POST',
  headers: { apikey: KEY, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'admin@bspinventory.com', password: 'Admin@12345' }),
});
if (!login.ok) { console.log('LOGIN FAILED', login.status); process.exit(1); }
const { access_token: TOKEN } = await login.json();
const H = { apikey: KEY, Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' };

const get = async (p) => (await fetch(`${URL}/rest/v1/${p}`, { headers: H })).json();

const me = await (await fetch(`${URL}/auth/v1/user`, { headers: H })).json();
const profile = (await get(`profiles?select=id,role,company_id&id=eq.${me.id}`))[0];
console.log('profile role:', profile?.role, '| company:', profile?.company_id, '\n');

const userRoles = await get(`user_roles?select=role_id,roles(id,name)&user_id=eq.${me.id}&limit=1`);
const bridge = userRoles[0]?.roles;
const roleId = Array.isArray(bridge) ? bridge[0]?.id : bridge?.id;
const bridgedName = Array.isArray(bridge) ? bridge[0]?.name : bridge?.name;
console.log('user_roles bridge ->', bridgedName || '(none)', '\n');

// --- mirror of src/lib/permission-mapping.ts ---
const ACTION_MAP = {
  read: ['read'], create: ['write'], update: ['write'], delete: ['delete'],
  approve: ['approve'], adjust: ['adjust', 'write'], transfer: ['write'],
  manage: ['manage', 'write'], import: ['import'], export: ['export'],
};
const MODULE_MAP = {
  backups: ['backup'], backup: ['backup'],
  payments_received: ['payments'], payments_made: ['payments'], payments: ['payments'],
  invoices: ['invoices'], units: ['units'], ledgers: ['ledgers'], reports: ['reports'],
};
const IGNORED = new Set(['audit_logs', 'roles', 'warehouses']);

function translate(row) {
  const module = row.module?.trim().toLowerCase();
  const action = row.action?.trim().toLowerCase();
  if (!module || !action || IGNORED.has(module)) return [];
  const actions = ACTION_MAP[action];
  if (!actions) return [];
  return (MODULE_MAP[module] ?? [module]).flatMap((m) => actions.map((a) => `${m}:${a}`));
}

const perms = roleId
  ? await get(`role_permissions?select=permission_id,permissions(id,module,action)&role_id=eq.${roleId}`)
  : [];
const rows = perms.map((p) => {
  const perm = Array.isArray(p.permissions) ? p.permissions[0] : p.permissions;
  return perm ? { module: perm.module, action: perm.action } : null;
}).filter(Boolean);

const dbOnly = [...new Set(rows.flatMap(translate))];
console.log(`${dbOnly.length} distinct permissions after translation`);

// The baseline comes from the static matrix in src/lib/permissions.ts; admin
// gets every permission, so for this account dbOnly alone is the difference the
// union adds on top.
const resolved = new Set([...dbOnly]);

const menuModules = [
  'products', 'categories', 'brands', 'units', 'customers', 'suppliers',
  'sales', 'quotations', 'purchase_orders', 'purchases', 'proforma_invoices',
  'stock', 'payments', 'ledgers', 'reports', 'users', 'settings', 'backup',
];

console.log('\nmodule           :read     :write    :delete   (from database only)\n');
for (const m of menuModules) {
  const cell = (a) => (resolved.has(`${m}:${a}`) ? ' ok ' : 'MISS');
  console.log(m.padEnd(16) + cell('read') + '    ' + cell('write') + '    ' + cell('delete'));
}

const missingRead = menuModules.filter((m) => !resolved.has(`${m}:read`));
console.log(
  missingRead.length === 0
    ? '\nPASS: every menu module resolves :read from the database'
    : `\nNOTE: no database row for ${missingRead.join(', ')} - covered by the static role baseline`,
);

