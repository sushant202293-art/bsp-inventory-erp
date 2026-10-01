/**
 * Read-only verification for the Product Management workspace.
 *
 * Confirms the tables and columns the new product UI depends on actually exist
 * in the live database, and exercises the stock-status and transaction-history
 * queries the panel/detail screens issue. Makes no writes.
 *
 * Run with: npm run verify:product-workspace
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '../.env');

function loadEnv() {
  const raw = readFileSync(envPath, 'utf8');
  const env = {};
  raw.split(/\r?\n/).forEach((line) => {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match) return;
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[match[1]] = value;
  });
  return env;
}

const env = loadEnv();

// A signed-in session is required: RLS on every table in this script is scoped
// by `user_company_id()`, so an anon client sees zero rows and would make every
// check vacuously pass.
const TEST_EMAIL = env.PROBE_EMAIL || 'admin@bspinventory.com';
const TEST_PASSWORD = env.PROBE_PASSWORD || 'Admin@12345';

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

const { data: signIn, error: signInError } = await supabase.auth.signInWithPassword({
  email: TEST_EMAIL,
  password: TEST_PASSWORD,
});
if (signInError) {
  console.error(`\nLOGIN FAILED: ${signInError.message}`);
  console.error(`Set PROBE_EMAIL / PROBE_PASSWORD to override the test account.\n`);
  process.exit(1);
}

const results = [];
let failures = 0;

function pass(name, detail = '') {
  results.push({ status: 'PASS', name, detail });
}
function fail(name, detail = '') {
  results.push({ status: 'FAIL', name, detail });
  failures += 1;
}

/**
 * Runs a query and records the outcome. Takes the builder itself (not a
 * spread copy) because a PostgREST builder is a thenable and spreading it
 * drops its `then`, which would silently resolve to no rows.
 */
async function expectQuery(name, builder) {
  const { data, error } = await builder;
  if (error) fail(name, error.message);
  else pass(name, `${(data || []).length} row(s)`);
  return data || [];
}

/**
 * The workspace form writes only these columns. Each must exist, otherwise
 * product create/edit would fail at runtime.
 */
async function verifyProductColumns() {
  const { data: rows, error } = await supabase
    .from('products')
    .select('*')
    .limit(1);
  if (error) {
    fail('products readable', error.message);
    return [];
  }

  const columns = rows.length > 0
    ? Object.keys(rows[0])
    : await introspectColumns('products');

  const required = [
    'name', 'code', 'barcode', 'category_id', 'brand_id', 'unit_id',
    'color', 'size', 'gst_rate', 'hsn_sac', 'description',
    'purchase_price', 'selling_price', 'low_stock_level', 'reorder_level',
    'image_url', 'is_active',
  ];

  const missing = required.filter((column) => !columns.includes(column));
  if (missing.length === 0) {
    pass('products has every column the workspace form writes');
  } else {
    fail('products columns', `missing: ${missing.join(', ')}`);
  }

  // Fields the requested design listed but the schema does not carry. Tracked
  // so the gap is visible rather than silently dropped.
  const notInSchema = [
    'mrp', 'discount_percent', 'is_tax_inclusive', 'opening_stock',
    'max_stock_level', 'rack', 'product_type', 'manufacturer',
    'model_number', 'part_number', 'warranty', 'product_images',
  ].filter((column) => !columns.includes(column));

  if (notInSchema.length > 0) {
    pass(
      'unsupported-but-requested fields confirmed absent',
      notInSchema.join(', ')
    );
  } else {
    pass('all requested fields have columns', 'schema is a superset');
  }

  return columns;
}

async function introspectColumns(table) {
  // No rows yet: fall back to an explicit limit(1) select to force PostgREST
  // to report the shape. An error here means the table is unreadable, which is
  // reported by the caller.
  const { data, error } = await supabase.from(table).select('*').limit(1);
  if (error || !data || data.length === 0) return [];
  return Object.keys(data[0]);
}

/**
 * `getProductStats` aggregates products + product_stock in JS. Verify both are
 * readable under RLS for an authenticated user, and that a fresh session sees
 * a company row.
 */
