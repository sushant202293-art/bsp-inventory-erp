import { supabase } from '@/lib/supabase';
import type { ProductStock, StockMovement } from '@/types/database.types';
import type { ProductStockWithWarehouse, StockAdjustment, StockTransfer } from '@/types/product.types';

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

async function getCurrentUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return user.id;
}

export interface StockSummaryItem {
  product_id: string;
  product_name: string;
  product_code: string;
  category_name: string | null;
  brand_name: string | null;
  total_stock: number;
  avg_cost: number;
  stock_value: number;
  low_stock_level: number;
  reorder_level: number;
  warehouses: {
    warehouse_id: string;
    warehouse_name: string;
    current_stock: number;
    avg_cost: number;
  }[];
}

export interface StockMovementFilters {
  product_id?: string;
  warehouse_id?: string;
  type?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}

export interface StockValuationItem {
  product_id: string;
  product_name: string;
  product_code: string;
  category_name: string | null;
  quantity: number;
  avg_cost: number;
  total_value: number;
}

export async function getStockSummary(
  filters: { category_id?: string; brand_id?: string; warehouse_id?: string; search?: string } = {}
): Promise<StockSummaryItem[]> {
  try {
    const companyId = await getCompanyId();

    let query = supabase
      .from('products')
      .select(`
        id, name, code, low_stock_level, reorder_level,
        category:categories(name),
        brand:brands(name),
        stocks:product_stock(
          product_id, warehouse_id, current_stock, avg_cost,
          warehouse:warehouses(id, name)
        )
      `)
      .eq('company_id', companyId)
      .eq('is_active', true);

    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,code.ilike.%${filters.search}%`);
    }
    if (filters.category_id) {
      query = query.eq('category_id', filters.category_id);
    }
    if (filters.brand_id) {
      query = query.eq('brand_id', filters.brand_id);
    }

    const { data, error } = await query.order('name');
    if (error) throw error;

    return (data || []).map((product) => {
      const stocks = (product.stocks as unknown as {
        warehouse_id: string;
        warehouse: { id: string; name: string } | null;
        current_stock: number;
        avg_cost: number;
      }[]) || [];

      const totalStock = stocks.reduce((sum, s) => sum + (s.current_stock || 0), 0);
      const totalValue = stocks.reduce((sum, s) => sum + (s.current_stock || 0) * (s.avg_cost || 0), 0);
      const avgCost = totalStock > 0 ? totalValue / totalStock : 0;

      return {
        product_id: product.id,
        product_name: product.name,
        product_code: product.code,
        category_name: (product.category as unknown as { name: string })?.name || null,
        brand_name: (product.brand as unknown as { name: string })?.name || null,
        total_stock: totalStock,
        avg_cost: Math.round(avgCost * 100) / 100,
        stock_value: Math.round(totalValue * 100) / 100,
        low_stock_level: product.low_stock_level,
        reorder_level: product.reorder_level,
        warehouses: stocks.map((s) => ({
          warehouse_id: s.warehouse_id,
          warehouse_name: s.warehouse?.name || 'Unknown',
          current_stock: s.current_stock,
          avg_cost: s.avg_cost,
        })),
      };
    });
  } catch (error) {
    throw new Error(`Failed to fetch stock summary: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getProductStock(
  productId: string,
  warehouseId?: string
): Promise<ProductStockWithWarehouse[]> {
  try {
    let query = supabase
      .from('product_stock')
      .select(`
        *,
        warehouse:warehouses(id, name)
      `)
      .eq('product_id', productId);

    if (warehouseId) {
      query = query.eq('warehouse_id', warehouseId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []) as unknown as ProductStockWithWarehouse[];
  } catch (error) {
    throw new Error(`Failed to fetch product stock: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getStockMovements(
  filters: StockMovementFilters = {},
  page: number = 1,
  perPage: number = 50
): Promise<{ movements: StockMovement[]; total: number; page: number; per_page: number; total_pages: number }> {
  try {
    const companyId = await getCompanyId();
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    let query = supabase
      .from('stock_movements')
      .select(`
        *,
        product:products(name, code)
      `, { count: 'exact' })
      .eq('company_id', companyId);

    if (filters.product_id) {
      query = query.eq('product_id', filters.product_id);
    }
    if (filters.warehouse_id) {
      query = query.eq('warehouse_id', filters.warehouse_id);
    }
    if (filters.type) {
      query = query.eq('type', filters.type);
    }
    if (filters.date_from) {
      query = query.gte('created_at', filters.date_from);
    }
    if (filters.date_to) {
      const endDate = new Date(filters.date_to);
      endDate.setHours(23, 59, 59, 999);
      query = query.lte('created_at', endDate.toISOString());
    }

    query = query.order('created_at', { ascending: false }).range(from, to);

    const { data, error, count } = await query;
    if (error) throw error;

    const total = count || 0;
    return {
      movements: (data || []) as StockMovement[],
      total,
      page,
      per_page: perPage,
      total_pages: Math.ceil(total / perPage),
    };
  } catch (error) {
    throw new Error(`Failed to fetch stock movements: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function adjustStock(data: StockAdjustment): Promise<{ stock: ProductStock; movement: StockMovement }> {
  try {
    const companyId = await getCompanyId();
    const userId = await getCurrentUserId();

    // `maybeSingle()` rather than `single()`: `single()` errors with
    // PGRST116 when the product has no stock row yet, and the old code
    // ignored `stockErr` entirely — so a real failure (RLS, network)
    // silently fell through to an insert that then violated the
    // (product_id, warehouse_id) unique index.
    const { data: existingStock, error: stockErr } = await supabase
      .from('product_stock')
      .select('*')
      .eq('product_id', data.product_id)
      .eq('warehouse_id', data.warehouse_id)
      .maybeSingle();

    if (stockErr) throw stockErr;

    const currentStock = existingStock?.current_stock || 0;
    const quantityChange = data.type === 'adjustment_in' ? data.quantity : -data.quantity;
    const newStock = currentStock + quantityChange;

    if (newStock < 0) {
      throw new Error('Stock cannot go below zero');
    }

    let stockRecord: ProductStock;

    if (existingStock) {
      const { data: updated, error: updateErr } = await supabase
        .from('product_stock')
        .update({
          current_stock: newStock,
          last_updated: new Date().toISOString(),
        })
        .eq('id', existingStock.id)
        .select()
        .single();

      if (updateErr) throw updateErr;
      stockRecord = updated;
    } else {
      const { data: created, error: createErr } = await supabase
        .from('product_stock')
        .insert({
          product_id: data.product_id,
          warehouse_id: data.warehouse_id,
          current_stock: newStock,
          avg_cost: 0,
          last_updated: new Date().toISOString(),
        })
        .select()
        .single();

      if (createErr) throw createErr;
      stockRecord = created;
    }

    const { data: movement, error: movErr } = await supabase
      .from('stock_movements')
      .insert({
        company_id: companyId,
        product_id: data.product_id,
        warehouse_id: data.warehouse_id,
        type: data.type,
        reference_type: 'adjustment',
        reference_id: null,
        quantity: data.quantity,
        balance_after: newStock,
        unit_cost: 0,
        total_value: 0,
        notes: data.notes,
        created_by: userId,
      })
      .select()
      .single();

    if (movErr) throw movErr;

    return { stock: stockRecord, movement };
  } catch (error) {
    throw new Error(`Failed to adjust stock: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function transferStock(data: StockTransfer): Promise<{
  from_movement: StockMovement;
  to_movement: StockMovement;
  from_stock: ProductStock;
  to_stock: ProductStock;
}> {
  try {
    const companyId = await getCompanyId();
    const userId = await getCurrentUserId();

    if (data.from_warehouse_id === data.to_warehouse_id) {
      throw new Error('Source and destination warehouses must be different');
    }

    const { data: fromStock, error: fromErr } = await supabase
      .from('product_stock')
      .select('*')
      .eq('product_id', data.product_id)
      .eq('warehouse_id', data.from_warehouse_id)
      .single();

    if (fromErr || !fromStock) throw new Error('Source warehouse stock not found');
    if (fromStock.current_stock < data.quantity) {
      throw new Error('Insufficient stock in source warehouse');
    }

    const newFromStock = fromStock.current_stock - data.quantity;
    const { data: updatedFrom, error: updateFromErr } = await supabase
      .from('product_stock')
      .update({ current_stock: newFromStock, last_updated: new Date().toISOString() })
      .eq('id', fromStock.id)
      .select()
      .single();

    if (updateFromErr) throw updateFromErr;

    const { data: toStock, error: toErr } = await supabase
      .from('product_stock')
      .select('*')
      .eq('product_id', data.product_id)
      .eq('warehouse_id', data.to_warehouse_id)
      .single();

    let updatedTo: ProductStock;
    if (toStock) {
      const newToStock = toStock.current_stock + data.quantity;
      const { data: updated, error: updateToErr } = await supabase
        .from('product_stock')
        .update({ current_stock: newToStock, last_updated: new Date().toISOString() })
        .eq('id', toStock.id)
        .select()
        .single();
      if (updateToErr) throw updateToErr;
      updatedTo = updated;
    } else {
      const { data: created, error: createErr } = await supabase
        .from('product_stock')
        .insert({
          product_id: data.product_id,
          warehouse_id: data.to_warehouse_id,
          current_stock: data.quantity,
          avg_cost: fromStock.avg_cost,
          last_updated: new Date().toISOString(),
        })
        .select()
        .single();
      if (createErr) throw createErr;
      updatedTo = created;
    }

    const { data: fromMovement, error: fromMovErr } = await supabase
      .from('stock_movements')
      .insert({
        company_id: companyId,
        product_id: data.product_id,
        warehouse_id: data.from_warehouse_id,
        type: 'transfer_out',
        reference_type: 'transfer',
        reference_id: null,
        quantity: data.quantity,
        balance_after: newFromStock,
        unit_cost: fromStock.avg_cost,
        total_value: data.quantity * fromStock.avg_cost,
        notes: data.notes,
        created_by: userId,
      })
      .select()
      .single();

    if (fromMovErr) throw fromMovErr;

    const { data: toMovement, error: toMovErr } = await supabase
      .from('stock_movements')
      .insert({
        company_id: companyId,
        product_id: data.product_id,
        warehouse_id: data.to_warehouse_id,
        type: 'transfer_in',
        reference_type: 'transfer',
        reference_id: null,
        quantity: data.quantity,
        balance_after: updatedTo.current_stock,
        unit_cost: fromStock.avg_cost,
        total_value: data.quantity * fromStock.avg_cost,
        notes: data.notes,
        created_by: userId,
      })
      .select()
      .single();

    if (toMovErr) throw toMovErr;

    return {
      from_movement: fromMovement,
      to_movement: toMovement,
      from_stock: updatedFrom,
      to_stock: updatedTo,
    };
  } catch (error) {
    throw new Error(`Failed to transfer stock: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getLowStockProducts(): Promise<StockSummaryItem[]> {
  try {
    const companyId = await getCompanyId();

    const { data, error } = await supabase
      .from('products')
      .select(`
        id, name, code, low_stock_level, reorder_level,
        category:categories(name),
        brand:brands(name),
        stocks:product_stock(
          product_id, warehouse_id, current_stock, avg_cost,
          warehouse:warehouses(id, name)
        )
      `)
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('name');

    if (error) throw error;

    return (data || [])
      .map((product) => {
        const stocks = (product.stocks as unknown as {
          warehouse_id: string;
          warehouse: { id: string; name: string } | null;
          current_stock: number;
          avg_cost: number;
        }[]) || [];

        const totalStock = stocks.reduce((sum, s) => sum + (s.current_stock || 0), 0);
        const totalValue = stocks.reduce((sum, s) => sum + (s.current_stock || 0) * (s.avg_cost || 0), 0);
        const avgCost = totalStock > 0 ? totalValue / totalStock : 0;

        return {
          product_id: product.id,
          product_name: product.name,
          product_code: product.code,
          category_name: (product.category as unknown as { name: string })?.name || null,
          brand_name: (product.brand as unknown as { name: string })?.name || null,
          total_stock: totalStock,
          avg_cost: Math.round(avgCost * 100) / 100,
          stock_value: Math.round(totalValue * 100) / 100,
          low_stock_level: product.low_stock_level,
          reorder_level: product.reorder_level,
          warehouses: stocks.map((s) => ({
            warehouse_id: s.warehouse_id,
            warehouse_name: s.warehouse?.name || 'Unknown',
            current_stock: s.current_stock,
            avg_cost: s.avg_cost,
          })),
        };
      })
      .filter((p) => p.total_stock <= p.low_stock_level);
  } catch (error) {
    throw new Error(`Failed to fetch low stock products: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getReorderProducts(): Promise<StockSummaryItem[]> {
  try {
    const companyId = await getCompanyId();

    const { data, error } = await supabase
      .from('products')
      .select(`
        id, name, code, low_stock_level, reorder_level,
        category:categories(name),
        brand:brands(name),
        stocks:product_stock(
          product_id, warehouse_id, current_stock, avg_cost,
          warehouse:warehouses(id, name)
        )
      `)
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('name');

    if (error) throw error;

    return (data || [])
      .map((product) => {
        const stocks = (product.stocks as unknown as {
          warehouse_id: string;
          warehouse: { id: string; name: string } | null;
          current_stock: number;
          avg_cost: number;
        }[]) || [];

        const totalStock = stocks.reduce((sum, s) => sum + (s.current_stock || 0), 0);
        const totalValue = stocks.reduce((sum, s) => sum + (s.current_stock || 0) * (s.avg_cost || 0), 0);
        const avgCost = totalStock > 0 ? totalValue / totalStock : 0;

        return {
          product_id: product.id,
          product_name: product.name,
          product_code: product.code,
          category_name: (product.category as unknown as { name: string })?.name || null,
          brand_name: (product.brand as unknown as { name: string })?.name || null,
          total_stock: totalStock,
          avg_cost: Math.round(avgCost * 100) / 100,
          stock_value: Math.round(totalValue * 100) / 100,
          low_stock_level: product.low_stock_level,
          reorder_level: product.reorder_level,
          warehouses: stocks.map((s) => ({
            warehouse_id: s.warehouse_id,
            warehouse_name: s.warehouse?.name || 'Unknown',
            current_stock: s.current_stock,
            avg_cost: s.avg_cost,
          })),
        };
      })
      .filter((p) => p.reorder_level > 0 && p.total_stock <= p.reorder_level);
  } catch (error) {
    throw new Error(`Failed to fetch reorder products: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getStockValuation(
  filters: { category_id?: string; brand_id?: string } = {}
): Promise<{ items: StockValuationItem[]; total_value: number; total_quantity: number }> {
  try {
    const companyId = await getCompanyId();

    let query = supabase
      .from('products')
      .select(`
        id, name, code,
        category:categories(name),
        stocks:product_stock(current_stock, avg_cost)
      `)
      .eq('company_id', companyId)
      .eq('is_active', true);

    if (filters.category_id) {
      query = query.eq('category_id', filters.category_id);
    }
    if (filters.brand_id) {
      query = query.eq('brand_id', filters.brand_id);
    }

    const { data, error } = await query.order('name');
    if (error) throw error;

    const items: StockValuationItem[] = (data || []).map((product) => {
      const stocks = (product.stocks as unknown as { current_stock: number; avg_cost: number }[]) || [];
      const quantity = stocks.reduce((sum, s) => sum + (s.current_stock || 0), 0);
      const totalValue = stocks.reduce((sum, s) => sum + (s.current_stock || 0) * (s.avg_cost || 0), 0);
      const avgCost = quantity > 0 ? totalValue / quantity : 0;

      return {
        product_id: product.id,
        product_name: product.name,
        product_code: product.code,
        category_name: (product.category as unknown as { name: string })?.name || null,
        quantity,
        avg_cost: Math.round(avgCost * 100) / 100,
        total_value: Math.round(totalValue * 100) / 100,
      };
    });

    const totalValue = items.reduce((sum, i) => sum + i.total_value, 0);
    const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0);

    return {
      items,
      total_value: Math.round(totalValue * 100) / 100,
      total_quantity: totalQuantity,
    };
  } catch (error) {
    throw new Error(`Failed to fetch stock valuation: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}


export interface WarehouseOption {
  id: string;
  name: string;
  code: string | null;
  address: string | null;
  is_default: boolean;
}

/**
 * `warehouses` gained `code` and `is_default` in migration 005. The earlier
 * select referenced both while the table had neither, so this call failed
 * with a PostgREST "column does not exist" error every time.
 */
export async function getWarehouses(): Promise<WarehouseOption[]> {
  try {
    const companyId = await getCompanyId();

    const { data, error } = await supabase
      .from('warehouses')
      .select('id, name, code, address, is_default')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('is_default', { ascending: false })
      .order('name');

    if (error) throw error;
    return (data ?? []) as WarehouseOption[];
  } catch (error) {
    throw new Error(
      `Failed to fetch warehouses: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export async function getDefaultWarehouseId(): Promise<string> {
  const warehouses = await getWarehouses();
  const preferred = warehouses.find((w) => w.is_default) ?? warehouses[0];
  if (!preferred) throw new Error('No warehouse configured. Add a warehouse in Settings first.');
  return preferred.id;
}
export const stockService = {
  getWarehouses, getDefaultWarehouseId,
  getStockSummary, getProductStock, getStockMovements, adjustStock, transferStock,
  getLowStockProducts, getReorderProducts, getStockValuation,
};
