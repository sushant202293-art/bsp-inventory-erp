import { supabase } from '@/lib/supabase';
import type { PaymentReceived, PaymentMade } from '@/types/database.types';

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

export interface PaymentFilters {
  customer_id?: string;
  supplier_id?: string;
  date_from?: string;
  date_to?: string;
  mode?: string;
  search?: string;
  min_amount?: number;
  max_amount?: number;
}

export interface PaymentListResponse<T> {
  payments: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface PaymentSummary {
  total_amount: number;
  total_payments: number;
  pending_amount: number;
  payments_by_mode: Record<string, number>;
  recent_payments: { date: string; amount: number; mode: string }[];
}

export async function getPaymentsReceived(
  filters: PaymentFilters = {},
  page: number = 1,
  perPage: number = 50
): Promise<PaymentListResponse<PaymentReceived>> {
  try {
    const companyId = await getCompanyId();
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    let query = supabase
      .from('payments_received')
      .select(`
        *,
        customer:customers(id, name, code, phone)
      `, { count: 'exact' })
      .eq('company_id', companyId);

    if (filters.customer_id) {
      query = query.eq('customer_id', filters.customer_id);
    }
    if (filters.date_from) {
      query = query.gte('date', filters.date_from);
    }
    if (filters.date_to) {
      query = query.lte('date', filters.date_to);
    }
    if (filters.mode) {
      query = query.eq('mode', filters.mode);
    }
    if (filters.search) {
      query = query.or(`reference_number.ilike.%${filters.search}%,notes.ilike.%${filters.search}%`);
    }
    if (filters.min_amount !== undefined) {
      query = query.gte('amount', filters.min_amount);
    }
    if (filters.max_amount !== undefined) {
      query = query.lte('amount', filters.max_amount);
    }

    query = query.order('date', { ascending: false }).range(from, to);

    const { data, error, count } = await query;
    if (error) throw error;

    return {
      payments: (data || []) as PaymentReceived[],
      total: count || 0,
      page,
      per_page: perPage,
      total_pages: Math.ceil((count || 0) / perPage),
    };
  } catch (error) {
    throw new Error(`Failed to fetch payments received: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getPaymentsMade(
  filters: PaymentFilters = {},
  page: number = 1,
  perPage: number = 50
): Promise<PaymentListResponse<PaymentMade>> {
  try {
    const companyId = await getCompanyId();
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    let query = supabase
      .from('payments_made')
      .select(`
        *,
        supplier:suppliers(id, name, code, phone)
      `, { count: 'exact' })
      .eq('company_id', companyId);

    if (filters.supplier_id) {
      query = query.eq('supplier_id', filters.supplier_id);
    }
    if (filters.date_from) {
      query = query.gte('date', filters.date_from);
    }
    if (filters.date_to) {
      query = query.lte('date', filters.date_to);
    }
    if (filters.mode) {
      query = query.eq('mode', filters.mode);
    }
    if (filters.search) {
      query = query.or(`reference_number.ilike.%${filters.search}%,notes.ilike.%${filters.search}%`);
    }
    if (filters.min_amount !== undefined) {
      query = query.gte('amount', filters.min_amount);
    }
    if (filters.max_amount !== undefined) {
      query = query.lte('amount', filters.max_amount);
    }

    query = query.order('date', { ascending: false }).range(from, to);

    const { data, error, count } = await query;
    if (error) throw error;

    return {
      payments: (data || []) as PaymentMade[],
      total: count || 0,
      page,
      per_page: perPage,
      total_pages: Math.ceil((count || 0) / perPage),
    };
  } catch (error) {
    throw new Error(`Failed to fetch payments made: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function createPaymentReceived(data: {
  customer_id: string;
  date: string;
  amount: number;
  mode: string;
  reference_number?: string;
  bank_name?: string;
  transaction_id?: string;
  notes?: string;
}): Promise<PaymentReceived> {
  try {
    const companyId = await getCompanyId();
    const userId = await getCurrentUserId();

    const { data: customer, error: custErr } = await supabase
      .from('customers')
      .select('id, opening_balance, opening_balance_type')
      .eq('id', data.customer_id)
      .eq('company_id', companyId)
      .single();

    if (custErr || !customer) throw new Error('Customer not found');

    const { data: payment, error: payErr } = await supabase
      .from('payments_received')
      .insert({
        company_id: companyId,
        customer_id: data.customer_id,
        date: data.date,
        amount: data.amount,
        mode: data.mode as 'cash' | 'bank' | 'upi' | 'cheque' | 'other',
        reference_number: data.reference_number || null,
        bank_name: data.bank_name || null,
        transaction_id: data.transaction_id || null,
        notes: data.notes || null,
        created_by: userId,
      })
      .select()
      .single();

    if (payErr) throw payErr;

    await supabase
      .from('customer_ledger')
      .insert({
        customer_id: data.customer_id,
        date: data.date,
        description: `Payment received - ${data.reference_number || 'N/A'}`,
        debit: 0,
        credit: data.amount,
        balance: 0,
        reference_type: 'payment',
        reference_id: payment.id,
      });

    if (data.transaction_id) {
      const { data: txn } = await supabase
        .from('transactions')
        .select('amount_paid, grand_total')
        .eq('id', data.transaction_id)
        .single();

      if (txn) {
        const newAmountPaid = (txn.amount_paid || 0) + data.amount;
        const newStatus = newAmountPaid >= txn.grand_total ? 'paid' : 'partial';
        await supabase
          .from('transactions')
          .update({
            amount_paid: newAmountPaid,
            status: newStatus,
            updated_at: new Date().toISOString(),
          })
          .eq('id', data.transaction_id);
      }
    }

    return payment;
  } catch (error) {
    throw new Error(`Failed to create payment received: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function createPaymentMade(data: {
  supplier_id: string;
  date: string;
  amount: number;
  mode: string;
  reference_number?: string;
  bank_name?: string;
  transaction_id?: string;
  notes?: string;
}): Promise<PaymentMade> {
  try {
    const companyId = await getCompanyId();
    const userId = await getCurrentUserId();

    const { data: supplier, error: supErr } = await supabase
      .from('suppliers')
      .select('id')
      .eq('id', data.supplier_id)
      .eq('company_id', companyId)
      .single();

    if (supErr || !supplier) throw new Error('Supplier not found');

    const { data: payment, error: payErr } = await supabase
      .from('payments_made')
      .insert({
        company_id: companyId,
        supplier_id: data.supplier_id,
        date: data.date,
        amount: data.amount,
        mode: data.mode as 'cash' | 'bank' | 'upi' | 'cheque' | 'other',
        reference_number: data.reference_number || null,
        bank_name: data.bank_name || null,
        transaction_id: data.transaction_id || null,
        notes: data.notes || null,
        created_by: userId,
      })
      .select()
      .single();

    if (payErr) throw payErr;

    await supabase
      .from('supplier_ledger')
      .insert({
        supplier_id: data.supplier_id,
        date: data.date,
        description: `Payment made - ${data.reference_number || 'N/A'}`,
        debit: data.amount,
        credit: 0,
        balance: 0,
        reference_type: 'payment',
        reference_id: payment.id,
      });

    if (data.transaction_id) {
      const { data: txn } = await supabase
        .from('transactions')
        .select('amount_paid, grand_total')
        .eq('id', data.transaction_id)
        .single();

      if (txn) {
        const newAmountPaid = (txn.amount_paid || 0) + data.amount;
        const newStatus = newAmountPaid >= txn.grand_total ? 'paid' : 'partial';
        await supabase
          .from('transactions')
          .update({
            amount_paid: newAmountPaid,
            status: newStatus,
            updated_at: new Date().toISOString(),
          })
          .eq('id', data.transaction_id);
      }
    }

    return payment;
  } catch (error) {
    throw new Error(`Failed to create payment made: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function updatePaymentReceived(id: string, data: Partial<{
  date: string;
  amount: number;
  mode: string;
  reference_number: string;
  bank_name: string;
  notes: string;
}>): Promise<PaymentReceived> {
  try {
    const companyId = await getCompanyId();

    const updateData: Record<string, unknown> = {};
    if (data.date !== undefined) updateData.date = data.date;
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.mode !== undefined) updateData.mode = data.mode;
    if (data.reference_number !== undefined) updateData.reference_number = data.reference_number;
    if (data.bank_name !== undefined) updateData.bank_name = data.bank_name;
    if (data.notes !== undefined) updateData.notes = data.notes;

    const { data: payment, error } = await supabase
      .from('payments_received')
      .update(updateData)
      .eq('id', id)
      .eq('company_id', companyId)
      .select()
      .single();

    if (error) throw error;
    if (!payment) throw new Error('Payment not found');
    return payment;
  } catch (error) {
    throw new Error(`Failed to update payment received: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function updatePaymentMade(id: string, data: Partial<{
  date: string;
  amount: number;
  mode: string;
  reference_number: string;
  bank_name: string;
  notes: string;
}>): Promise<PaymentMade> {
  try {
    const companyId = await getCompanyId();

    const updateData: Record<string, unknown> = {};
    if (data.date !== undefined) updateData.date = data.date;
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.mode !== undefined) updateData.mode = data.mode;
    if (data.reference_number !== undefined) updateData.reference_number = data.reference_number;
    if (data.bank_name !== undefined) updateData.bank_name = data.bank_name;
    if (data.notes !== undefined) updateData.notes = data.notes;

    const { data: payment, error } = await supabase
      .from('payments_made')
      .update(updateData)
      .eq('id', id)
      .eq('company_id', companyId)
      .select()
      .single();

    if (error) throw error;
    if (!payment) throw new Error('Payment not found');
    return payment;
  } catch (error) {
    throw new Error(`Failed to update payment made: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function deletePayment(id: string, type: 'received' | 'made'): Promise<void> {
  try {
    const companyId = await getCompanyId();
    const table = type === 'received' ? 'payments_received' : 'payments_made';

    const { data: payment, error: fetchErr } = await supabase
      .from(table)
      .select('*')
      .eq('id', id)
      .eq('company_id', companyId)
      .single();

    if (fetchErr || !payment) throw new Error('Payment not found');

    if (payment.transaction_id) {
      const { data: txn } = await supabase
        .from('transactions')
        .select('amount_paid, grand_total')
        .eq('id', payment.transaction_id)
        .single();

      if (txn) {
        const newAmountPaid = Math.max(0, (txn.amount_paid || 0) - payment.amount);
        const newStatus = newAmountPaid <= 0 ? 'draft' : newAmountPaid >= txn.grand_total ? 'paid' : 'partial';
        await supabase
          .from('transactions')
          .update({
            amount_paid: newAmountPaid,
            status: newStatus,
            updated_at: new Date().toISOString(),
          })
          .eq('id', payment.transaction_id);
      }
    }

    if (type === 'received') {
      await supabase
        .from('customer_ledger')
        .delete()
        .eq('reference_type', 'payment')
        .eq('reference_id', id);
    } else {
      await supabase
        .from('supplier_ledger')
        .delete()
        .eq('reference_type', 'payment')
        .eq('reference_id', id);
    }

    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id)
      .eq('company_id', companyId);

    if (error) throw error;
  } catch (error) {
    throw new Error(`Failed to delete payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getCustomerPaymentSummary(customerId: string): Promise<PaymentSummary> {
  try {
    const companyId = await getCompanyId();

    const { data, error } = await supabase
      .from('payments_received')
      .select('*')
      .eq('company_id', companyId)
      .eq('customer_id', customerId)
      .order('date', { ascending: false });

    if (error) throw error;

    const payments = data || [];
    const totalAmount = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

    const paymentsByMode: Record<string, number> = {};
    payments.forEach((p) => {
      const mode = p.mode || 'unknown';
      paymentsByMode[mode] = (paymentsByMode[mode] || 0) + (p.amount || 0);
    });

    const { data: txnData } = await supabase
      .from('transactions')
      .select('grand_total, amount_paid')
      .eq('company_id', companyId)
      .eq('customer_id', customerId)
      .eq('type', 'sale')
      .not('status', 'eq', 'cancelled');

    const totalSaleAmount = (txnData || []).reduce((sum, t) => sum + (t.grand_total || 0), 0);
    const totalPaidAgainstSale = (txnData || []).reduce((sum, t) => sum + (t.amount_paid || 0), 0);

    return {
      total_amount: totalSaleAmount,
      total_payments: totalAmount,
      pending_amount: Math.max(0, totalSaleAmount - totalPaidAgainstSale),
      payments_by_mode: paymentsByMode,
      recent_payments: payments.slice(0, 10).map((p) => ({
        date: p.date,
        amount: p.amount,
        mode: p.mode,
      })),
    };
  } catch (error) {
    throw new Error(`Failed to fetch customer payment summary: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getSupplierPaymentSummary(supplierId: string): Promise<PaymentSummary> {
  try {
    const companyId = await getCompanyId();

    const { data, error } = await supabase
      .from('payments_made')
      .select('*')
      .eq('company_id', companyId)
      .eq('supplier_id', supplierId)
      .order('date', { ascending: false });

    if (error) throw error;

    const payments = data || [];
    const totalAmount = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

    const paymentsByMode: Record<string, number> = {};
    payments.forEach((p) => {
      const mode = p.mode || 'unknown';
      paymentsByMode[mode] = (paymentsByMode[mode] || 0) + (p.amount || 0);
    });

    const { data: txnData } = await supabase
      .from('transactions')
      .select('grand_total, amount_paid')
      .eq('company_id', companyId)
      .eq('supplier_id', supplierId)
      .eq('type', 'purchase')
      .not('status', 'eq', 'cancelled');

    const totalPurchaseAmount = (txnData || []).reduce((sum, t) => sum + (t.grand_total || 0), 0);
    const totalPaidAgainstPurchase = (txnData || []).reduce((sum, t) => sum + (t.amount_paid || 0), 0);

    return {
      total_amount: totalPurchaseAmount,
      total_payments: totalAmount,
      pending_amount: Math.max(0, totalPurchaseAmount - totalPaidAgainstPurchase),
      payments_by_mode: paymentsByMode,
      recent_payments: payments.slice(0, 10).map((p) => ({
        date: p.date,
        amount: p.amount,
        mode: p.mode,
      })),
    };
  } catch (error) {
    throw new Error(`Failed to fetch supplier payment summary: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}


export const paymentService = {
  getPaymentsReceived, getPaymentsMade, createPaymentReceived, createPaymentMade,
  updatePaymentReceived, updatePaymentMade, deletePayment,
  getCustomerPaymentSummary, getSupplierPaymentSummary,
};
