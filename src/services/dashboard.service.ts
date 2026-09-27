import { supabase } from '@/lib/supabase';
import type {
  SalesSummary,
  PurchaseSummary,
  StockSummary,
  LowStockProduct,
  FastMovingProduct,
  CustomerOutstanding,
  SupplierOutstanding,
  MonthlyTrend,
  TopParty,
  PaymentSummary,
  RecentTransaction,
  StockReport,
} from '@/types/dashboard.types';

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

export async function getSalesSummary(from: string, to: string): Promise<SalesSummary> {
  try {
    const companyId = await getCompanyId();

    const { data: allSales } = await supabase
      .from('transactions')
      .select('grand_total, document_date')
      .eq('company_id', companyId)
      .eq('type', 'sale')
      .not('status', 'eq', 'cancelled');

    const sales = allSales || [];
    const filteredSales = sales.filter(
      (s) => s.document_date >= from && s.document_date <= to
    );

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const monthStart = today.substring(0, 7) + '-01';
    const lastMonthDate = new Date();
    lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
    const lastMonthStart = lastMonthDate.toISOString().substring(0, 7) + '-01';
    const lastMonthEnd = lastMonthDate.toISOString().split('T')[0];

    const totalSales = filteredSales.reduce((sum, s) => sum + (s.grand_total || 0), 0);
    const totalInvoices = filteredSales.length;
    const todaySales = sales.filter((s) => s.document_date === today).reduce((sum, s) => sum + (s.grand_total || 0), 0);
    const yesterdaySales = sales.filter((s) => s.document_date === yesterday).reduce((sum, s) => sum + (s.grand_total || 0), 0);
    const monthSales = sales.filter((s) => s.document_date >= monthStart && s.document_date <= today).reduce((sum, s) => sum + (s.grand_total || 0), 0);
    const lastMonthSales = sales.filter((s) => s.document_date >= lastMonthStart && s.document_date <= lastMonthEnd).reduce((sum, s) => sum + (s.grand_total || 0), 0);

    return {
      total_sales: totalSales,
      total_invoices: totalInvoices,
      total_items_sold: 0,
      avg_invoice_value: totalInvoices > 0 ? totalSales / totalInvoices : 0,
      today_sales: todaySales,
      month_sales: monthSales,
      yesterday_sales: yesterdaySales,
      last_month_sales: lastMonthSales,
      sales_growth_percent: lastMonthSales > 0 ? ((monthSales - lastMonthSales) / lastMonthSales) * 100 : 0,
    };
  } catch (error) {
    throw new Error(`Failed to fetch sales summary: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getPurchaseSummary(from: string, to: string): Promise<PurchaseSummary> {
  try {
    const companyId = await getCompanyId();

    const { data: allPurchases } = await supabase
      .from('transactions')
      .select('grand_total, document_date')
      .eq('company_id', companyId)
      .eq('type', 'purchase')
      .not('status', 'eq', 'cancelled');

    const purchases = allPurchases || [];
    const filteredPurchases = purchases.filter(
      (p) => p.document_date >= from && p.document_date <= to
    );

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const monthStart = today.substring(0, 7) + '-01';
    const lastMonthDate = new Date();
    lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
    const lastMonthStart = lastMonthDate.toISOString().substring(0, 7) + '-01';
    const lastMonthEnd = lastMonthDate.toISOString().split('T')[0];

    const totalPurchases = filteredPurchases.reduce((sum, p) => sum + (p.grand_total || 0), 0);
    const totalInvoices = filteredPurchases.length;
    const todayPurchases = purchases.filter((p) => p.document_date === today).reduce((sum, p) => sum + (p.grand_total || 0), 0);
    const yesterdayPurchases = purchases.filter((p) => p.document_date === yesterday).reduce((sum, p) => sum + (p.grand_total || 0), 0);
    const monthPurchases = purchases.filter((p) => p.document_date >= monthStart && p.document_date <= today).reduce((sum, p) => sum + (p.grand_total || 0), 0);
    const lastMonthPurchases = purchases.filter((p) => p.document_date >= lastMonthStart && p.document_date <= lastMonthEnd).reduce((sum, p) => sum + (p.grand_total || 0), 0);

    return {
      total_purchases: totalPurchases,
      total_invoices: totalInvoices,
      total_items_purchased: 0,
      avg_invoice_value: totalInvoices > 0 ? totalPurchases / totalInvoices : 0,
      today_purchases: todayPurchases,
      month_purchases: monthPurchases,
      yesterday_purchases: yesterdayPurchases,
      last_month_purchases: lastMonthPurchases,
      purchase_growth_percent: lastMonthPurchases > 0 ? ((monthPurchases - lastMonthPurchases) / lastMonthPurchases) * 100 : 0,
    };
  } catch (error) {
    throw new Error(`Failed to fetch purchase summary: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getStockSummaryDashboard(): Promise<StockSummary> {
  try {
    const companyId = await getCompanyId();

    const { data: products } = await supabase
      .from('products')
      .select('id, low_stock_level')
      .eq('company_id', companyId)
      .eq('is_active', true);

    const { data: stockData } = await supabase
      .from('product_stock')
      .select('product_id, current_stock, avg_cost')
      .in('product_id', (products || []).map((p) => p.id));

    const { data: warehouses } = await supabase
      .from('warehouses')
      .select('id')
      .eq('company_id', companyId)
      .eq('is_active', true);

    const totalProducts = (products || []).length;
    const stocks = stockData || [];
    const totalStockQuantity = stocks.reduce((sum, s) => sum + (s.current_stock || 0), 0);
    const totalStockValue = stocks.reduce((sum, s) => sum + (s.current_stock || 0) * (s.avg_cost || 0), 0);

    let lowStockCount = 0;
    let outOfStockCount = 0;
    const productStockMap = new Map<string, number>();
    stocks.forEach((s) => {
      const current = productStockMap.get(s.product_id) || 0;
      productStockMap.set(s.product_id, current + (s.current_stock || 0));
    });
    (products || []).forEach((p) => {
      const qty = productStockMap.get(p.id) || 0;
      if (qty <= 0) outOfStockCount++;
      else if (qty <= (p.low_stock_level || 0)) lowStockCount++;
    });

    return {
      total_products: totalProducts,
      total_stock_value: Math.round(totalStockValue * 100) / 100,
      total_stock_quantity: totalStockQuantity,
      low_stock_count: lowStockCount,
      out_of_stock_count: outOfStockCount,
      total_warehouses: (warehouses || []).length,
    };
  } catch (error) {
    throw new Error(`Failed to fetch stock summary: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getLowStockItems(): Promise<LowStockProduct[]> {
  try {
    const companyId = await getCompanyId();

    const { data: products, error } = await supabase
      .from('products')
      .select(`
        id, name, code, low_stock_level,
        category:categories(name),
        brand:brands(name),
        stocks:product_stock(current_stock)
      `)
      .eq('company_id', companyId)
      .eq('is_active', true);

    if (error) throw error;

    const results: LowStockProduct[] = [];
    (products || []).forEach((p) => {
      const stocks = (p.stocks as unknown as { current_stock: number }[]) || [];
      const totalStock = stocks.reduce((sum, s) => sum + (s.current_stock || 0), 0);
      if (totalStock <= (p.low_stock_level || 0)) {
        results.push({
          product_id: p.id,
          product_name: p.name,
          product_code: p.code,
          current_stock: totalStock,
          low_stock_level: p.low_stock_level,
          brand_name: (p.brand as unknown as { name: string })?.name || null,
          category_name: (p.category as unknown as { name: string })?.name || null,
        });
      }
    });

    return results.sort((a, b) => a.current_stock - b.current_stock);
  } catch (error) {
    throw new Error(`Failed to fetch low stock items: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getFastMovingItems(from: string, to: string, limit: number = 10): Promise<FastMovingProduct[]> {
  try {
    const companyId = await getCompanyId();

    const { data: txnItems, error } = await supabase
      .from('transaction_items')
      .select(`
        product_id, product_name, product_code, quantity, total_amount,
        transaction:transactions!inner(company_id, type, document_date, status)
      `)
      .eq('transaction.company_id', companyId)
      .eq('transaction.type', 'sale')
      .not('transaction.status', 'eq', 'cancelled')
      .gte('transaction.document_date', from)
      .lte('transaction.document_date', to);

    if (error) throw error;

    const productMap = new Map<string, FastMovingProduct>();
    (txnItems || []).forEach((item) => {
      const txn = item.transaction as unknown as { company_id: string };
      if (!txn) return;
      const existing = productMap.get(item.product_id);
      if (existing) {
        existing.total_quantity += item.quantity;
        existing.total_revenue += item.total_amount;
        existing.order_count += 1;
      } else {
        productMap.set(item.product_id, {
          product_id: item.product_id,
          product_name: item.product_name,
          product_code: item.product_code || '',
          total_quantity: item.quantity,
          total_revenue: item.total_amount,
          order_count: 1,
        });
      }
    });

    return Array.from(productMap.values())
      .sort((a, b) => b.total_quantity - a.total_quantity)
      .slice(0, limit);
  } catch (error) {
    throw new Error(`Failed to fetch fast moving items: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getSlowMovingItems(from: string, to: string, limit: number = 10): Promise<FastMovingProduct[]> {
  try {
    const companyId = await getCompanyId();

    const { data: allProducts } = await supabase
      .from('products')
      .select('id, name, code')
      .eq('company_id', companyId)
      .eq('is_active', true);

    const { data: txnItems } = await supabase
      .from('transaction_items')
      .select(`
        product_id, quantity, total_amount,
        transaction:transactions!inner(company_id, type, document_date, status)
      `)
      .eq('transaction.company_id', companyId)
      .eq('transaction.type', 'sale')
      .not('transaction.status', 'eq', 'cancelled')
      .gte('transaction.document_date', from)
      .lte('transaction.document_date', to);

    const salesMap = new Map<string, { quantity: number; revenue: number; count: number }>();
    (txnItems || []).forEach((item) => {
      const existing = salesMap.get(item.product_id);
      if (existing) {
        existing.quantity += item.quantity;
        existing.revenue += item.total_amount;
        existing.count += 1;
      } else {
        salesMap.set(item.product_id, {
          quantity: item.quantity,
          revenue: item.total_amount,
          count: 1,
        });
      }
    });

    const results: FastMovingProduct[] = [];
    (allProducts || []).forEach((p) => {
      const sales = salesMap.get(p.id);
      results.push({
        product_id: p.id,
        product_name: p.name,
        product_code: p.code,
        total_quantity: sales?.quantity || 0,
        total_revenue: sales?.revenue || 0,
        order_count: sales?.count || 0,
      });
    });

    return results
      .sort((a, b) => a.total_quantity - b.total_quantity)
      .filter((r) => r.total_quantity > 0)
      .slice(0, limit);
  } catch (error) {
    throw new Error(`Failed to fetch slow moving items: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getNonMovingItems(days: number = 90, limit: number = 10): Promise<FastMovingProduct[]> {
  try {
    const companyId = await getCompanyId();
    const cutoffDate = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];

    const { data: recentSaleItems } = await supabase
      .from('transaction_items')
      .select(`
        product_id,
        transaction:transactions!inner(company_id, type, document_date, status)
      `)
      .eq('transaction.company_id', companyId)
      .eq('transaction.type', 'sale')
      .not('transaction.status', 'eq', 'cancelled')
      .gte('transaction.document_date', cutoffDate);

    const soldProductIds = new Set((recentSaleItems || []).map((i) => i.product_id));

    const { data: allProducts } = await supabase
      .from('products')
      .select(`
        id, name, code,
        stocks:product_stock(current_stock)
      `)
      .eq('company_id', companyId)
      .eq('is_active', true);

    const results: FastMovingProduct[] = [];
    (allProducts || []).forEach((p) => {
      if (!soldProductIds.has(p.id)) {
        const stocks = (p.stocks as unknown as { current_stock: number }[]) || [];
        const totalStock = stocks.reduce((sum, s) => sum + (s.current_stock || 0), 0);
        if (totalStock > 0) {
          results.push({
            product_id: p.id,
            product_name: p.name,
            product_code: p.code,
            total_quantity: totalStock,
            total_revenue: 0,
            order_count: 0,
          });
        }
      }
    });

    return results.slice(0, limit);
  } catch (error) {
    throw new Error(`Failed to fetch non-moving items: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getCustomerOutstandingDashboard(): Promise<CustomerOutstanding[]> {
  try {
    const companyId = await getCompanyId();

    const { data: customers, error } = await supabase
      .from('customers')
      .select('id, name, credit_limit, opening_balance')
      .eq('company_id', companyId)
      .eq('is_active', true);

    if (error) throw error;

    const results: CustomerOutstanding[] = [];
    for (const c of customers || []) {
      const { data: ledger } = await supabase
        .from('customer_ledger')
        .select('debit, credit')
        .eq('customer_id', c.id);

      const entries = ledger || [];
      const totalDebit = entries.reduce((sum, e) => sum + (e.debit || 0), 0);
      const totalCredit = entries.reduce((sum, e) => sum + (e.credit || 0), 0);
      const balance = (c.opening_balance || 0) + totalDebit - totalCredit;

      if (balance > 0) {
        results.push({
          customer_id: c.id,
          customer_name: c.name,
          outstanding_balance: balance,
          credit_limit: c.credit_limit || 0,
          over_limit: c.credit_limit > 0 && balance > c.credit_limit,
        });
      }
    }

    return results.sort((a, b) => b.outstanding_balance - a.outstanding_balance);
  } catch (error) {
    throw new Error(`Failed to fetch customer outstanding: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getSupplierOutstandingDashboard(): Promise<SupplierOutstanding[]> {
  try {
    const companyId = await getCompanyId();

    const { data: suppliers, error } = await supabase
      .from('suppliers')
      .select('id, name, opening_balance')
      .eq('company_id', companyId)
      .eq('is_active', true);

    if (error) throw error;

    const results: SupplierOutstanding[] = [];
    for (const s of suppliers || []) {
      const { data: ledger } = await supabase
        .from('supplier_ledger')
        .select('debit, credit')
        .eq('supplier_id', s.id);

      const entries = ledger || [];
      const totalDebit = entries.reduce((sum, e) => sum + (e.debit || 0), 0);
      const totalCredit = entries.reduce((sum, e) => sum + (e.credit || 0), 0);
      const balance = (s.opening_balance || 0) + totalDebit - totalCredit;

      if (balance > 0) {
        results.push({
          supplier_id: s.id,
          supplier_name: s.name,
          outstanding_balance: balance,
        });
      }
    }

    return results.sort((a, b) => b.outstanding_balance - a.outstanding_balance);
  } catch (error) {
    throw new Error(`Failed to fetch supplier outstanding: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getRecentActivity(limit: number = 10): Promise<RecentTransaction[]> {
  try {
    const companyId = await getCompanyId();

    const { data, error } = await supabase
      .from('transactions')
      .select(`
        id, document_number, document_date, type, grand_total, status,
        customer:customers(name),
        supplier:suppliers(name)
      `)
      .eq('company_id', companyId)
      .not('status', 'eq', 'cancelled')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data || []).map((t) => ({
      id: t.id,
      document_number: t.document_number,
      document_date: t.document_date,
      type: t.type,
      party_name: (t.customer as unknown as { name: string })?.name || (t.supplier as unknown as { name: string })?.name || '',
      grand_total: t.grand_total,
      status: t.status,
    }));
  } catch (error) {
    throw new Error(`Failed to fetch recent activity: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getSalesTrend(from: string, to: string): Promise<MonthlyTrend[]> {
  try {
    const companyId = await getCompanyId();

    const { data, error } = await supabase
      .from('transactions')
      .select('grand_total, document_date')
      .eq('company_id', companyId)
      .eq('type', 'sale')
      .not('status', 'eq', 'cancelled')
      .gte('document_date', from)
      .lte('document_date', to)
      .order('document_date');

    if (error) throw error;

    const monthlyMap = new Map<string, MonthlyTrend>();
    (data || []).forEach((t) => {
      const monthKey = t.document_date.substring(0, 7);
      const existing = monthlyMap.get(monthKey);
      if (existing) {
        existing.amount += t.grand_total || 0;
        existing.count += 1;
      } else {
        monthlyMap.set(monthKey, {
          month: monthKey,
          year: parseInt(monthKey.split('-')[0], 10),
          amount: t.grand_total || 0,
          count: 1,
        });
      }
    });

    return Array.from(monthlyMap.values()).sort((a, b) => a.month.localeCompare(b.month));
  } catch (error) {
    throw new Error(`Failed to fetch sales trend: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getTopSellingProducts(from: string, to: string, limit: number = 10): Promise<TopParty[]> {
  try {
    const companyId = await getCompanyId();

    const { data: txnItems, error } = await supabase
      .from('transaction_items')
      .select(`
        product_id, product_name, total_amount,
        transaction:transactions!inner(company_id, type, document_date, status)
      `)
      .eq('transaction.company_id', companyId)
      .eq('transaction.type', 'sale')
      .not('transaction.status', 'eq', 'cancelled')
      .gte('transaction.document_date', from)
      .lte('transaction.document_date', to);

    if (error) throw error;

    const productMap = new Map<string, TopParty>();
    (txnItems || []).forEach((item) => {
      const existing = productMap.get(item.product_id);
      if (existing) {
        existing.total_amount += item.total_amount;
        existing.transaction_count += 1;
      } else {
        productMap.set(item.product_id, {
          id: item.product_id,
          name: item.product_name,
          total_amount: item.total_amount,
          transaction_count: 1,
        });
      }
    });

    return Array.from(productMap.values())
      .sort((a, b) => b.total_amount - a.total_amount)
      .slice(0, limit);
  } catch (error) {
    throw new Error(`Failed to fetch top selling products: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getCategoryWiseStock(): Promise<{ category: string; total_stock: number; total_value: number }[]> {
  try {
    const companyId = await getCompanyId();

    const { data: products, error } = await supabase
      .from('products')
      .select(`
        id, category_id,
        category:categories(name),
        stocks:product_stock(current_stock, avg_cost)
      `)
      .eq('company_id', companyId)
      .eq('is_active', true);

    if (error) throw error;

    const categoryMap = new Map<string, { category: string; total_stock: number; total_value: number }>();
    (products || []).forEach((p) => {
      const catName = (p.category as unknown as { name: string })?.name || 'Uncategorized';
      const stocks = (p.stocks as unknown as { current_stock: number; avg_cost: number }[]) || [];
      const productStock = stocks.reduce((sum, s) => sum + (s.current_stock || 0), 0);
      const productValue = stocks.reduce((sum, s) => sum + (s.current_stock || 0) * (s.avg_cost || 0), 0);

      const existing = categoryMap.get(catName);
      if (existing) {
        existing.total_stock += productStock;
        existing.total_value += productValue;
      } else {
        categoryMap.set(catName, {
          category: catName,
          total_stock: productStock,
          total_value: productValue,
        });
      }
    });

    return Array.from(categoryMap.values()).sort((a, b) => b.total_value - a.total_value);
  } catch (error) {
    throw new Error(`Failed to fetch category wise stock: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}


export const dashboardService = {
  getSalesSummary,
  getPurchaseSummary,
  getStockSummaryDashboard,
  getLowStockItems,
  getFastMovingItems,
  getSlowMovingItems,
  getNonMovingItems,
  getCustomerOutstandingDashboard,
  getSupplierOutstandingDashboard,
  getRecentActivity,
  getSalesTrend,
  getTopSellingProducts,
  getCategoryWiseStock,
};

