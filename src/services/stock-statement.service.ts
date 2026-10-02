import { supabase } from '@/lib/supabase';

// ============================================================
// Advanced Excel import for the stock statement.
//
// The workbook header row drives everything: each header either maps
// onto an existing stock-statement column (code, product, category,
// brand, stock, rate, value) or becomes a brand new column rendered
// by the statement page (unit, gst, sl no, or anything else).
// ============================================================

/** Display key of a stock-statement column the header can merge into. */
export type FixedColumnKey = 'code' | 'name' | 'category' | 'brand' | 'stock' | 'rate' | 'value';

export interface ParsedSheet {
  columns: string[];
  rows: Record<string, unknown>[];
}

export interface ColumnPlanEntry {
  header: string;
  /** Fixed statement column this header feeds, or null when it is a new column. */
  fixed: FixedColumnKey | null;
}

export interface ImportPreview {
  fileName: string;
  columns: string[];
  plan: ColumnPlanEntry[];
  newColumns: string[];
  rows: Record<string, unknown>[];
}

export interface ImportResult {
  fileName: string;
  created: number;
  updated: number;
  skipped: number;
  newColumns: string[];
  errors: string[];
}

export interface StatementData {
  /** Ordered union of every header ever imported. */
  columns: string[];
  /** Raw imported values keyed by product id. */
  rowsByProduct: Record<string, Record<string, unknown>>;
  imports: { id: string; file_name: string | null; columns: string[]; row_count: number; created_at: string }[];
}

/** Header text -> fixed statement column. Normalised before lookup. */
const FIXED_HEADERS: Record<string, FixedColumnKey> = {
  code: 'code', itemcode: 'code', productcode: 'code', sku: 'code', barcode: 'code',
  name: 'name', item: 'name', itemname: 'name', product: 'name', productname: 'name',
  material: 'name', productdetails: 'name', description: 'name',
  category: 'category', cat: 'category', productcategory: 'category', group: 'category',
  brand: 'brand', make: 'brand', manufacturer: 'brand',
  stock: 'stock', quantity: 'stock', qty: 'stock', qnty: 'stock',
  openingstock: 'stock', closingstock: 'stock', actualqty: 'stock', availableqty: 'stock',
  rate: 'rate', price: 'rate', unitrate: 'rate', cost: 'rate', costprice: 'rate',
  purchaseprice: 'rate', sellingprice: 'rate', mrp: 'rate', rateperunit: 'rate',
  value: 'value', total: 'value', totalvalue: 'value', totalamount: 'value',
  amount: 'value', stockvalue: 'value', totalstockvalue: 'value',
};

/** Fixed statement column -> the label rendered in the table header. */
export const FIXED_COLUMN_LABELS: Record<FixedColumnKey, string> = {
  code: 'Code',
  name: 'Product',
  category: 'Category',
  brand: 'Brand',
  stock: 'Stock',
  rate: 'Avg Cost',
  value: 'Value',
};

/** Header text -> product field written during import (superset of FIXED_HEADERS). */
const PRODUCT_FIELD_HEADERS: Record<string, string> = {
  ...FIXED_HEADERS,
  unit: 'unit', uom: 'unit', units: 'unit', uomname: 'unit',
  gst: 'gst', gstpercent: 'gst', gstpercentage: 'gst', gstrate: 'gst',
  tax: 'gst', taxrate: 'gst', gstamt: 'gst',
};

function normalise(header: string): string {
  return String(header).toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function fixedColumnFor(header: string): FixedColumnKey | null {
  return FIXED_HEADERS[normalise(header)] ?? null;
}

/** True when the header feeds an existing statement column rather than a new one. */
export function isFixedHeader(header: string): boolean {
  return fixedColumnFor(header) !== null;
}

function cellText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim();
}

function cellNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const cleaned = String(value).replace(/[₹$,\s]/g, '').replace(/%$/, '');
  if (cleaned === '') return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Reads the first worksheet into an ordered header list plus row objects. */
