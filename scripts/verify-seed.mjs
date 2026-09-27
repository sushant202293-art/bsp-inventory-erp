// Validates the GST arithmetic in supabase/seed/demo_data.sql without a
// database, by parsing the transaction_items and transactions VALUES blocks.
// Run: node scripts/verify-seed.mjs
import { readFileSync } from 'node:fs';

const sql = readFileSync('supabase/seed/demo_data.sql', 'utf8');
const r2 = (n) => Math.round(n * 100) / 100;
let failures = 0;
const fail = (m) => { console.log('  FAIL ' + m); failures++; };
const ok = (m) => console.log('  ok   ' + m);
const check = (label, fn) => { const before = failures; fn(); if (failures === before) ok(label); };

// ---- parse line items -------------------------------------------------
const itemsBlock = /FROM \(VALUES([\s\S]*?)\) AS v \(/.exec(sql);
if (!itemsBlock) { console.log('FATAL: could not locate the transaction_items VALUES block'); process.exit(1); }

const rowRe = /\(\s*'(\d{8}-[\d-]+)'::uuid,\s*'(\d{8}-[\d-]+)'::uuid,\s*'([^']*)',\s*'([^']*)',\s*'([^']*)',\s*([\d.]+)::numeric,\s*'([^']*)',\s*([\d.]+),\s*([\d.]+),\s*([\d.]+),\s*([\d.]+),\s*([\d.]+),\s*([\d.]+),\s*([\d.]+),\s*([\d.]+),\s*([\d.]+),\s*(\d+),\s*'([^']*)'\s*\)/g;

const items = [];
let m;
while ((m = rowRe.exec(itemsBlock[1])) !== null) {
  items.push({
    txn: m[1], name: m[3], qty: +m[6], rate: +m[8],
    discPct: +m[9], discAmt: +m[10], taxable: +m[11], gst: +m[12],
    cgst: +m[13], sgst: +m[14], igst: +m[15], total: +m[16], hsn: m[18],
  });
}
console.log(`parsed ${items.length} line items\n`);

if (items.length === 0) { console.log('FATAL: row parser matched nothing'); process.exit(1); }

// ---- per-line checks --------------------------------------------------
console.log('per-line GST:');
check('taxable, CGST=SGST, IGST exclusivity, line totals and HSN all correct', () => {
  for (const it of items) {
    const gross = r2(it.qty * it.rate);
    const disc = it.discPct > 0 ? r2((gross * it.discPct) / 100) : it.discAmt;
    const taxable = r2(gross - disc);

    if (taxable !== it.taxable) fail(`${it.name}: taxable ${it.taxable} != computed ${taxable}`);
    if (disc !== it.discAmt) fail(`${it.name}: discount ${it.discAmt} != computed ${disc}`);

    const wantTax = r2((it.taxable * it.gst) / 100);
    if (r2(it.cgst + it.sgst + it.igst) !== wantTax)
      fail(`${it.name}: tax ${r2(it.cgst + it.sgst + it.igst)} != taxable*rate ${wantTax}`);

    const isIntra = it.cgst > 0 || it.sgst > 0;
    if (isIntra) {
      if (it.cgst !== it.sgst) fail(`${it.name}: intra-state CGST ${it.cgst} != SGST ${it.sgst}`);
      if (it.igst !== 0) fail(`${it.name}: intra-state must have no IGST (got ${it.igst})`);
    } else if (it.cgst !== 0 || it.sgst !== 0) {
      fail(`${it.name}: inter-state must have no CGST/SGST`);
    }
    if (r2(it.taxable + it.cgst + it.sgst + it.igst) !== it.total)
      fail(`${it.name}: line total ${it.total} != ${r2(it.taxable + it.cgst + it.sgst + it.igst)}`);
    if (!/^\d{4,8}$/.test(it.hsn)) fail(`${it.name}: implausible HSN "${it.hsn}"`);
  }
});

