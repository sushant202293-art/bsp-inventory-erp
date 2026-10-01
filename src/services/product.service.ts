import { supabase } from '@/lib/supabase';
import type { Product, StockMovement } from '@/types/database.types';
import type {
  ProductWithRelations,
  ProductFormData,
  ProductFilters,
  ProductListResponse,
  ProductStockWithWarehouse,
  ProductImportRow,
  ProductExportRow,
} from '@/types/product.types';

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

/** Display name of the signed-in user's company, for report letterheads. */
export async function getCompanyName(): Promise<string> {
  const companyId = await getCompanyId();
  const { data } = await supabase
    .from('companies')
    .select('name')
    .eq('id', companyId)
    .maybeSingle();
  return data?.name?.trim() || 'BSP Traders';
}

/**
 * Resolves the ids of products matching a stock-status filter.
 *
 * Stock status cannot be expressed as a simple PostgREST filter because
 * `current_stock` lives in `product_stock` (one row per warehouse) while
 * `low_stock_level` lives in `products`. This aggregates both sides in JS and
 * returns an id list that `getProducts` can push into the main query, so
 * pagination and totals stay correct instead of filtering only the current
 * page. Only invoked when a stock-status filter is actually selected.
 */
async function resolveStockStatusIds(
  lowStock: boolean,
  outOfStock: boolean
): Promise<string[]> {
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id, low_stock_level');
  if (productsError) throw productsError;

  const { data: stockRows, error: stockError } = await supabase
    .from('product_stock')
    .select('product_id, current_stock');
  if (stockError) throw stockError;

  const totals = new Map<string, number>();
  (stockRows || []).forEach((row) => {
    totals.set(row.product_id, (totals.get(row.product_id) || 0) + (row.current_stock || 0));
  });

  const matches: string[] = [];
  (products || []).forEach((product) => {
    const total = totals.get(product.id) || 0;
    if (outOfStock && total <= 0) {
      matches.push(product.id);
      return;
    }
    if (lowStock && total > 0 && total <= (product.low_stock_level || 0)) {
      matches.push(product.id);
    }
  });

  return matches;
}

/**
 * Columns needed by the product table, the detail page and the print report.
 * Kept in one place so the report can never drift from the on-screen table.
 */
const PRODUCT_WITH_RELATIONS_SELECT = `
        *,
        category:categories(id, name),
        brand:brands(id, name),
        unit:units(id, name, short_name),
        stocks:product_stock(
          id, product_id, warehouse_id, current_stock, avg_cost, last_updated,
          warehouse:warehouses(id, name)
        )
      `;

/**
 * Builds the filtered product query without ordering, paging or counting, so
 * both the paginated table and the unpaginated print report apply identical
 * filter semantics. Callers add `.order()` / `.range()` themselves.
 *
 * The builder is returned wrapped in an object on purpose: a PostgREST builder
 * is a thenable, so returning it bare and awaiting the async function would
 * execute the request and hand back a response instead of a query.
 */
async function buildProductsQuery(filters: ProductFilters = {}) {
  const companyId = await getCompanyId();

  let query = supabase
    .from('products')
    .select(PRODUCT_WITH_RELATIONS_SELECT, { count: 'exact' })
    .eq('company_id', companyId);

  if (filters.search) {
    query = query.or(`name.ilike.%${filters.search}%,code.ilike.%${filters.search}%,barcode.ilike.%${filters.search}%`);
  }
  if (filters.category_id) {
    query = query.eq('category_id', filters.category_id);
  }
  if (filters.brand_id) {
    query = query.eq('brand_id', filters.brand_id);
  }
  if (filters.unit_id) {
    query = query.eq('unit_id', filters.unit_id);
  }
  if (filters.is_active !== undefined) {
    query = query.eq('is_active', filters.is_active);
  }

  if (filters.low_stock || filters.out_of_stock) {
    const ids = await resolveStockStatusIds(Boolean(filters.low_stock), Boolean(filters.out_of_stock));
    // An empty id list must short-circuit: `.in('id', [])` is a syntax error
    // and the intent is "no rows match", not "no filter".
    if (ids.length === 0) {
      return { query: null };
    }
    query = query.in('id', ids);
  }

  return { query };
}

/** Flattens the per-warehouse `stocks` embed into a single `total_stock`. */
function withTotalStock<T extends { stocks?: unknown }>(row: T): ProductWithRelations {
  const stocks = (row.stocks as unknown as ProductStockWithWarehouse[]) || [];
  const total_stock = stocks.reduce((sum, s) => sum + (s.current_stock || 0), 0);
  return { ...row, total_stock } as unknown as ProductWithRelations;
}

