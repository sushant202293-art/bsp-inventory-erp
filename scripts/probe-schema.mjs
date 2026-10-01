// Validates every table + RPC the app actually calls against the live project.
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
const { access_token: TOKEN } = await login.json();
const H = { apikey: KEY, Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' };

const tables = [
  'audit_logs', 'backup_logs', 'brands', 'categories', 'companies', 'company_settings',
  'customer_ledger', 'customers', 'notifications', 'payments_made', 'payments_received',
  'product_stock', 'products', 'profiles', 'role_permissions', 'stock_movements',
  'supplier_ledger', 'suppliers', 'transaction_items', 'transactions', 'units',
  'user_roles', 'warehouses', 'permissions', 'roles',
];

let bad = 0;
console.log('TABLES');
for (const t of tables) {
  const r = await fetch(`${URL}/rest/v1/${t}?select=*&limit=1`, { headers: H });
  const body = await r.text();
  if (r.status === 404) { console.log(`  MISSING  ${t}`); bad++; }
  else if (!r.ok) { console.log(`  ERROR    ${t} -> ${r.status} ${body.slice(0, 160)}`); bad++; }
  else {
    let n = '?';
    try { n = (JSON.parse(body) || []).length + ' row(s)'; } catch {}
    console.log(`  ok       ${t.padEnd(20)} ${n}`);
  }
}

// Probing an RPC requires its real parameter names: PostgREST resolves overloads
// from the supplied keys, so an empty body yields PGRST202 (404) even for a
// function that exists. A wrong-argument error still proves the function is there.
console.log('\nRPC FUNCTIONS');
const rpcs = [
  ['post_document_stock', { p_transaction_id: '00000000-0000-0000-0000-000000000000' }],
  ['cancel_document_stock', { p_transaction_id: '00000000-0000-0000-0000-000000000000' }],
  ['next_document_number', {
    p_company_id: '00000000-0000-0000-0000-000000000000',
    p_type: 'quotation',
  }],
];
for (const [fn, args] of rpcs) {
  const r = await fetch(`${URL}/rest/v1/rpc/${fn}`, {
    method: 'POST', headers: H, body: JSON.stringify(args),
  });
  const body = await r.text();
  const missing = r.status === 404 && body.includes('PGRST202');
  if (missing) { console.log(`  MISSING  ${fn}`); bad++; }
  else console.log(`  ok       ${fn.padEnd(24)} ${r.status} ${body.slice(0, 110)}`);
}

console.log(bad === 0 ? '\nPASS' : `\n${bad} problem(s) found`);
process.exit(bad === 0 ? 0 : 1);