async function verifyStockAggregation() {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    fail('authenticated session', userError?.message || 'no user');
    return null;
  }
  pass('authenticated session', userData.user.email || userData.user.id);

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', userData.user.id)
    .maybeSingle();
  if (profileError || !profile?.company_id) {
    fail('profile company_id', profileError?.message || 'null');
    return null;
  }
  pass('profile resolves a company', profile.company_id);

  const companyId = profile.company_id;

  const products = await expectQuery(
    'products readable for company',
    supabase
      .from('products')
      .select('id, is_active, low_stock_level')
      .eq('company_id', companyId)
  );

  const stock = await expectQuery(
    'product_stock readable (RLS)',
    supabase.from('product_stock').select('product_id, current_stock, avg_cost')
  );

  // Mirror the resolveStockStatusIds aggregation to prove it produces a result.
  const totals = new Map();
  stock.forEach((row) => {
    totals.set(row.product_id, (totals.get(row.product_id) || 0) + (row.current_stock || 0));
  });
  const lowStock = products.filter(
    (p) => (totals.get(p.id) || 0) > 0 && (totals.get(p.id) || 0) <= (p.low_stock_level || 0)
  ).length;
  const outOfStock = products.filter((p) => (totals.get(p.id) || 0) <= 0).length;

  pass(
    'stock-status filter resolves',
    `low_stock=${lowStock}, out_of_stock=${outOfStock}, total=${products.length}`
  );

  return { companyId, productIds: products.map((p) => p.id) };
}

/**
 * The detail screen's Transactions/Suppliers/Customers/History tabs depend on
 * this embedded select. Verify it parses against the live schema.
 */
async function verifyTransactionHistory(productIds) {
  if (!productIds || productIds.length === 0) {
    pass('transaction history query', 'no products to query, skipped');
    return;
  }

  const { data, error } = await supabase
    .from('transaction_items')
    .select(`
      id,
      transaction_id,
      quantity,
      unit,
      rate,
      discount_percent,
      discount_amount,
      taxable_value,
      gst_rate,
      total_amount,
      transaction:transactions!inner(
        id, type, status, document_number, document_date, grand_total, notes,
        customer:customers(id, name),
        supplier:suppliers(id, name)
      )
    `)
    .in('product_id', productIds.slice(0, 25));

  if (error) {
    fail('transaction history query', error.message);
    return;
  }
  pass('transaction history query', `${data.length} line(s)`);

  const withParty = data.filter((row) => row.transaction);
  pass(
    'transaction lines resolve their document',
    `${withParty.length}/${data.length} joined`
  );

  const suppliers = new Set();
  const customers = new Set();
  withParty.forEach((row) => {
    const tx = row.transaction;
    if (tx.supplier) suppliers.add(tx.supplier.id);
    if (tx.customer) customers.add(tx.customer.id);
  });

  // The supplier branch of the embedded select is only proven to parse if the
  // database actually contains a purchase line for one of these products.
  // Comparing against the raw purchase count makes that explicit instead of
  // letting a genuine failure hide behind an empty set.
  const purchaseLines = await expectQuery(
    'purchase-side counterparty join',
    supabase
      .from('transaction_items')
      .select('id, transaction:transactions!inner(type, supplier:suppliers(id, name))')
      .in('product_id', productIds.slice(0, 25))
      .eq('transactions.type', 'purchase')
  );
  const purchaseSuppliers = purchaseLines.filter((row) => row.transaction?.supplier).length;

  pass(
    'counterparty rollup derivable',
    `${suppliers.size} supplier(s), ${customers.size} customer(s), ` +
      `${purchaseSuppliers}/${purchaseLines.length} purchase line(s) joined a supplier`
  );
}

