import { supabase } from '@/lib/supabase';
import type { Transaction, TransactionItem, TransactionType, TransactionStatus, Address } from '@/types/database.types';
import type {
  TransactionWithRelations,
  TransactionFormData,
  TransactionFilters,
  TransactionListResponse,
  TransactionPrintData,
  TaxSummary,
} from '@/types/transaction.types';
import { amountInWords, isSameState, roundTo2 } from '@/lib/utils';
import { calculateGSTBreakdown } from '@/lib/calculations';
import { getCompanyId, getCurrentUserId, getDefaultWarehouseId } from '@/lib/tenant';

let companyStateCache: { companyId: string; state: string } | null = null;

async function getCompanyState(): Promise<string> {
  const companyId = await getCompanyId();
  if (companyStateCache?.companyId === companyId) return companyStateCache.state;

  const { data } = await supabase
    .from('companies')
    .select('state')
    .eq('id', companyId)
    .maybeSingle();

  const state = (data as { state?: string | null } | null)?.state ?? '';
  companyStateCache = { companyId, state };
  return state;
}

async function loadPartyState(data: Partial<TransactionFormData>) {
  const companyId = await getCompanyId();

  if (isSale(data.type ?? 'sale')) {
    if (!data.customer_id) return {};
    const { data: row } = await supabase
      .from('customers')
      .select('state')
      .eq('id', data.customer_id)
      .eq('company_id', companyId)
      .maybeSingle();
    return { customer: (row as { state?: string | null } | null) ?? null };
  }

  if (!data.supplier_id) return {};
  const { data: row } = await supabase
    .from('suppliers')
    .select('state')
    .eq('id', data.supplier_id)
    .eq('company_id', companyId)
    .maybeSingle();
  return { supplier: (row as { state?: string | null } | null) ?? null };
}

const PARTY_BASE_FIELDS = 'id, name, code, phone, email, gstin, state, billing_address, shipping_address';

/**
 * `payment_terms` exists on `suppliers` only -- `customers` has no such column,
 * and PostgREST rejects the whole embedded query with a 400 if you ask for it.
 * So the two parties get separate field lists.
 */
const CUSTOMER_ADDRESS_FIELDS = PARTY_BASE_FIELDS;
const SUPPLIER_ADDRESS_FIELDS = `id, name, code, phone, email, gstin, state, payment_terms, billing_address, shipping_address`;

function isSale(type: TransactionType): boolean {
  return type === 'sale';
}

function partyStateOf(
  data: Partial<TransactionFormData>,
  fallback: { customer?: { state?: string | null } | null; supplier?: { state?: string | null } | null }
): string {
  const fromAddress =
    (data.billing_address as Address | null | undefined)?.state ??
    (data.shipping_address as Address | null | undefined)?.state ??
    '';
  if (fromAddress) return fromAddress;
  if (isSale(data.type ?? 'sale')) return fallback.customer?.state ?? '';
  return fallback.supplier?.state ?? '';
}

interface ComputedLine {
  insert: Record<string, unknown>;
  taxableValue: number;
  tax: { cgst: number; sgst: number; igst: number; totalTax: number };
  lineTotal: number;
}

function computeLines(
  items: TransactionFormData['items'],
  interState: boolean
): { lines: ComputedLine[]; subtotal: number; taxableTotal: number; taxTotal: number } {
  const lines: ComputedLine[] = [];
  let subtotal = 0;
  let taxableTotal = 0;
  let taxTotal = 0;

  items.forEach((item, index) => {
    const lineTotal = roundTo2(item.quantity * item.rate);
    const discountAmount = roundTo2(
      item.discount_percent > 0 ? (lineTotal * item.discount_percent) / 100 : item.discount_amount || 0
    );
    const taxableValue = roundTo2(lineTotal - discountAmount);
    const tax = calculateGSTBreakdown(taxableValue, item.gst_rate, interState);

    subtotal = roundTo2(subtotal + lineTotal);
    taxableTotal = roundTo2(taxableTotal + taxableValue);
    taxTotal = roundTo2(taxTotal + tax.totalTax);

    lines.push({
      taxableValue,
      tax,
      lineTotal,
      insert: {
        product_id: item.product_id || null,
        product_name: item.product_name,
        product_code: item.product_code || null,
        brand_name: item.brand_name || null,
        description: null,
        hsn_sac: item.hsn_sac ?? null,
        quantity: item.quantity,
        unit: item.unit || null,
        rate: item.rate,
        discount_percent: item.discount_percent || 0,
        discount_amount: discountAmount,
        taxable_value: taxableValue,
        gst_rate: item.gst_rate,
        cgst_amount: tax.cgst,
        sgst_amount: tax.sgst,
        igst_amount: tax.igst,
        total_amount: tax.totalAmount,
        sort_order: item.sort_order ?? index,
      },
    });
  });

  return { lines, subtotal, taxableTotal, taxTotal };
}