export async function parseStockWorkbook(file: File): Promise<ParsedSheet> {
  const XLSX = await import('xlsx');
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error('The workbook has no sheets');

  const sheet = workbook.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
  if (raw.length === 0) throw new Error('The first sheet has no data rows');

  const columns: string[] = [];
  const seen = new Set<string>();
  for (const row of raw) {
    for (const key of Object.keys(row)) {
      const header = cellText(key);
      if (!header) continue;
      const dedupe = normalise(header);
      if (!dedupe || seen.has(dedupe)) continue;
      seen.add(dedupe);
      columns.push(header);
    }
  }
  if (columns.length === 0) throw new Error('No column headers were found in the sheet');

  const rows = raw.filter((row) => columns.some((header) => cellText(row[header]) !== ''));
  return { columns, rows };
}

/** Builds the header -> column map shown to the user before importing. */
export function planColumns(columns: string[]): { plan: ColumnPlanEntry[]; newColumns: string[] } {
  const plan: ColumnPlanEntry[] = columns.map((header) => ({ header, fixed: fixedColumnFor(header) }));
  return { plan, newColumns: plan.filter((p) => p.fixed === null).map((p) => p.header) };
}

function pickHeader(columns: string[], field: string): string | null {
  for (const header of columns) {
    if (PRODUCT_FIELD_HEADERS[normalise(header)] === field) return header;
  }
  return null;
}

async function getCompanyId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single();
  if (error || !profile?.company_id) throw new Error('User profile not found');
  return profile.company_id;
}

interface LookupTables {
  categories: Map<string, string>;
  brands: Map<string, string>;
  units: Map<string, string>;
  productsByCode: Map<string, { id: string; code: string; name: string }>;
  productsByName: Map<string, { id: string; code: string; name: string }>;
  warehouseId: string | null;
  stock: Map<string, { current_stock: number; avg_cost: number }>;
}

async function loadLookups(companyId: string): Promise<LookupTables> {
  const [categories, brands, units, products, warehouses, stockRows] = await Promise.all([
    supabase.from('categories').select('id, name').eq('company_id', companyId),
    supabase.from('brands').select('id, name').eq('company_id', companyId),
    supabase.from('units').select('id, name, short_name').eq('company_id', companyId),
    supabase.from('products').select('id, code, name').eq('company_id', companyId),
    supabase.from('warehouses').select('id, is_default').eq('company_id', companyId).eq('is_active', true),
    supabase.from('product_stock').select('product_id, warehouse_id, current_stock, avg_cost'),
  ]);

  const key = (name: string) => name.trim().toLowerCase();

  const lookup: LookupTables = {
    categories: new Map(),
    brands: new Map(),
    units: new Map(),
    productsByCode: new Map(),
    productsByName: new Map(),
    warehouseId: null,
    stock: new Map(),
  };

  for (const row of (categories.data || []) as { id: string; name: string }[]) {
    if (!lookup.categories.has(key(row.name))) lookup.categories.set(key(row.name), row.id);
  }
  for (const row of (brands.data || []) as { id: string; name: string }[]) {
    if (!lookup.brands.has(key(row.name))) lookup.brands.set(key(row.name), row.id);
  }
  for (const row of (units.data || []) as { id: string; name: string; short_name: string }[]) {
    if (!lookup.units.has(key(row.name))) lookup.units.set(key(row.name), row.id);
    if (row.short_name && !lookup.units.has(key(row.short_name))) lookup.units.set(key(row.short_name), row.id);
  }

  for (const row of (products.data || []) as { id: string; code: string; name: string }[]) {
    if (row.code) lookup.productsByCode.set(key(row.code), row);
    if (row.name) lookup.productsByName.set(key(row.name), row);
  }

  const warehouseList = (warehouses.data || []) as { id: string; is_default: boolean }[];
  const defaultWarehouse = warehouseList.find((w) => w.is_default) ?? warehouseList[0];
  lookup.warehouseId = defaultWarehouse?.id ?? null;

  if (lookup.warehouseId) {
    for (const row of (stockRows.data || []) as { product_id: string; warehouse_id: string; current_stock: number; avg_cost: number }[]) {
      if (row.warehouse_id === lookup.warehouseId) {
        lookup.stock.set(row.product_id, {
          current_stock: Number(row.current_stock || 0),
          avg_cost: Number(row.avg_cost || 0),
        });
      }
    }
  }

  return lookup;
}

