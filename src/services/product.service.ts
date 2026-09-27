import { supabase } from '@/lib/supabase';
import type { Product, ProductStock, StockMovement } from '@/types/database.types';
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

export async function getProducts(
  filters: ProductFilters = {},
  page: number = 1,
  perPage: number = 50
): Promise<ProductListResponse> {
  try {
    const companyId = await getCompanyId();
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    let query = supabase
      .from('products')
      .select(`
        *,
        category:categories(id, name),
        brand:brands(id, name),
        unit:units(id, name, short_name),
        stocks:product_stock(
          id, product_id, warehouse_id, current_stock, avg_cost, last_updated,
          warehouse:warehouses(id, name)
        )
      `, { count: 'exact' })
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
    if (filters.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    }

    query = query.order('name', { ascending: true }).range(from, to);

    const { data, error, count } = await query;
    if (error) throw error;

    const products = (data || []).map((p) => {
      const stocks = (p.stocks as unknown as ProductStockWithWarehouse[]) || [];
      const total_stock = stocks.reduce((sum, s) => sum + (s.current_stock || 0), 0);
      return { ...p, total_stock } as ProductWithRelations;
    });

    let filtered = products;
    if (filters.low_stock) {
      filtered = products.filter((p) => {
        const stock = p.total_stock || 0;
        return stock > 0 && stock <= (p.low_stock_level || 0);
      });
    }
    if (filters.out_of_stock) {
      filtered = products.filter((p) => (p.total_stock || 0) <= 0);
    }

    const total = count || 0;
    return {
      products: filtered,
      total,
      page,
      per_page: perPage,
      total_pages: Math.ceil(total / perPage),
    };
  } catch (error) {
    throw new Error(`Failed to fetch products: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

    const { id: _id, created_at, updated_at, ...rest } = original;
    const duplicateData = {
      ...rest,
      name: `${original.name} (Copy)`,
      code: `${original.code}-COPY`,
      created_at: undefined,
      updated_at: undefined,
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


export const productService = {
  getProducts, getProduct, createProduct, updateProduct, deleteProduct,
  duplicateProduct, getProductStock, importProducts, exportProducts,
};