// ---- header vs lines --------------------------------------------------
console.log('\nheader totals vs line items:');
// Skip billing address jsonb, then the shipping address jsonb, then read the
// six money columns and the status token. Note the closing quote: jsonb
// literals end with }'::jsonb, not }::jsonb,
const hdrRe = /\('(9\d{7}-[\d-]+)',\s*'11111111[\d-]*',\s*'(\w+)',\s*'([^']+)',\s*'([\d-]+)',[\s\S]*?\}'::jsonb,\s*'[\s\S]*?'::jsonb,\s*([\d.]+),\s*([\d.]+),\s*([\d.]+),\s*([\d.]+),\s*([\d.]+),\s*([\d.]+),\s*'(\w+)'/g;

const headers = [];
while ((m = hdrRe.exec(sql)) !== null) {
  headers.push({
    txn: m[1], type: m[2], doc: m[3], date: m[4],
    subtotal: +m[5], discount: +m[6], tax: +m[7], roundOff: +m[8],
    grand: +m[9], paid: +m[10], status: m[11],
  });
}

// A zero-length parse must never be reported as a pass.
if (headers.length === 0) { console.log('FATAL: header parser matched nothing'); process.exit(1); }

const byTxn = new Map();
for (const it of items) {
  if (!byTxn.has(it.txn)) byTxn.set(it.txn, []);
  byTxn.get(it.txn).push(it);
}

check(`${headers.length} headers reconcile with their lines; status matches amount_paid`, () => {
  for (const h of headers) {
    const lines = byTxn.get(h.txn) || [];
    if (!lines.length) { fail(`${h.doc}: no line items parsed`); continue; }

    const sumSub = r2(lines.reduce((s, l) => s + r2(l.qty * l.rate), 0));
    const sumDisc = r2(lines.reduce((s, l) => s + l.discAmt, 0));
    const sumTax = r2(lines.reduce((s, l) => s + l.cgst + l.sgst + l.igst, 0));
    const sumTotal = r2(lines.reduce((s, l) => s + l.total, 0));

    if (sumSub !== h.subtotal) fail(`${h.doc}: subtotal ${h.subtotal} != lines ${sumSub}`);
    if (sumDisc !== h.discount) fail(`${h.doc}: discount ${h.discount} != lines ${sumDisc}`);
    if (sumTax !== h.tax) fail(`${h.doc}: tax ${h.tax} != lines ${sumTax}`);
    if (sumTotal !== h.grand) fail(`${h.doc}: grand_total ${h.grand} != lines ${sumTotal}`);
    if (r2(h.subtotal - h.discount + h.tax + h.roundOff) !== h.grand)
      fail(`${h.doc}: header arithmetic ${h.subtotal} - ${h.discount} + ${h.tax} != ${h.grand}`);
    if (h.paid > h.grand) fail(`${h.doc}: amount_paid ${h.paid} exceeds grand_total ${h.grand}`);

    // A posted (confirmed+) sale/purchase should reflect its payment.
    if (['paid', 'partial'].includes(h.status)) {
      const wantPaid = h.status === 'paid' ? h.grand : h.grand - h.paid;
      if (h.paid <= 0) fail(`${h.doc}: status ${h.status} but amount_paid is 0`);
      if (h.status === 'paid' && h.paid !== h.grand)
        fail(`${h.doc}: status paid but amount_paid ${h.paid} != grand_total ${h.grand}`);
      if (wantPaid <= 0) fail(`${h.doc}: ${h.status} with no outstanding balance`);
    }
  }
});

if (headers.length !== byTxn.size)
  fail(`header count ${headers.length} != transaction count with lines ${byTxn.size}`);

// ---- state codes and GSTINs ------------------------------------------
console.log('\nstate codes and GSTIN prefixes:');
const COMPANY_STATE = 'Odisha';
const COMPANY_CODE = '21';