/** Returns an id for `name`, creating the master-data row when it is new. */
async function resolveMasterId(
  table: 'categories' | 'brands' | 'units',
  lookup: Map<string, string>,
  companyId: string,
  name: string,
  errors: string[]
): Promise<string | null> {
  const clean = name.trim();
  if (!clean) return null;
  const key = clean.toLowerCase();
  const existing = lookup.get(key);
  if (existing) return existing;

  const payload: Record<string, unknown> = { company_id: companyId, name: clean };
  if (table === 'units') payload.short_name = clean.slice(0, 10);

  const { data, error } = await supabase.from(table).insert(payload).select('id').single();
  if (error || !data) {
    if (error && !errors.includes(`Could not create ${table.slice(0, -1)} "${clean}": ${error.message}`)) {
      errors.push(`Could not create ${table.slice(0, -1)} "${clean}": ${error.message}`);
    }
    return null;
  }
  const id = (data as { id: string }).id;
  lookup.set(key, id);
  return id;
}

/** `IMP-0001` style fallback when the file carries no item code. */
function generateCode(usedCodes: Map<string, string>, offset: number): string {
  let n = Math.max(offset, 1);
  for (;;) {
    const code = `IMP-${String(n).padStart(4, '0')}`;
    if (!usedCodes.has(code.toLowerCase())) return code;
    n += 1;
  }
}

export async function previewStockImport(file: File): Promise<ImportPreview> {
  const { columns, rows } = await parseStockWorkbook(file);
  const { plan, newColumns } = planColumns(columns);
  return { fileName: file.name, columns, plan, newColumns, rows };
}

/**
 * Imports the workbook: creates/updates products (so they show up in the
 * billing product search), posts stock quantities, and stores every header
 * and cell so the statement page can render its dynamic columns.
 */
