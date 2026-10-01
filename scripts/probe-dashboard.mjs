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
if (!login.ok) { console.log('LOGIN FAILED', login.status, await login.text()); process.exit(1); }
const { access_token: TOKEN } = await login.json();
console.log('login OK\n');

const H = { apikey: KEY, Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' };
const CO = '11111111-1111-1111-1111-111111111111';
const FROM = '2000-01-01', TO = '2030-12-31';

async function q(label, table, params = {}) {
  const qs = new URLSearchParams(params).toString();
  const r = await fetch(`${URL}/rest/v1/${table}${qs ? `?${qs}` : ''}`, { headers: H });
  const body = await r.text();
  let summary;
  try {
    const j = JSON.parse(body);
    summary = Array.isArray(j) ? `${j.length} row(s)` : JSON.stringify(j).slice(0, 300);
  } catch { summary = body.slice(0, 300); }
  console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${label}`);
  if (!r.ok) console.log(`      -> ${r.status} ${summary}`);
  else console.log(`      -> ${summary}`);
  return r.ok;
}

console.log('--- profile / company resolution ---');
await q('profiles.company_id (getCompanyId)', 'profiles', { select: 'company_id', id: 'eq.' + (await (async () => {
  const r = await fetch(`${URL}/auth/v1/user`, { headers: H }); const j = await r.json(); return j.id;
})()) });

console.log('\n--- dashboard.service.ts calls ---');
await q('1 getSalesSummary -> transactions', 'transactions', { select: 'grand_total, document_date', company_id: `eq.${CO}`, type: 'eq.sale', status: 'neq.cancelled' });
await q('2 getPurchaseSummary -> transactions', 'transactions', { select: 'grand_total, document_date', company_id: `eq.${CO}`, type: 'eq.purchase', status: 'neq.cancelled' });
await q('3a getStockSummary -> products', 'products', { select: 'id, low_stock_level', company_id: `eq.${CO}`, is_active: 'eq.true' });
await q('3b getStockSummary -> product_stock (VIEW)', 'product_stock', { select: 'product_id, current_stock, avg_cost' });
await q('3c getStockSummary -> warehouses', 'warehouses', { select: 'id', company_id: `eq.${CO}`, is_active: 'eq.true' });
await q('4 getLowStockItems -> embedded embeds', 'products', { select: 'id, name, code, low_stock_level, category:categories(name), brand:brands(name), stocks:product_stock(current_stock)', company_id: `eq.${CO}`, is_active: 'eq.true' });
await q('5 getFastMovingItems -> transaction_items !inner', 'transaction_items', { select: 'product_id, product_name, product_code, quantity, total_amount, transaction:transactions!inner(company_id, type, document_date, status)', 'transaction.company_id': `eq.${CO}`, 'transaction.type': 'eq.sale', 'transaction.status': 'neq.cancelled', 'transaction.document_date': `gte.${FROM}`, 'transaction.document_date': `lte.${TO}` });
await q('6a getCustomerOutstanding -> customers', 'customers', { select: 'id, name, credit_limit, opening_balance', company_id: `eq.${CO}`, is_active: 'eq.true' });
await q('6b getCustomerOutstanding -> customer_ledger (VIEW)', 'customer_ledger', { select: 'debit, credit' });
await q('7 getRecentActivity -> transactions + embeds', 'transactions', { select: 'id, document_number, document_date, type, grand_total, status, customer:customers(name), supplier:suppliers(name)', company_id: `eq.${CO}`, status: 'neq.cancelled', order: 'created_at.desc', limit: '10' });