export async function getProducts(
  filters: ProductFilters = {},
  page: number = 1,
  perPage: number = 50
): Promise<ProductListResponse> {
  try {
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    const { query } = await buildProductsQuery(filters);
    if (!query) {
      return { products: [], total: 0, page, per_page: perPage, total_pages: 0 };
    }

    const { data, error, count } = await query.order('name', { ascending: true }).range(from, to);
    if (error) throw error;

    const products = (data || []).map(withTotalStock);

    const total = count || 0;
    return {
      products,
      total,
      page,
      per_page: perPage,
      total_pages: Math.ceil(total / perPage),
    };
  } catch (error) {
    throw new Error(`Failed to fetch products: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Upper bound on rows fetched for a print report.
 *
 * A report has to render every matching row in one document, so this cannot be
 * paginated. The cap keeps a pathological filter (or a 100k-row tenant) from
 * locking the tab; the report header reports when it was hit.
 */
export const PRODUCT_REPORT_MAX_ROWS = 5000;

/**
 * Every product matching `filters`, unpaginated and in the same order as the
 * on-screen table, for the print report.
 */
export async function getProductsForReport(
  filters: ProductFilters = {}
): Promise<{ products: ProductWithRelations[]; matchedCount: number; truncated: boolean }> {
  const { query } = await buildProductsQuery(filters);
  if (!query) return { products: [], matchedCount: 0, truncated: false };

  const { data, error, count } = await query
    .order('name', { ascending: true })
    .range(0, PRODUCT_REPORT_MAX_ROWS - 1);
  if (error) throw error;

  const matchedCount = count || 0;
  return {
    products: (data || []).map(withTotalStock),
    matchedCount,
    truncated: matchedCount > PRODUCT_REPORT_MAX_ROWS,
  };
}

/**
 * Company-wide product rollup used by the Products tab summary cards. Counts
 * every product regardless of the active table filters, so the cards stay
 * stable while the user narrows the table below them.
 */
export interface ProductStats {
  total: number;
  active: number;
  inactive: number;
  low_stock: number;
  out_of_stock: number;
  stock_value: number;
}

export async function getProductStats(): Promise<ProductStats> {
  try {
    // Auth/company guard. The rows below are scoped by RLS, so the company id
    // itself is not needed here.
    await getCompanyId();

    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, is_active, low_stock_level');
    if (productsError) throw productsError;

    const { data: stockRows, error: stockError } = await supabase
      .from('product_stock')
      .select('product_id, current_stock, avg_cost');
    if (stockError) throw stockError;

    const totals = new Map<string, { qty: number; value: number }>();
    (stockRows || []).forEach((row) => {
      const current = totals.get(row.product_id) || { qty: 0, value: 0 };
      current.qty += row.current_stock || 0;
      current.value += (row.current_stock || 0) * (row.avg_cost || 0);
      totals.set(row.product_id, current);
    });

    let active = 0;
    let inactive = 0;
    let lowStock = 0;
    let outOfStock = 0;

    (products || []).forEach((product) => {
      if (product.is_active) active += 1;
      else inactive += 1;

      const total = totals.get(product.id)?.qty || 0;
      if (total <= 0) outOfStock += 1;
      else if (total <= (product.low_stock_level || 0)) lowStock += 1;
    });

    const stockValue = Array.from(totals.values()).reduce((sum, t) => sum + t.value, 0);

    return {
      total: (products || []).length,
      active,
      inactive,
      low_stock: lowStock,
      out_of_stock: outOfStock,
      stock_value: stockValue,
    };
  } catch (error) {
    throw new Error(`Failed to fetch product stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getProduct(id: string): Promise<ProductWithRelations> {
  try {
    const companyId = await getCompanyId();
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        category:categories(id, name, description),
        brand:brands(id, name, logo_url),
        unit:units(id, name, short_name, conversion_factor),
        stocks:product_stock(
          id, product_id, warehouse_id, current_stock, avg_cost, last_updated,
          warehouse:warehouses(id, name, address)
        )
      `)
      .eq('id', id)
      .eq('company_id', companyId)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Product not found');

    const stocks = (data.stocks as unknown as ProductStockWithWarehouse[]) || [];
    const total_stock = stocks.reduce((sum, s) => sum + (s.current_stock || 0), 0);

    return { ...data, total_stock } as ProductWithRelations;
  } catch (error) {
    throw new Error(`Failed to fetch product: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function createProduct(data: ProductFormData): Promise<Product> {
  try {
    const companyId = await getCompanyId();
    const { data: { user } } = await supabase.auth.getUser();

    const insertData = {
      company_id: companyId,
      name: data.name,
      code: data.code,
      category_id: data.category_id || null,
      brand_id: data.brand_id || null,
      color: data.color || null,
      size: data.size || null,
      unit_id: data.unit_id || null,
      gst_rate: data.gst_rate,
      hsn_sac: data.hsn_sac || null,
      description: data.description || null,
      purchase_price: data.purchase_price,
      selling_price: data.selling_price,
      low_stock_level: data.low_stock_level,
      reorder_level: data.reorder_level,
      image_url: data.image_url || null,
      barcode: data.barcode || null,
      is_active: data.is_active,
      created_by: user?.id || null,
    };

    const { data: product, error } = await supabase
      .from('products')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;
    return product;
  } catch (error) {
    throw new Error(`Failed to create product: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function updateProduct(id: string, data: Partial<ProductFormData>): Promise<Product> {
  try {
    const companyId = await getCompanyId();

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (data.name !== undefined) updateData.name = data.name;
    if (data.code !== undefined) updateData.code = data.code;
    if (data.category_id !== undefined) updateData.category_id = data.category_id || null;
    if (data.brand_id !== undefined) updateData.brand_id = data.brand_id || null;
    if (data.color !== undefined) updateData.color = data.color || null;
    if (data.size !== undefined) updateData.size = data.size || null;
    if (data.unit_id !== undefined) updateData.unit_id = data.unit_id || null;
    if (data.gst_rate !== undefined) updateData.gst_rate = data.gst_rate;
    if (data.hsn_sac !== undefined) updateData.hsn_sac = data.hsn_sac || null;
    if (data.description !== undefined) updateData.description = data.description || null;
    if (data.purchase_price !== undefined) updateData.purchase_price = data.purchase_price;
    if (data.selling_price !== undefined) updateData.selling_price = data.selling_price;
    if (data.low_stock_level !== undefined) updateData.low_stock_level = data.low_stock_level;
    if (data.reorder_level !== undefined) updateData.reorder_level = data.reorder_level;
    if (data.image_url !== undefined) updateData.image_url = data.image_url || null;
    if (data.barcode !== undefined) updateData.barcode = data.barcode || null;
    if (data.is_active !== undefined) updateData.is_active = data.is_active;

    const { data: product, error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', id)
      .eq('company_id', companyId)
      .select()
      .single();

    if (error) throw error;
    if (!product) throw new Error('Product not found');
    return product;
  } catch (error) {
    throw new Error(`Failed to update product: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function deleteProduct(id: string): Promise<void> {
  try {
    const companyId = await getCompanyId();
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id)
      .eq('company_id', companyId);
    if (error) throw error;
  } catch (error) {
    throw new Error(`Failed to delete product: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function archiveProduct(id: string): Promise<Product> {
  try {
    const companyId = await getCompanyId();
    const { data, error } = await supabase
      .from('products')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('company_id', companyId)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Product not found');
    return data;
  } catch (error) {
    throw new Error(`Failed to archive product: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function duplicateProduct(id: string): Promise<Product> {
  try {
    const companyId = await getCompanyId();
    const { data: original, error: fetchError } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .eq('company_id', companyId)
      .single();

    if (fetchError || !original) throw new Error('Product not found');

    // `_id`, `created_at` and `updated_at` are dropped so the copy gets fresh
    // server-generated values instead of reusing the original's timestamps.
    const { id: _id, created_at: _createdAt, updated_at: _updatedAt, ...rest } = original;
    const duplicateData = {
      ...rest,
      name: `${original.name} (Copy)`,
      code: `${original.code}-COPY`,
};

    const { data: product, error: insertError } = await supabase
      .from('products')
      .insert(duplicateData)
      .select()
      .single();

    if (insertError) throw insertError;
    return product;
  } catch (error) {
    throw new Error(`Failed to duplicate product: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getProductStock(productId: string): Promise<ProductStockWithWarehouse[]> {
  try {
    const companyId = await getCompanyId();

    const { data: product, error: prodErr } = await supabase
      .from('products')
      .select('id')
      .eq('id', productId)
      .eq('company_id', companyId)
      .single();

    if (prodErr || !product) throw new Error('Product not found');

    const { data, error } = await supabase
      .from('product_stock')
      .select(`
        *,
        warehouse:warehouses(id, name, address)
      `)
      .eq('product_id', productId);

    if (error) throw error;
    return (data || []) as unknown as ProductStockWithWarehouse[];
  } catch (error) {
    throw new Error(`Failed to fetch product stock: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getProductMovements(
  productId: string,
  dateFrom?: string,
  dateTo?: string
): Promise<StockMovement[]> {
  try {
    const companyId = await getCompanyId();

    const { data: product, error: prodErr } = await supabase
      .from('products')
      .select('id')
      .eq('id', productId)
      .eq('company_id', companyId)
      .single();

    if (prodErr || !product) throw new Error('Product not found');

    let query = supabase
      .from('stock_movements')
      .select('*')
      .eq('product_id', productId)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (dateFrom) {
      query = query.gte('created_at', dateFrom);
    }
    if (dateTo) {
      const endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999);
      query = query.lte('created_at', endDate.toISOString());
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (error) {
    throw new Error(`Failed to fetch product movements: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function importProducts(products: ProductImportRow[]): Promise<{ imported: number; errors: string[] }> {
  try {
    const companyId = await getCompanyId();
    const { data: { user } } = await supabase.auth.getUser();
    const errors: string[] = [];
    let imported = 0;

    for (const row of products) {
      try {
        let categoryId: string | null = null;
        if (row.category) {
          const { data: cat } = await supabase
            .from('categories')
            .select('id')
            .eq('company_id', companyId)
            .ilike('name', row.category)
            .single();
          categoryId = cat?.id || null;
        }

        let brandId: string | null = null;
        if (row.brand) {
          const { data: brand } = await supabase
            .from('brands')
            .select('id')
            .eq('company_id', companyId)
            .ilike('name', row.brand)
            .single();
          brandId = brand?.id || null;
        }

        const { error } = await supabase
          .from('products')
          .insert({
            company_id: companyId,
            name: row.name,
            code: row.code,
            category_id: categoryId,
            brand_id: brandId,
            color: row.color || null,
            size: row.size || null,
            gst_rate: row.gst_rate || 0,
            hsn_sac: row.hsn_sac || null,
            purchase_price: row.purchase_price || 0,
            selling_price: row.selling_price || 0,
            low_stock_level: row.low_stock_level || 0,
            barcode: row.barcode || null,
            created_by: user?.id || null,
          });

        if (error) {
          errors.push(`Row "${row.name}": ${error.message}`);
        } else {
          imported++;
        }
      } catch (e) {
        errors.push(`Row "${row.name}": ${e instanceof Error ? e.message : 'Unknown error'}`);
      }
    }

    return { imported, errors };
  } catch (error) {
    throw new Error(`Failed to import products: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function exportProducts(filters: ProductFilters = {}): Promise<ProductExportRow[]> {
  try {
    const companyId = await getCompanyId();

    let query = supabase
      .from('products')
      .select(`
        *,
        category:categories(name),
        brand:brands(name),
        unit:units(short_name),
        stocks:product_stock(current_stock)
      `)
      .eq('company_id', companyId);

    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,code.ilike.%${filters.search}%`);
    }
    if (filters.category_id) {
      query = query.eq('category_id', filters.category_id);
    }
if (filters.brand_id) {
      query = query.eq('brand_id', filters.brand_id);
    }
    if (filters.unit_id) {
      query = query.eq('unit_id', filters.unit_id);
    }
    if (filters.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    }

    const { data, error } = await query.order('name');
    if (error) throw error;

    return (data || []).map((p) => {
      const stocks = (p.stocks as unknown as { current_stock: number }[]) || [];
      const totalStock = stocks.reduce((sum, s) => sum + (s.current_stock || 0), 0);
      return {
        code: p.code,
        name: p.name,
        category: (p.category as unknown as { name: string })?.name || '',
        brand: (p.brand as unknown as { name: string })?.name || '',
        color: p.color || '',
        size: p.size || '',
        unit: (p.unit as unknown as { short_name: string })?.short_name || '',
        gst_rate: p.gst_rate,
        hsn_sac: p.hsn_sac || '',
        purchase_price: p.purchase_price,
        selling_price: p.selling_price,
        low_stock_level: p.low_stock_level,
        reorder_level: p.reorder_level,
        barcode: p.barcode || '',
        current_stock: totalStock,
        is_active: p.is_active,
      };
    });
  } catch (error) {
    throw new Error(`Failed to export products: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}


/**
 * A document line for a product, joined to its parent transaction plus the
 * customer/supplier counterparty. This is what powers the Transactions,
 * Suppliers, Customers and History tabs on the product detail screen. The
 * `products` table has no supplier/customer column, so the counterparty is
 * derived from `transaction_items.product_id -> transactions.supplier_id /
 * customer_id` rather than stored redundantly.
 */
export interface ProductTransactionLine {
  id: string;
  transaction_id: string;
  document_number: string;
  document_date: string;
  type: string;
  status: string;
  documentStatusLabel: string;
  quantity: number;
  unit: string | null;
  rate: number;
  discount_percent: number;
  discount_amount: number;
  taxable_value: number;
  gst_rate: number;
  total_amount: number;
  grand_total: number;
  counterpartyId: string | null;
  counterpartyName: string | null;
  counterpartyKind: 'customer' | 'supplier' | null;
  notes: string | null;
}

export interface ProductCounterparty {
  id: string;
  name: string;
  kind: 'customer' | 'supplier';
  documentCount: number;
  totalQuantity: number;
  totalValue: number;
  lastTransactionDate: string | null;
}

export async function getProductTransactions(
  productId: string,
  kind?: 'sale' | 'purchase'
): Promise<ProductTransactionLine[]> {
  try {
    const companyId = await getCompanyId();

    const { data: product, error: prodErr } = await supabase
      .from('products')
      .select('id')
      .eq('id', productId)
      .eq('company_id', companyId)
      .single();
    if (prodErr || !product) throw new Error('Product not found');

    let query = supabase
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
      .eq('product_id', productId)
      .eq('transactions.company_id', companyId)
      .order('document_date', { referencedTable: 'transactions', ascending: false });

    if (kind) {
      query = query.eq('transactions.type', kind);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((row) => {
      const tx = row.transaction as unknown as {
        id: string;
        type: string;
        status: string;
        document_number: string;
        document_date: string;
        grand_total: number;
        notes: string | null;
        customer: { id: string; name: string } | null;
        supplier: { id: string; name: string } | null;
      };
      const counterparty = tx.customer || tx.supplier || null;
      return {
        id: row.id,
        transaction_id: tx.id,
        document_number: tx.document_number,
        document_date: tx.document_date,
        type: tx.type,
        status: tx.status,
        documentStatusLabel: tx.status,
        quantity: row.quantity,
        unit: row.unit,
        rate: row.rate,
        discount_percent: row.discount_percent,
        discount_amount: row.discount_amount,
        taxable_value: row.taxable_value,
        gst_rate: row.gst_rate,
        total_amount: row.total_amount,
        grand_total: tx.grand_total,
        counterpartyId: counterparty?.id || null,
        counterpartyName: counterparty?.name || null,
        counterpartyKind: tx.customer ? 'customer' : tx.supplier ? 'supplier' : null,
        notes: tx.notes,
      } as ProductTransactionLine;
    });
  } catch (error) {
    throw new Error(`Failed to fetch product transactions: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Collapses `getProductTransactions` output into the distinct counterparties
 * for the Suppliers and Customers tabs, ordered by most recent activity.
 */
export function summarizeCounterparties(
  lines: ProductTransactionLine[]
): ProductCounterparty[] {
  const byId = new Map<string, ProductCounterparty>();

  lines.forEach((line) => {
    if (!line.counterpartyId || !line.counterpartyKind) return;
    const existing = byId.get(line.counterpartyId);
    if (existing) {
      existing.documentCount += 1;
      existing.totalQuantity += line.quantity || 0;
      existing.totalValue += line.total_amount || 0;
      if (!existing.lastTransactionDate || line.document_date > existing.lastTransactionDate) {
        existing.lastTransactionDate = line.document_date;
      }
      return;
    }
    byId.set(line.counterpartyId, {
      id: line.counterpartyId,
      name: line.counterpartyName || 'Unknown',
      kind: line.counterpartyKind,
      documentCount: 1,
      totalQuantity: line.quantity || 0,
      totalValue: line.total_amount || 0,
      lastTransactionDate: line.document_date,
    });
  });

  return Array.from(byId.values()).sort((a, b) => {
    if (!a.lastTransactionDate) return 1;
    if (!b.lastTransactionDate) return -1;
    return b.lastTransactionDate.localeCompare(a.lastTransactionDate);
  });
}

export const productService = {
  getProducts, getProduct, createProduct, updateProduct, deleteProduct,
  duplicateProduct, getProductStock, getProductStats, getProductTransactions,
  importProducts, exportProducts,
};