export async function importStockWorkbook(file: File): Promise<ImportResult> {
  const companyId = await getCompanyId();
  const { data: { user } } = await supabase.auth.getUser();
  const { columns, rows } = await parseStockWorkbook(file);
  const { newColumns } = planColumns(columns);
  const errors: string[] = [];

  const headers = {
    code: pickHeader(columns, 'code'),
    name: pickHeader(columns, 'name'),
    category: pickHeader(columns, 'category'),
    brand: pickHeader(columns, 'brand'),
    unit: pickHeader(columns, 'unit'),
    stock: pickHeader(columns, 'stock'),
    rate: pickHeader(columns, 'rate'),
    gst: pickHeader(columns, 'gst'),
  };

  if (!headers.name && !headers.code) {
    throw new Error('The sheet needs an item name or code column (e.g. "item name")');
  }

  const lookup = await loadLookups(companyId);
  const result: ImportResult = {
    fileName: file.name,
    created: 0,
    updated: 0,
    skipped: 0,
    newColumns,
    errors,
  };

  const { data: importRecord, error: importErr } = await supabase
    .from('stock_statement_imports')
    .insert({
      company_id: companyId,
      file_name: file.name,
      columns,
      row_count: rows.length,
      created_by: user?.id || null,
    })
    .select('id')
    .single();
  if (importErr) throw new Error(`Could not record the import: ${importErr.message}`);
  const importId = (importRecord as { id: string }).id;

  const usedCodes = new Map<string, string>();
  for (const product of lookup.productsByCode.values()) {
    usedCodes.set(product.code.toLowerCase(), product.id);
  }

  const newProducts: Record<string, unknown>[] = [];
  const newProductIds = new Map<string, string>();
  const statementPayloads: Record<string, unknown>[] = [];
  const stockUpserts: Record<string, unknown>[] = [];
  const movements: Record<string, unknown>[] = [];
  let codeSeed = usedCodes.size + 1;

  for (const row of rows) {
    const name = headers.name ? cellText(row[headers.name]) : '';
    const rawCode = headers.code ? cellText(row[headers.code]) : '';
    if (!name && !rawCode) {
      result.skipped += 1;
      continue;
    }

    const match = (rawCode ? lookup.productsByCode.get(rawCode.toLowerCase()) : undefined)
      || (name ? lookup.productsByName.get(name.toLowerCase()) : undefined)
      || null;

    if (rawCode && usedCodes.has(rawCode.toLowerCase())) {
      const ownerId = usedCodes.get(rawCode.toLowerCase());
      if (ownerId !== match?.id) {
        result.skipped += 1;
        errors.push(`Row "${name || rawCode}" skipped: code "${rawCode}" appears more than once`);
        continue;
      }
    }

    let code: string;
    if (rawCode) code = rawCode;
    else if (match) code = match.code;
    else {
      code = generateCode(usedCodes, codeSeed);
      codeSeed += 1;
    }
    if (!usedCodes.has(code.toLowerCase())) usedCodes.set(code.toLowerCase(), match?.id ?? 'pending');

    const patch: Record<string, unknown> = {};
    if (headers.name && name && (!match || match.name !== name)) patch.name = name;
    if (headers.category) {
      const text = cellText(row[headers.category]);
      if (text) patch.category_id = await resolveMasterId('categories', lookup.categories, companyId, text, errors);
    }
    if (headers.brand) {
      const text = cellText(row[headers.brand]);
      if (text) patch.brand_id = await resolveMasterId('brands', lookup.brands, companyId, text, errors);
    }
    if (headers.unit) {
      const text = cellText(row[headers.unit]);
      if (text) patch.unit_id = await resolveMasterId('units', lookup.units, companyId, text, errors);
    }
    const gstRate = headers.gst ? cellNumber(row[headers.gst]) : null;
    if (gstRate !== null) patch.gst_rate = gstRate;
    const rate = headers.rate ? cellNumber(row[headers.rate]) : null;
    if (rate !== null) {
      patch.purchase_price = rate;
      patch.selling_price = rate;
    }

    if (match) {
      if (Object.keys(patch).length > 0) {
        const { error } = await supabase
          .from('products')
          .update({ ...patch, updated_at: new Date().toISOString() })
          .eq('id', match.id);
        if (error) errors.push(`Could not update "${name || rawCode}": ${error.message}`);
        else result.updated += 1;
      } else {
        result.updated += 1;
      }
    } else {
      newProducts.push({
        company_id: companyId,
        name: name || code,
        code,
        gst_rate: 18,
        purchase_price: 0,
        selling_price: 0,
        low_stock_level: 0,
        is_active: true,
        created_by: user?.id || null,
        ...patch,
      });
      newProductIds.set(code.toLowerCase(), 'pending');
      result.created += 1;
    }

    statementPayloads.push({
      company_id: companyId,
      import_id: importId,
      product_id: match?.id ?? null,
      product_code: code,
      data: Object.fromEntries(columns.map((header) => [header, row[header] ?? ''])),
    });
  }

  // New products must exist before stock and statement rows can reference them.
  if (newProducts.length > 0) {
    const { data, error } = await supabase.from('products').insert(newProducts).select('id, code');
    if (error) throw new Error(`Could not create products: ${error.message}`);
    for (const row of (data || []) as { id: string; code: string }[]) {
      newProductIds.set(row.code.toLowerCase(), row.id);
      usedCodes.set(row.code.toLowerCase(), row.id);
    }
  }

  const resolvedStatementRows = statementPayloads.filter((pending) => {
    const productId = (pending.product_id as string | null)
      ?? newProductIds.get(String(pending.product_code).toLowerCase());
    if (!productId || productId === 'pending') {
      result.skipped += 1;
      return false;
    }
    delete pending.product_code;
    pending.product_id = productId;
    return true;
  });

  if (resolvedStatementRows.length > 0) {
    const { error } = await supabase
      .from('stock_statement_rows')
      .upsert(resolvedStatementRows, { onConflict: 'company_id,product_id' });
    if (error) errors.push(`Statement rows were not saved: ${error.message}`);
  }

  // Post stock when the sheet carries a quantity column.
  if (headers.stock && lookup.warehouseId) {
    const warehouseId = lookup.warehouseId;
    for (const row of rows) {
      const name = headers.name ? cellText(row[headers.name]) : '';
      const rawCode = headers.code ? cellText(row[headers.code]) : '';
      if (!name && !rawCode) continue;
      const quantity = cellNumber(row[headers.stock as string]);
      if (quantity === null) continue;

      const match = (rawCode ? lookup.productsByCode.get(rawCode.toLowerCase()) : undefined)
        || (name ? lookup.productsByName.get(name.toLowerCase()) : undefined);
      const productId = match?.id
        ?? newProductIds.get(rawCode.toLowerCase())
        ?? newProductIds.get(name.toLowerCase());
      if (!productId || productId === 'pending') continue;

      const rate = headers.rate ? cellNumber(row[headers.rate as string]) : null;
      const previous = lookup.stock.get(productId);
      const previousQty = previous?.current_stock ?? 0;
      const avgCost = rate ?? previous?.avg_cost ?? 0;

      stockUpserts.push({
        product_id: productId,
        warehouse_id: warehouseId,
        current_stock: quantity,
        avg_cost: avgCost,
        last_updated: new Date().toISOString(),
      });

      if (previousQty !== quantity) {
        movements.push({
          company_id: companyId,
          product_id: productId,
          warehouse_id: warehouseId,
          type: 'opening',
          reference_type: 'import',
          reference_id: importId,
          quantity,
          balance_after: quantity,
          unit_cost: avgCost,
          total_value: Math.round(quantity * avgCost * 100) / 100,
          notes: `Advanced Excel import: ${file.name}`,
          created_by: user?.id || null,
        });
      }
    }

    if (stockUpserts.length > 0) {
      const { error } = await supabase
        .from('product_stock')
        .upsert(stockUpserts, { onConflict: 'product_id,warehouse_id' });
      if (error) errors.push(`Stock quantities were not saved: ${error.message}`);
    }
    if (movements.length > 0) {
      const { error } = await supabase.from('stock_movements').insert(movements);
      if (error) errors.push(`Stock movement history was not saved: ${error.message}`);
    }
  } else if (headers.stock && !lookup.warehouseId) {
    errors.push('No warehouse is configured, so stock quantities were not posted');
  }

  return result;
}