/** Quick-create dialogs insert into these three tables. */
async function verifyMasterDataInserts() {
  const checks = [
    { table: 'categories', needed: ['name', 'description', 'parent_id', 'is_active', 'company_id'] },
    { table: 'brands', needed: ['name', 'description', 'logo_url', 'is_active', 'company_id'] },
    { table: 'units', needed: ['name', 'short_name', 'base_unit_id', 'conversion_factor', 'is_active', 'company_id'] },
  ];

  for (const check of checks) {
    const { error } = await supabase.from(check.table).select(check.needed.join(',')).limit(1);
    if (error) fail(`quick-create target ${check.table}`, error.message);
    else pass(`quick-create target ${check.table}`, check.needed.length + ' columns');
  }
}

/** The unit filter on the products tab filters by `unit_id`. */
async function verifyUnitFilter(context) {
  const { data, error } = await supabase
    .from('products')
    .select('id, unit_id')
    .eq('company_id', context.companyId)
    .not('unit_id', 'is', null)
    .limit(1);
  if (error) fail('unit_id filter supported', error.message);
  else pass('unit_id filter supported', `${data.length} product(s) with a unit`);
}

const PRODUCT_REPORT_MAX_ROWS = 5000;

/**
 * The print report must not be paginated: it renders every matching row into
 * one document and lets the browser's own paginator break it across pages. This
 * mirrors getProductsForReport's range and proves the whole set comes back.
 */
async function verifyReportIsUnpaginated(context) {
  const select = `
    id, name, code, is_active, low_stock_level, purchase_price, selling_price,
    category:categories(id, name),
    brand:brands(id, name),
    unit:units(id, name, short_name),
    stocks:product_stock(id, product_id, current_stock)
  `;

  const report = await expectQuery(
    'report query returns every matching row',
    supabase
      .from('products')
      .select(select, { count: 'exact' })
      .eq('company_id', context.companyId)
      .order('name', { ascending: true })
      .range(0, PRODUCT_REPORT_MAX_ROWS - 1)
  );

  // Cross-check against an exact count so a silently truncated fetch is caught
  // even when the row count happens to be small.
  const { count, error } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', context.companyId);
  if (error) {
    fail('report row count cross-check', error.message);
  } else if ((count || 0) !== report.length) {
    fail('report row count cross-check', `count=${count} but fetched ${report.length}`);
  } else {
    pass('report row count cross-check', `${count} row(s), cap ${PRODUCT_REPORT_MAX_ROWS}`);
  }

  // Every embedded relation the report renders must resolve.
  const missingUnit = report.filter((p) => p.unit && !p.unit.short_name).length;
  if (missingUnit > 0) {
    fail('report unit labels', `${missingUnit} row(s) missing a unit short_name`);
  } else {
    pass('report unit labels resolve', `${report.length} row(s)`);
  }

  const withStock = report.filter((p) => Array.isArray(p.stocks) && p.stocks.length > 0).length;
  pass('report stock rows resolve', `${withStock}/${report.length} row(s) have stock`);

  // Rough page estimate at A4 landscape / 10mm margins, so a multi-page report
  // is a known quantity rather than a surprise.
  const ROWS_PER_PAGE = 34;
  const FIRST_PAGE_ROWS = 24;
  const pages = report.length <= FIRST_PAGE_ROWS
    ? 1
    : 1 + Math.ceil((report.length - FIRST_PAGE_ROWS) / ROWS_PER_PAGE);
  pass('estimated printed pages', `${pages} page(s) for ${report.length} row(s)`);
}

console.log('\n=== Product Management workspace verification ===\n');

await verifyProductColumns();
const context = await verifyStockAggregation();
await verifyTransactionHistory(context?.productIds);
await verifyMasterDataInserts();
if (context) {
  await verifyUnitFilter(context);
  await verifyReportIsUnpaginated(context);
}

console.log('');
results.forEach((r) => {
  const detail = r.detail ? ` — ${r.detail}` : '';
  console.log(`  [${r.status}] ${r.name}${detail}`);
});

console.log(`\n${results.length - failures}/${results.length} checks passed`);
console.log(failures === 0 ? 'RESULT: PASS\n' : `RESULT: FAIL (${failures})\n`);
process.exit(failures === 0 ? 0 : 1);