// A GSTIN is 15 chars: 2-digit state code, 10-char PAN (5 letters, 4 digits,
// 1 letter), 1 entity digit, the literal 'Z', then a checksum character.
const GSTIN_SRC = '\\d{2}[A-Z]{5}\\d{4}[A-Z]\\dZ[A-Z0-9]';
const GSTIN_RE = new RegExp(`'(${GSTIN_SRC})'`, 'g');

check(`company is ${COMPANY_STATE} (${COMPANY_CODE}) and its GSTIN starts with ${COMPANY_CODE}`, () => {
  const c = /'BSP Traders',\s*'([\dA-Z]+)',\s*'([A-Z0-9]+)',\s*'([^']+)',\s*'(\d+)'/.exec(sql);
  if (!c) { fail('could not parse the company row'); return; }
  if (c[4] !== COMPANY_CODE) fail(`company state_code "${c[4]}" != ${COMPANY_CODE}`);
  if (c[3] !== COMPANY_STATE) fail(`company state "${c[3]}" != ${COMPANY_STATE}`);
  if (!c[1].startsWith(COMPANY_CODE)) fail(`company GSTIN ${c[1]} does not start with ${COMPANY_CODE}`);
});

check('every GSTIN in the file is a well-formed 15-character GSTIN', () => {
  const found = [...new Set([...sql.matchAll(new RegExp(GSTIN_SRC, 'g'))].map((x) => x[0]))];
  // any 15-char-looking token that is NOT a valid GSTIN
  const loose = [...new Set([...sql.matchAll(/'\d{2}[A-Z0-9]{10,16}'/g)].map((x) => x[0].slice(1, -1)))];
  for (const l of loose) if (!new RegExp(`^${GSTIN_SRC}$`).test(l)) fail(`malformed GSTIN: ${l}`);
  if (loose.length < 8) fail(`only found ${loose.length} GSTIN-like tokens, expected at least 8`);
});

check('every party GSTIN prefix matches that party\'s state code', () => {
  const codes = { Odisha: '21', 'West Bengal': '19', Maharashtra: '27', Delhi: '07', Gujarat: '24' };

  const cust = new RegExp(`'CUS-\\d+',\\s*'(${GSTIN_SRC})',[\\s\\S]*?"state":"([^"]+)"`, 'g');
  let n = 0;
  while ((m = cust.exec(sql)) !== null) {
    n++;
    const want = codes[m[2]];
    if (!want) { fail(`customer ${m[1]}: unknown state "${m[2]}"`); continue; }
    if (!m[1].startsWith(want)) fail(`customer GSTIN ${m[1]} does not start with ${want} (${m[2]})`);
  }
  if (n !== 4) fail(`parsed ${n} customers, expected 4`);

  const sup = new RegExp(`'SUP-\\d+',\\s*'(${GSTIN_SRC})',[\\s\\S]*?"state":"([^"]+)"`, 'g');
  n = 0;
  while ((m = sup.exec(sql)) !== null) {
    n++;
    const want = codes[m[2]];
    if (!want) { fail(`supplier ${m[1]}: unknown state "${m[2]}"`); continue; }
    if (!m[1].startsWith(want)) fail(`supplier GSTIN ${m[1]} does not start with ${want} (${m[2]})`);
  }
  if (n !== 3) fail(`parsed ${n} suppliers, expected 3`);
});

check('document numbers use fiscal year 2026-27 and dates fall in 2026', () => {
  for (const h of headers) {
    if (!/\/2026-27\/\d{4}$/.test(h.doc)) fail(`${h.doc}: not in fiscal year 2026-27`);
    if (h.date < '2026-01-01' || h.date > '2026-12-31') fail(`${h.doc}: date ${h.date} outside 2026`);
  }
});

console.log(failures === 0
  ? '\nPASS: seed data is internally consistent'
  : `\n${failures} PROBLEM(S) FOUND`);
process.exit(failures === 0 ? 0 : 1);
