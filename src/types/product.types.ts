import { Product, ProductStock, Category, Brand, Unit } from './database.types';

export interface ProductWithRelations extends Product {
  category?: Category | null;
  brand?: Brand | null;
  unit?: Unit | null;
  stocks?: ProductStockWithWarehouse[];
  total_stock?: number;
}

export interface ProductStockWithWarehouse extends ProductStock {
  warehouse?: {
    id: string;
    name: string;
  };
}

export interface ProductFormData {
  name: string;
  code: string;
  category_id: string | null;
  brand_id: string | null;
  color: string;
  size: string;
  unit_id: string | null;
  gst_rate: number;
  hsn_sac: string;
  description: string;
  purchase_price: number;
  selling_price: number;
  low_stock_level: number;
  reorder_level: number;
  image_url: string;
  barcode: string;
  is_active: boolean;
}

export interface ProductFilters {
  limit?: number;
  offset?: number;
  search?: string;
  category_id?: string;
  brand_id?: string;
  unit_id?: string;
  is_active?: boolean;
  low_stock?: boolean;
  out_of_stock?: boolean;
}

export interface ProductListResponse {
  products: ProductWithRelations[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface StockAdjustment {
  product_id: string;
  warehouse_id: string;
  quantity: number;
  type: 'adjustment_in' | 'adjustment_out';
  notes: string;
}

export interface StockTransfer {
  product_id: string;
  from_warehouse_id: string;
  to_warehouse_id: string;
  quantity: number;
  notes: string;
}

export interface BarcodeSearchResult {
  product: ProductWithRelations;
  stock: ProductStockWithWarehouse[];
}

export interface ProductImportRow {
  name: string;
  code: string;
  category: string;
  brand: string;
  color: string;
  size: string;
  unit: string;
  gst_rate: number;
  hsn_sac: string;
  purchase_price: number;
  selling_price: number;
  low_stock_level: number;
  barcode: string;
}

export interface ProductExportRow {
  code: string;
  name: string;
  category: string;
  brand: string;
  color: string;
  size: string;
  unit: string;
  gst_rate: number;
  hsn_sac: string;
  purchase_price: number;
  selling_price: number;
  low_stock_level: number;
  reorder_level: number;
  barcode: string;
  current_stock: number;
  is_active: boolean;
}

export interface CategoryWithChildren extends Category {
  children?: CategoryWithChildren[];
  product_count?: number;
}

export interface BrandWithStats extends Brand {
  product_count?: number;
}

export interface UnitWithBase extends Unit {
  base_unit?: Unit | null;
  child_units?: Unit[];
  product_count?: number;
}
