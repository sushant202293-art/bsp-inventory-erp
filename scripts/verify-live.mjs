// Confirms the schema is live in Supabase. Uses only the anon key, so RLS
// hides the demo rows and successful tables return an empty array. The point
// is the status code: 404 = table missing, anything else = table exists.
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync('.env', 'utf8')
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((l) => l.trim() && !l.trim().startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')];
    }),
);

const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.log('FATAL: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY missing from .env');
  process.exit(1);
}

const tables = [
  'companies', 'profiles', 'company_settings', 'units', 'categories', 'brands',
  'warehouses', 'products', 'product_stock', 'customers', 'suppliers',
  'transactions', 'transaction_items', 'payments_received', 'payments_made',
  'customer_ledger', 'supplier_ledger', 'stock_movements', 'roles',
  'audit_logs', 'notifications',
];

const headers = { apikey: key, Authorization: `Bearer ${key}` };
let missing = 0;

console.log(`probing ${tables.length} tables on ${url}\n`);
for (const t of tables) {
  const res = await fetch(`${url}/rest/v1/${t}?select=*&limit=1`, { headers });
  if (res.status === 404) {
    console.log(`  MISSING  ${t}`);
    missing++;
  } else {
    const body = await res.text();
    const note = res.ok
      ? (body === '[]' ? 'exists (rows hidden by RLS)' : 'exists')
      : `status ${res.status}`;
    console.log(`  ok       ${t.padEnd(22)} ${note}`);
  }
}

console.log(
  missing === 0
    ? '\nPASS: every expected table exists'
    : `\n${missing} table(s) still missing - re-run supabase/install.sql`,
);
process.exit(missing === 0 ? 0 : 1);