export async function getTransactions(
  type?: TransactionType,
  filters: TransactionFilters = {},
  page: number = 1,
  perPage: number = 50
): Promise<TransactionListResponse> {
  try {
    const companyId = await getCompanyId();
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    let query = supabase
      .from('transactions')
      .select(`
        *,
        customer:customers(${CUSTOMER_ADDRESS_FIELDS}),
        supplier:suppliers(${SUPPLIER_ADDRESS_FIELDS}),
        created_by_user:profiles!transactions_created_by_fkey(id, full_name, email),
        approved_by_user:profiles!transactions_approved_by_fkey(id, full_name, email)
      `, { count: 'exact' })
      .eq('company_id', companyId);

    if (type) {
      query = query.eq('type', type);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.customer_id) {
      query = query.eq('customer_id', filters.customer_id);
    }
    if (filters.supplier_id) {
      query = query.eq('supplier_id', filters.supplier_id);
    }
    if (filters.date_from) {
      query = query.gte('document_date', filters.date_from);
    }
    if (filters.date_to) {
      query = query.lte('document_date', filters.date_to);
    }
    if (filters.search) {
      query = query.or(`document_number.ilike.%${filters.search}%,reference_number.ilike.%${filters.search}%`);
    }
    if (filters.min_amount !== undefined) {
      query = query.gte('grand_total', filters.min_amount);
    }
    if (filters.max_amount !== undefined) {
      query = query.lte('grand_total', filters.max_amount);
    }

    query = query.order('document_date', { ascending: false }).range(from, to);

    const { data, error, count } = await query;
    if (error) throw error;

    const total = count || 0;
    return {
      transactions: (data || []) as TransactionWithRelations[],
      total,
      page,
      per_page: perPage,
      total_pages: Math.ceil(total / perPage),
    };
  } catch (error) {
    throw new Error(`Failed to fetch transactions: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getTransaction(id: string): Promise<TransactionWithRelations> {
  try {
    const companyId = await getCompanyId();
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        customer:customers(${CUSTOMER_ADDRESS_FIELDS}),
        supplier:suppliers(${SUPPLIER_ADDRESS_FIELDS}),
        created_by_user:profiles!transactions_created_by_fkey(id, full_name, email),
        approved_by_user:profiles!transactions_approved_by_fkey(id, full_name, email)
      `)
      .eq('id', id)
      .eq('company_id', companyId)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Transaction not found');

    const { data: items, error: itemsError } = await supabase
      .from('transaction_items')
      .select('*')
      .eq('transaction_id', id)
      .order('sort_order');

    if (itemsError) throw itemsError;

    return {
      ...data,
      items: (items || []) as TransactionItem[],
    } as unknown as TransactionWithRelations;
  } catch (error) {
    throw new Error(`Failed to fetch transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function createTransaction(data: TransactionFormData): Promise<Transaction> {
  try {
    const companyId = await getCompanyId();
    const userId = await getCurrentUserId();

    const docNumber = data.document_number || (await getNextDocumentNumber(data.type));

    // Resolve the party so the CGST/SGST vs IGST split is correct.
    // Previously this compared the company UUID against an empty
    // string, which is always "inter-state", so IGST was added on
    // top of CGST + SGST and every total was double-taxed.
    const party = await loadPartyState(data);
    const companyState = await getCompanyState();
    const interState = !isSameState(companyState, partyStateOf(data, party));

    const { lines, subtotal, taxableTotal, taxTotal } = computeLines(data.items, interState);

    // Header discount applies on top of per-line discounts
    const headerDiscount = roundTo2(data.discount_amount || 0);
    const taxableAmount = roundTo2(Math.max(0, taxableTotal - headerDiscount));
    const taxAfterDiscount = roundTo2(taxTotal * (taxableAmount / (taxableTotal || 1)));
    const grandTotal = roundTo2(taxableAmount + taxAfterDiscount + (data.round_off || 0));

    const transactionInsert = {
      company_id: companyId,
      type: data.type,
      document_number: docNumber,
      document_date: data.document_date,
      reference_number: data.reference_number || null,
      reference_date: data.reference_date || null,
      customer_id: data.customer_id || null,
      supplier_id: data.supplier_id || null,
      billing_address: data.billing_address || null,
      shipping_address: data.shipping_address || null,
      subtotal: roundTo2(subtotal - headerDiscount),
      discount_amount: headerDiscount,
      tax_amount: taxAfterDiscount,
      round_off: roundTo2(data.round_off || 0),
      grand_total: grandTotal,
      amount_paid: 0,
      status: data.status || 'draft',
      notes: data.notes || null,
      terms: data.terms || null,
      gstin: data.gstin || null,
      validity_date: data.validity_date || null,
      expected_delivery: data.expected_delivery || null,
      salesperson: data.salesperson || null,
      created_by: userId,
    };

    const { data: transaction, error: txnError } = await supabase
      .from('transactions')
      .insert(transactionInsert)
      .select()
      .single();

    if (txnError) throw txnError;

    if (lines.length > 0) {
      const { error: itemsError } = await supabase
        .from('transaction_items')
        .insert(lines.map((line) => ({ ...line.insert, transaction_id: transaction.id })));

      if (itemsError) {
        // Roll the header back so we never leave an itemless document
        await supabase.from('transactions').delete().eq('id', transaction.id);
        throw itemsError;
      }
    }

    return transaction;
  } catch (error) {
    throw new Error(`Failed to create transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function updateTransaction(id: string, data: Partial<TransactionFormData>): Promise<Transaction> {
  try {
    const companyId = await getCompanyId();

    // Verify ownership BEFORE touching any child rows. Previously the
    // line items were deleted first, so a foreign transaction id
    // destroyed another tenant's document.
    const { data: existing, error: existingErr } = await supabase
      .from('transactions')
      .select('id, status')
      .eq('id', id)
      .eq('company_id', companyId)
      .maybeSingle();

    if (existingErr) throw existingErr;
    if (!existing) throw new Error('Transaction not found');
    if (existing.status === 'cancelled') throw new Error('Cannot edit a cancelled transaction');

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (data.document_number !== undefined) updateData.document_number = data.document_number;
    if (data.document_date !== undefined) updateData.document_date = data.document_date;
    if (data.reference_number !== undefined) updateData.reference_number = data.reference_number || null;
    if (data.reference_date !== undefined) updateData.reference_date = data.reference_date || null;
    if (data.customer_id !== undefined) updateData.customer_id = data.customer_id || null;
    if (data.supplier_id !== undefined) updateData.supplier_id = data.supplier_id || null;
    if (data.billing_address !== undefined) updateData.billing_address = data.billing_address;
    if (data.shipping_address !== undefined) updateData.shipping_address = data.shipping_address;
    if (data.notes !== undefined) updateData.notes = data.notes || null;
    if (data.terms !== undefined) updateData.terms = data.terms || null;
    if (data.gstin !== undefined) updateData.gstin = data.gstin || null;
    if (data.validity_date !== undefined) updateData.validity_date = data.validity_date || null;
    if (data.expected_delivery !== undefined) updateData.expected_delivery = data.expected_delivery || null;
    if (data.salesperson !== undefined) updateData.salesperson = data.salesperson || null;
    if (data.status !== undefined) updateData.status = data.status;

    let lines: ComputedLine[] = [];

    if (data.items) {
      const party = await loadPartyState({ ...data, type: data.type });
      const companyState = await getCompanyState();
      const interState = !isSameState(companyState, partyStateOf(data, party));

      const computed = computeLines(data.items, interState);
      lines = computed.lines;

      const headerDiscount = roundTo2(data.discount_amount || 0);
      const taxableAmount = roundTo2(Math.max(0, computed.taxableTotal - headerDiscount));
      const taxAfterDiscount = roundTo2(computed.taxTotal * (taxableAmount / (computed.taxableTotal || 1)));
      const grandTotal = roundTo2(taxableAmount + taxAfterDiscount + (data.round_off || 0));

      updateData.subtotal = roundTo2(computed.subtotal - headerDiscount);
      updateData.discount_amount = headerDiscount;
      updateData.tax_amount = taxAfterDiscount;
      updateData.round_off = roundTo2(data.round_off || 0);
      updateData.grand_total = grandTotal;

      const { error: deleteErr } = await supabase
        .from('transaction_items')
        .delete()
        .eq('transaction_id', id);

      if (deleteErr) throw deleteErr;

      if (lines.length > 0) {
        const { error: itemsError } = await supabase
          .from('transaction_items')
          .insert(lines.map((line) => ({ ...line.insert, transaction_id: id })));

        if (itemsError) throw itemsError;
      }
    }

    const { data: transaction, error } = await supabase
      .from('transactions')
      .update(updateData)
      .eq('id', id)
      .eq('company_id', companyId)
      .select()
      .single();

    if (error) throw error;
    if (!transaction) throw new Error('Transaction not found');
    return transaction;
  } catch (error) {
    throw new Error(`Failed to update transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function deleteTransaction(id: string): Promise<void> {
  try {
    const companyId = await getCompanyId();

    const { data: txn, error: fetchErr } = await supabase
      .from('transactions')
      .select('status')
      .eq('id', id)
      .eq('company_id', companyId)
      .single();

    if (fetchErr || !txn) throw new Error('Transaction not found');
    if (txn.status === 'confirmed' || txn.status === 'paid' || txn.status === 'partial' || txn.status === 'approved') {
      throw new Error('Cannot delete a posted transaction. Cancel it instead.');
    }

    await supabase.from('transaction_items').delete().eq('transaction_id', id);

    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)
      .eq('company_id', companyId);

    if (error) throw error;
  } catch (error) {
    throw new Error(`Failed to delete transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Posting applies stock movements, the movement ledger and the party
 * ledger inside a single database transaction. The previous
 * implementation read-modify-wrote stock line by line in the browser,
 * wrote the literal string 'default' into a UUID column, and discarded
 * the error — so posting either did nothing or corrupted stock.
 */
export async function postTransaction(id: string): Promise<Transaction> {
  try {
    const companyId = await getCompanyId();

    const { error } = await supabase.rpc('post_document_stock', {
      p_transaction_id: id,
    });

    if (error) throw error;

    const { data, error: fetchErr } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', id)
      .eq('company_id', companyId)
      .single();

    if (fetchErr) throw fetchErr;
    return data;
  } catch (error) {
    throw new Error(`Failed to post transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function cancelTransaction(id: string): Promise<Transaction> {
  try {
    const companyId = await getCompanyId();

    const { error } = await supabase.rpc('cancel_document_stock', {
      p_transaction_id: id,
    });

    if (error) throw error;

    const { data, error: fetchErr } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', id)
      .eq('company_id', companyId)
      .single();

    if (fetchErr) throw fetchErr;
    return data;
  } catch (error) {
    throw new Error(`Failed to cancel transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function convertTransaction(
  fromId: string,
  toType: TransactionType
): Promise<Transaction> {
  try {
    const companyId = await getCompanyId();

    const { data: original, error: fetchErr } = await supabase
      .from('transactions')
      .select('*, items:transaction_items(*)')
      .eq('id', fromId)
      .eq('company_id', companyId)
      .single();

    if (fetchErr || !original) throw new Error('Source transaction not found');

    const items = (original.items as unknown as TransactionItem[]) || [];
    const newDocNumber = await getNextDocumentNumber(toType);

    const newTransaction: TransactionFormData = {
      type: toType,
      document_number: newDocNumber,
      document_date: new Date().toISOString().split('T')[0],
      reference_number: original.document_number,
      reference_date: original.document_date,
      customer_id: original.customer_id,
      supplier_id: original.supplier_id,
      billing_address: original.billing_address,
      shipping_address: original.shipping_address,
      items: items.map((item) => ({
        product_id: item.product_id,
        product_name: item.product_name,
        product_code: item.product_code || '',
        brand_name: item.brand_name || '',
        hsn_sac: item.hsn_sac || null,
        quantity: item.quantity,
        unit: item.unit || 'NOS',
        rate: item.rate,
        discount_percent: item.discount_percent,
        discount_amount: item.discount_amount,
        gst_rate: item.gst_rate,
        sort_order: item.sort_order,
      })),
      discount_amount: original.discount_amount,
      round_off: original.round_off,
      notes: original.notes || '',
      terms: original.terms || '',
      status: 'draft',
    };

    return await createTransaction(newTransaction);
  } catch (error) {
    throw new Error(`Failed to convert transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Allocates the next document number inside a database advisory lock.
 * The previous version read the last number and incremented it in the
 * browser, so two users saving at the same time minted the same number.
 */
export async function getNextDocumentNumber(type: TransactionType): Promise<string> {
  try {
    const companyId = await getCompanyId();

    const { data, error } = await supabase.rpc('next_document_number', {
      p_company_id: companyId,
      p_type: type,
    });

    if (error) throw error;
    if (!data) throw new Error('Could not allocate a document number');
    return String(data);
  } catch (error) {
    throw new Error(`Failed to generate document number: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function duplicateTransaction(
  id: string,
  newType?: TransactionType,
  newDate?: string
): Promise<Transaction> {
  try {
    const original = await getTransaction(id);

    const items = (original.items || []) as TransactionItem[];

    const duplicatedData: TransactionFormData = {
      type: newType || original.type,
      document_number: '',
      document_date: newDate || new Date().toISOString().split('T')[0],
      reference_number: original.reference_number || '',
      reference_date: original.reference_date || '',
      customer_id: original.customer_id,
      supplier_id: original.supplier_id,
      billing_address: original.billing_address,
      shipping_address: original.shipping_address,
      items: items.map((item) => ({
        product_id: item.product_id,
        product_name: item.product_name,
        product_code: item.product_code || '',
        brand_name: item.brand_name || '',
        hsn_sac: item.hsn_sac || null,
        quantity: item.quantity,
        unit: item.unit || 'NOS',
        rate: item.rate,
        discount_percent: item.discount_percent,
        discount_amount: item.discount_amount,
        gst_rate: item.gst_rate,
        sort_order: item.sort_order,
      })),
      discount_amount: original.discount_amount,
      round_off: original.round_off,
      notes: original.notes || '',
      terms: original.terms || '',
      status: 'draft',
    };

    return await createTransaction(duplicatedData);
  } catch (error) {
    throw new Error(`Failed to duplicate transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function printTransaction(id: string): Promise<TransactionPrintData> {
  try {
    const companyId = await getCompanyId();

    const { data: company } = await supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .single();

    const transaction = await getTransaction(id);
    const items = (transaction.items || []) as TransactionItem[];

    const taxSummary: TaxSummary[] = [];
    const hsnMap = new Map<string, TaxSummary>();

    for (const item of items) {
      // Group by HSN/SAC, falling back to the product code. The snapshot
      // column is preferred because the product's HSN may have changed
      // since the document was issued.
      const hsn = item.hsn_sac || item.product_code || '0000';
      const key = `${hsn}@${item.gst_rate}`;
      const existing = hsnMap.get(key);
      if (existing) {
        existing.taxable_value = roundTo2(existing.taxable_value + item.taxable_value);
        existing.cgst_amount = roundTo2(existing.cgst_amount + item.cgst_amount);
        existing.sgst_amount = roundTo2(existing.sgst_amount + item.sgst_amount);
        existing.igst_amount = roundTo2(existing.igst_amount + item.igst_amount);
        existing.total = roundTo2(existing.total + item.total_amount);
      } else {
        hsnMap.set(key, {
          hsn_sac: hsn,
          taxable_value: item.taxable_value,
          cgst_rate: item.cgst_amount > 0 ? item.gst_rate / 2 : 0,
          cgst_amount: item.cgst_amount,
          sgst_rate: item.sgst_amount > 0 ? item.gst_rate / 2 : 0,
          sgst_amount: item.sgst_amount,
          igst_rate: item.igst_amount > 0 ? item.gst_rate : 0,
          igst_amount: item.igst_amount,
          total: item.total_amount,
        });
      }
    }

    return {
      company: {
        name: company?.name || '',
        logo_url: company?.logo_url || null,
        address: company?.address || '',
        city: company?.city || '',
        state: company?.state || '',
        pin: company?.pin || '',
        phone: company?.phone || '',
        email: company?.email || '',
        gstin: company?.gstin || '',
        pan: company?.pan || '',
      },
      transaction,
      items,
      tax_summary: Array.from(hsnMap.values()),
      amount_in_words: amountInWords(transaction.grand_total),
    };
  } catch (error) {
    throw new Error(`Failed to prepare print data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}


export const transactionService = {
  getTransactions, getTransaction, createTransaction, updateTransaction, deleteTransaction,
  postTransaction, cancelTransaction, convertTransaction, getNextDocumentNumber,
  duplicateTransaction, printTransaction,
};