/** Reads the stored headers and per-product cell values for the statement. */
export async function getStatementData(): Promise<StatementData> {
  const companyId = await getCompanyId();

  const [importsRes, rowsRes] = await Promise.all([
    supabase
      .from('stock_statement_imports')
      .select('id, file_name, columns, row_count, created_at')
      .eq('company_id', companyId)
      .order('created_at', { ascending: true }),
    supabase
      .from('stock_statement_rows')
      .select('product_id, data')
      .eq('company_id', companyId),
  ]);

  if (importsRes.error) throw new Error(importsRes.error.message);
  if (rowsRes.error) throw new Error(rowsRes.error.message);

  const imports = (importsRes.data || []) as StatementData['imports'];
  const columns: string[] = [];
  const seen = new Set<string>();
  for (const record of imports) {
    for (const header of (record.columns as string[]) || []) {
      const key = normalise(header);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      columns.push(header);
    }
  }

  const rowsByProduct: StatementData['rowsByProduct'] = {};
  for (const row of (rowsRes.data || []) as { product_id: string; data: Record<string, unknown> }[]) {
    if (row.product_id) rowsByProduct[row.product_id] = row.data || {};
  }

  return { columns, rowsByProduct, imports };
}

export const stockStatementService = {
  parseStockWorkbook,
  planColumns,
  previewStockImport,
  importStockWorkbook,
  getStatementData,
  fixedColumnFor,
  isFixedHeader,
  FIXED_COLUMN_LABELS,
};
