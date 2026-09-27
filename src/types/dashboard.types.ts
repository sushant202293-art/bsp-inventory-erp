export interface DashboardData {
  sales_summary: SalesSummary;
  purchase_summary: PurchaseSummary;
  stock_summary: StockSummary;
  low_stock_products: LowStockProduct[];
  fast_moving_products: FastMovingProduct[];
  customer_outstanding: CustomerOutstanding[];
  supplier_outstanding: SupplierOutstanding[];
  recent_transactions: RecentTransaction[];
  monthly_sales_trend: MonthlyTrend[];
  monthly_purchase_trend: MonthlyTrend[];
  top_customers: TopParty[];
  top_suppliers: TopParty[];
  payment_summary: PaymentSummary;
}

export interface SalesSummary {
  total_sales: number;
  total_invoices: number;
  total_items_sold: number;
  avg_invoice_value: number;
  today_sales: number;
  month_sales: number;
  yesterday_sales: number;
  last_month_sales: number;
  sales_growth_percent: number;
}

export interface PurchaseSummary {
  total_purchases: number;
  total_invoices: number;
  total_items_purchased: number;
  avg_invoice_value: number;
  today_purchases: number;
  month_purchases: number;
  yesterday_purchases: number;
  last_month_purchases: number;
  purchase_growth_percent: number;
}

export interface StockSummary {
  total_products: number;
  total_stock_value: number;
  total_stock_quantity: number;
  low_stock_count: number;
  out_of_stock_count: number;
  total_warehouses: number;
}

export interface LowStockProduct {
  product_id: string;
  product_name: string;
  product_code: string;
  current_stock: number;
  low_stock_level: number;
  brand_name: string | null;
  category_name: string | null;
}

export interface FastMovingProduct {
  product_id: string;
  product_name: string;
  product_code: string;
  total_quantity: number;
  total_revenue: number;
  order_count: number;
}

export interface CustomerOutstanding {
  customer_id: string;
  customer_name: string;
  outstanding_balance: number;
  credit_limit: number;
  over_limit: boolean;
}

export interface SupplierOutstanding {
  supplier_id: string;
  supplier_name: string;
  outstanding_balance: number;
}

export interface RecentTransaction {
  id: string;
  document_number: string;
  document_date: string;
  type: string;
  party_name: string;
  grand_total: number;
  status: string;
}

export interface MonthlyTrend {
  month: string;
  year: number;
  amount: number;
  count: number;
}

export interface TopParty {
  id: string;
  name: string;
  total_amount: number;
  transaction_count: number;
}

export interface PaymentSummary {
  total_received: number;
  total_made: number;
  net_cash_flow: number;
  pending_receivable: number;
  pending_payable: number;
}

export interface DashboardFilters {
  date_from?: string;
  date_to?: string;
  warehouse_id?: string;
}

export interface SalesReport {
  period: string;
  total_sales: number;
  total_returns: number;
  net_sales: number;
  total_tax: number;
  invoice_count: number;
  avg_invoice_value: number;
}

export interface PurchaseReport {
  period: string;
  total_purchases: number;
  total_returns: number;
  net_purchases: number;
  total_tax: number;
  invoice_count: number;
  avg_invoice_value: number;
}

export interface StockReport {
  product_id: string;
  product_name: string;
  product_code: string;
  opening_stock: number;
  purchases: number;
  sales: number;
  returns_in: number;
  returns_out: number;
  adjustments: number;
  closing_stock: number;
  stock_value: number;
}

export interface ProfitLossReport {
  period: string;
  sales_revenue: number;
  sales_returns: number;
  net_sales: number;
  cost_of_goods: number;
  gross_profit: number;
  gross_margin_percent: number;
  other_income: number;
  expenses: number;
  net_profit: number;
  net_margin_percent: number;
}

export interface GSTReport {
  period: string;
  cgst_collected: number;
  sgst_collected: number;
  igst_collected: number;
  total_output_tax: number;
  cgst_paid: number;
  sgst_paid: number;
  igst_paid: number;
  total_input_tax: number;
  net_tax_payable: number;
}

export interface ReceivablesAging {
  customer_id: string;
  customer_name: string;
  current: number;
  days_1_30: number;
  days_31_60: number;
  days_61_90: number;
  over_90: number;
  total: number;
}

export interface PayablesAging {
  supplier_id: string;
  supplier_name: string;
  current: number;
  days_1_30: number;
  days_31_60: number;
  days_61_90: number;
  over_90: number;
  total: number;
}
