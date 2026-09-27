import { supabase } from '@/lib/supabase';
import type {
  SalesReport,
  PurchaseReport,
  StockReport,
  GSTReport,
  ReceivablesAging,
  PayablesAging,
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

export interface ReportFilters {
  date_from?: string;
  date_to?: string;
  customer_id?: string;
  supplier_id?: string;
  category_id?: string;
  product_id?: string;
  group_by?: string;
}

export async function getSalesRegister(filters: ReportFilters = {}): Promise<SalesReport[]> {
  try {
    const companyId = await getCompanyId();

    let query = supabase
      .from('transactions')
      .select('grand_total, tax_amount, document_date, status')
      .eq('company_id', companyId)
      .eq('type', 'sale')
      .not('status', 'eq', 'cancelled');

    if (filters.date_from) query = query.gte('document_date', filters.date_from);
    if (filters.date_to) query = query.lte('document_date', filters.date_to);
    if (filters.customer_id) query = query.eq('customer_id', filters.customer_id);

    const { data, error } = await query.order('document_date');
    if (error) throw error;

    const grouped = new Map<string, SalesReport>();
    (data || []).forEach((t) => {
      const period = t.document_date.substring(0, 7);
      const existing = grouped.get(period);
      if (existing) {
        existing.total_sales += t.grand_total || 0;
        existing.total_tax += t.tax_amount || 0;
        existing.invoice_count += 1;
      } else {
        grouped.set(period, {
          period,
          total_sales: t.grand_total || 0,
          total_returns: 0,
          net_sales: t.grand_total || 0,
          total_tax: t.tax_amount || 0,
          invoice_count: 1,
          avg_invoice_value: t.grand_total || 0,
        });
      }
    });

    return Array.from(grouped.values()).map((r) => ({
      ...r,
      net_sales: r.total_sales - r.total_returns,
      avg_invoice_value: r.invoice_count > 0 ? r.total_sales / r.invoice_count : 0,
    }));
  } catch (error) {
    throw new Error(`Failed to fetch sales register: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getPurchaseRegister(filters: ReportFilters = {}): Promise<PurchaseReport[]> {
  try {
    const companyId = await getCompanyId();

    let query = supabase
      .from('transactions')
      .select('grand_total, tax_amount, document_date, status')
      .eq('company_id', companyId)
      .eq('type', 'purchase')
      .not('status', 'eq', 'cancelled');

    if (filters.date_from) query = query.gte('document_date', filters.date_from);
    if (filters.date_to) query = query.lte('document_date', filters.date_to);
    if (filters.supplier_id) query = query.eq('supplier_id', filters.supplier_id);

    const { data, error } = await query.order('document_date');
    if (error) throw error;

    const grouped = new Map<string, PurchaseReport>();
    (data || []).forEach((t) => {
      const period = t.document_date.substring(0, 7);
      const existing = grouped.get(period);
      if (existing) {
        existing.total_purchases += t.grand_total || 0;
        existing.total_tax += t.tax_amount || 0;
        existing.invoice_count += 1;
      } else {
        grouped.set(period, {
          period,
          total_purchases: t.grand_total || 0,
          total_returns: 0,
          net_purchases: t.grand_total || 0,
          total_tax: t.tax_amount || 0,
          invoice_count: 1,
          avg_invoice_value: t.grand_total || 0,
        });
      }
    });

    return Array.from(grouped.values()).map((r) => ({
      ...r,
      net_purchases: r.total_purchases - r.total_returns,
      avg_invoice_value: r.invoice_count > 0 ? r.total_purchases / r.invoice_count : 0,
    }));
  } catch (error) {
    throw new Error(`Failed to fetch purchase register: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getStockSummaryReport(filters: ReportFilters = {}): Promise<StockReport[]> {
  try {
    const companyId = await getCompanyId();

    let productQuery = supabase
      .from('products')
      .select(`
        id, name, code,
        stocks:product_stock(current_stock, avg_cost)
      `)
      .eq('company_id', companyId)
      .eq('is_active', true);

    if (filters.category_id) productQuery = productQuery.eq('category_id', filters.category_id);

    const { data: products, error: prodErr } = await productQuery.order('name');
    if (prodErr) throw prodErr;

    const results: StockReport[] = [];
    for (const product of products || []) {
      const stocks = (product.stocks as unknown as { current_stock: number; avg_cost: number }[]) || [];
      const closingStock = stocks.reduce((sum, s) => sum + (s.current_stock || 0), 0);
      const stockValue = stocks.reduce((sum, s) => sum + (s.current_stock || 0) * (s.avg_cost || 0), 0);

      const { data: movements } = await supabase
        .from('stock_movements')
        .select('type, quantity')
        .eq('product_id', product.id)
        .eq('company_id', companyId);

      let purchases = 0;
      let sales = 0;
      let returnsIn = 0;
      let returnsOut = 0;
      let adjustments = 0;

      (movements || []).forEach((m) => {
        switch (m.type) {
          case 'purchase': purchases += m.quantity; break;
          case 'sales': sales += m.quantity; break;
          case 'sales_return': returnsIn += m.quantity; break;
          case 'purchase_return': returnsOut += m.quantity; break;
          case 'adjustment_in': adjustments += m.quantity; break;
          case 'adjustment_out': adjustments -= m.quantity; break;
        }
      });

      const openingStock = closingStock - purchases - returnsIn + sales + returnsOut - adjustments;

      results.push({
        product_id: product.id,
        product_name: product.name,
        product_code: product.code,
        opening_stock: Math.max(0, openingStock),
        purchases,
        sales,
        returns_in: returnsIn,
        returns_out: returnsOut,
        adjustments,
        closing_stock: closingStock,
        stock_value: Math.round(stockValue * 100) / 100,
      });
    }

    return results;
  } catch (error) {
    throw new Error(`Failed to fetch stock summary report: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getStockMovementReport(filters: ReportFilters = {}): Promise<StockReport[]> {
  return getStockSummaryReport(filters);
}

export async function getReceivableAgingReport(): Promise<ReceivablesAging[]> {
  try {
    const companyId = await getCompanyId();

    const { data: customers, error } = await supabase
      .from('customers')
      .select('id, name, opening_balance')
      .eq('company_id', companyId)
      .eq('is_active', true);

    if (error) throw error;

    const today = new Date();
    const results: ReceivablesAging[] = [];

    for (const customer of customers || []) {
      const { data: transactions } = await supabase
        .from('transactions')
        .select('grand_total, amount_paid, document_date')
        .eq('company_id', companyId)
        .eq('customer_id', customer.id)
        .eq('type', 'sale')
        .not('status', 'eq', 'cancelled');

      const { data: payments } = await supabase
        .from('payments_received')
        .select('amount, date')
        .eq('company_id', companyId)
        .eq('customer_id', customer.id);

      let totalDue = customer.opening_balance || 0;
      const ageBuckets = { current: 0, days_1_30: 0, days_31_60: 0, days_61_90: 0, over_90: 0 };

      (transactions || []).forEach((t) => {
        const balance = (t.grand_total || 0) - (t.amount_paid || 0);
        if (balance > 0) {
          const daysDiff = Math.floor((today.getTime() - new Date(t.document_date).getTime()) / 86400000);
          if (daysDiff <= 0) ageBuckets.current += balance;
          else if (daysDiff <= 30) ageBuckets.days_1_30 += balance;
          else if (daysDiff <= 60) ageBuckets.days_31_60 += balance;
          else if (daysDiff <= 90) ageBuckets.days_61_90 += balance;
          else ageBuckets.over_90 += balance;
          totalDue += balance;
        }
      });

      if (totalDue > 0) {
        results.push({
          customer_id: customer.id,
          customer_name: customer.name,
          current: ageBuckets.current,
          days_1_30: ageBuckets.days_1_30,
          days_31_60: ageBuckets.days_31_60,
          days_61_90: ageBuckets.days_61_90,
          over_90: ageBuckets.over_90,
          total: totalDue,
        });
      }
    }

    return results.sort((a, b) => b.total - a.total);
  } catch (error) {
    throw new Error(`Failed to fetch receivable aging report: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getPayableAgingReport(): Promise<PayablesAging[]> {
  try {
    const companyId = await getCompanyId();

    const { data: suppliers, error } = await supabase
      .from('suppliers')
      .select('id, name, opening_balance')
      .eq('company_id', companyId)
      .eq('is_active', true);

    if (error) throw error;

    const today = new Date();
    const results: PayablesAging[] = [];

    for (const supplier of suppliers || []) {
      const { data: transactions } = await supabase
        .from('transactions')
        .select('grand_total, amount_paid, document_date')
        .eq('company_id', companyId)
        .eq('supplier_id', supplier.id)
        .eq('type', 'purchase')
        .not('status', 'eq', 'cancelled');

      let totalDue = supplier.opening_balance || 0;
      const ageBuckets = { current: 0, days_1_30: 0, days_31_60: 0, days_61_90: 0, over_90: 0 };

      (transactions || []).forEach((t) => {
        const balance = (t.grand_total || 0) - (t.amount_paid || 0);
        if (balance > 0) {
          const daysDiff = Math.floor((today.getTime() - new Date(t.document_date).getTime()) / 86400000);
          if (daysDiff <= 0) ageBuckets.current += balance;
          else if (daysDiff <= 30) ageBuckets.days_1_30 += balance;
          else if (daysDiff <= 60) ageBuckets.days_31_60 += balance;
          else if (daysDiff <= 90) ageBuckets.days_61_90 += balance;
          else ageBuckets.over_90 += balance;
          totalDue += balance;
        }
      });

      if (totalDue > 0) {
        results.push({
          supplier_id: supplier.id,
          supplier_name: supplier.name,
          current: ageBuckets.current,
          days_1_30: ageBuckets.days_1_30,
          days_31_60: ageBuckets.days_31_60,
          days_61_90: ageBuckets.days_61_90,
          over_90: ageBuckets.over_90,
          total: totalDue,
        });
      }
    }

    return results.sort((a, b) => b.total - a.total);
  } catch (error) {
    throw new Error(`Failed to fetch payable aging report: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getGSTSummary(filters: ReportFilters = {}): Promise<GSTReport> {
  try {
    const companyId = await getCompanyId();

    let saleQuery = supabase
      .from('transaction_items')
      .select(`
        taxable_value, cgst_amount, sgst_amount, igst_amount, gst_rate,
        transaction:transactions!inner(company_id, type, document_date, status)
      `)
      .eq('transaction.company_id', companyId)
      .eq('transaction.type', 'sale')
      .not('transaction.status', 'eq', 'cancelled');

    let purchaseQuery = supabase
      .from('transaction_items')
      .select(`
        taxable_value, cgst_amount, sgst_amount, igst_amount, gst_rate,
        transaction:transactions!inner(company_id, type, document_date, status)
      `)
      .eq('transaction.company_id', companyId)
      .eq('transaction.type', 'purchase')
      .not('transaction.status', 'eq', 'cancelled');

    if (filters.date_from) {
      saleQuery = saleQuery.gte('transaction.document_date', filters.date_from);
      purchaseQuery = purchaseQuery.gte('transaction.document_date', filters.date_from);
    }
    if (filters.date_to) {
      saleQuery = saleQuery.lte('transaction.document_date', filters.date_to);
      purchaseQuery = purchaseQuery.lte('transaction.document_date', filters.date_to);
    }

    const { data: saleItems } = await saleQuery;
    const { data: purchaseItems } = await purchaseQuery;

    let cgstCollected = 0;
    let sgstCollected = 0;
    let igstCollected = 0;
    (saleItems || []).forEach((item) => {
      cgstCollected += item.cgst_amount || 0;
      sgstCollected += item.sgst_amount || 0;
      igstCollected += item.igst_amount || 0;
    });

    let cgstPaid = 0;
    let sgstPaid = 0;
    let igstPaid = 0;
    (purchaseItems || []).forEach((item) => {
      cgstPaid += item.cgst_amount || 0;
      sgstPaid += item.sgst_amount || 0;
      igstPaid += item.igst_amount || 0;
    });

    const period = filters.date_from && filters.date_to
      ? `${filters.date_from} to ${filters.date_to}`
      : 'All Time';

    return {
      period,
      cgst_collected: cgstCollected,
      sgst_collected: sgstCollected,
      igst_collected: igstCollected,
      total_output_tax: cgstCollected + sgstCollected + igstCollected,
      cgst_paid: cgstPaid,
      sgst_paid: sgstPaid,
      igst_paid: igstPaid,
      total_input_tax: cgstPaid + sgstPaid + igstPaid,
      net_tax_payable: (cgstCollected + sgstCollected + igstCollected) - (cgstPaid + sgstPaid + igstPaid),
    };
  } catch (error) {
    throw new Error(`Failed to fetch GST summary: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}


export const reportService = {
  getSalesRegister, getPurchaseRegister, getStockSummaryReport,
  getStockMovementReport, getReceivableAgingReport, getPayableAgingReport, getGSTSummary,
};
