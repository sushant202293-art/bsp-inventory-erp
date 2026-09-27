import { supabase } from '@/lib/supabase';
import type { Supplier, SupplierLedger } from '@/types/database.types';
import type {
  SupplierWithRelations,
  SupplierFormData,
  SupplierFilters,
  SupplierListResponse,
  SupplierLedgerEntry,
  SupplierLedgerResponse,
  SupplierOutstanding,
  SupplierImportRow,
  SupplierExportRow,
} from '@/types/supplier.types';

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

export async function getSuppliers(
  filters: SupplierFilters = {},
  page: number = 1,
  perPage: number = 50
): Promise<SupplierListResponse> {
  try {
    const companyId = await getCompanyId();
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    let query = supabase
      .from('suppliers')
      .select('*', { count: 'exact' })
      .eq('company_id', companyId);

    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,code.ilike.%${filters.search}%,phone.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
    }
    if (filters.city) {
      query = query.eq('city', filters.city);
    }
    if (filters.state) {
      query = query.eq('state', filters.state);
    }
    if (filters.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    }

    query = query.order('name', { ascending: true }).range(from, to);

    const { data, error, count } = await query;
    if (error) throw error;

    const suppliers = (data || []) as SupplierWithRelations[];
    let filtered = suppliers;

    if (filters.has_balance) {
      filtered = suppliers.filter((s) => s.opening_balance !== 0);
    }

    const total = count || 0;
    return {
      suppliers: filtered,
      total,
      page,
      per_page: perPage,
      total_pages: Math.ceil(total / perPage),
    };
  } catch (error) {
    throw new Error(`Failed to fetch suppliers: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getSupplier(id: string): Promise<SupplierWithRelations> {
  try {
    const companyId = await getCompanyId();
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('id', id)
      .eq('company_id', companyId)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Supplier not found');
    return data as SupplierWithRelations;
  } catch (error) {
    throw new Error(`Failed to fetch supplier: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function createSupplier(data: SupplierFormData): Promise<Supplier> {
  try {
    const companyId = await getCompanyId();

    const insertData = {
      company_id: companyId,
      name: data.name,
      code: data.code || null,
      gstin: data.gstin || null,
      pan: data.pan || null,
      contact_person: data.contact_person || null,
      phone: data.phone || null,
      alt_phone: data.alt_phone || null,
      email: data.email || null,
      billing_address: data.billing_address ? {
        line1: data.billing_address.line1,
        line2: data.billing_address.line2 || null,
        city: data.billing_address.city,
        state: data.billing_address.state,
        pin: data.billing_address.pin,
        country: data.billing_address.country || 'India',
      } : null,
      shipping_address: data.same_as_billing
        ? (data.billing_address ? {
            line1: data.billing_address.line1,
            line2: data.billing_address.line2 || null,
            city: data.billing_address.city,
            state: data.billing_address.state,
            pin: data.billing_address.pin,
            country: data.billing_address.country || 'India',
          } : null)
        : (data.shipping_address ? {
            line1: data.shipping_address.line1,
            line2: data.shipping_address.line2 || null,
            city: data.shipping_address.city,
            state: data.shipping_address.state,
            pin: data.shipping_address.pin,
            country: data.shipping_address.country || 'India',
          } : null),
      city: data.city || null,
      state: data.state || null,
      pin: data.pin || null,
      country: data.country || 'India',
      credit_limit: data.credit_limit || 0,
      credit_period: data.credit_period || 0,
      opening_balance: data.opening_balance || 0,
      opening_balance_type: data.opening_balance_type || 'debit',
      payment_terms: data.payment_terms || null,
      bank_details: data.bank_details?.bank_name ? {
        bank_name: data.bank_details.bank_name || null,
        account_number: data.bank_details.account_number || null,
        ifsc_code: data.bank_details.ifsc_code || null,
        branch: data.bank_details.branch || null,
      } : null,
      notes: data.notes || null,
      is_active: data.is_active,
    };

    const { data: supplier, error } = await supabase
      .from('suppliers')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;
    return supplier;
  } catch (error) {
    throw new Error(`Failed to create supplier: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function updateSupplier(id: string, data: Partial<SupplierFormData>): Promise<Supplier> {
  try {
    const companyId = await getCompanyId();
    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.code !== undefined) updateData.code = data.code || null;
    if (data.gstin !== undefined) updateData.gstin = data.gstin || null;
    if (data.pan !== undefined) updateData.pan = data.pan || null;
    if (data.contact_person !== undefined) updateData.contact_person = data.contact_person || null;
    if (data.phone !== undefined) updateData.phone = data.phone || null;
    if (data.alt_phone !== undefined) updateData.alt_phone = data.alt_phone || null;
    if (data.email !== undefined) updateData.email = data.email || null;
    if (data.city !== undefined) updateData.city = data.city || null;
    if (data.state !== undefined) updateData.state = data.state || null;
    if (data.pin !== undefined) updateData.pin = data.pin || null;
    if (data.country !== undefined) updateData.country = data.country || 'India';
    if (data.credit_limit !== undefined) updateData.credit_limit = data.credit_limit;
    if (data.credit_period !== undefined) updateData.credit_period = data.credit_period;
    if (data.opening_balance !== undefined) updateData.opening_balance = data.opening_balance;
    if (data.opening_balance_type !== undefined) updateData.opening_balance_type = data.opening_balance_type;
    if (data.payment_terms !== undefined) updateData.payment_terms = data.payment_terms || null;
    if (data.notes !== undefined) updateData.notes = data.notes || null;
    if (data.is_active !== undefined) updateData.is_active = data.is_active;
    if (data.billing_address !== undefined) {
      updateData.billing_address = data.billing_address ? {
        line1: data.billing_address.line1,
        line2: data.billing_address.line2 || null,
        city: data.billing_address.city,
        state: data.billing_address.state,
        pin: data.billing_address.pin,
        country: data.billing_address.country || 'India',
      } : null;
    }
    if (data.shipping_address !== undefined) {
      updateData.shipping_address = data.same_as_billing
        ? updateData.billing_address
        : (data.shipping_address ? {
            line1: data.shipping_address.line1,
            line2: data.shipping_address.line2 || null,
            city: data.shipping_address.city,
            state: data.shipping_address.state,
            pin: data.shipping_address.pin,
            country: data.shipping_address.country || 'India',
          } : null);
    }
    if (data.bank_details !== undefined) {
      updateData.bank_details = data.bank_details?.bank_name ? {
        bank_name: data.bank_details.bank_name || null,
        account_number: data.bank_details.account_number || null,
        ifsc_code: data.bank_details.ifsc_code || null,
        branch: data.bank_details.branch || null,
      } : null;
    }

    const { data: supplier, error } = await supabase
      .from('suppliers')
      .update(updateData)
      .eq('id', id)
      .eq('company_id', companyId)
      .select()
      .single();

    if (error) throw error;
    if (!supplier) throw new Error('Supplier not found');
    return supplier;
  } catch (error) {
    throw new Error(`Failed to update supplier: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function deleteSupplier(id: string): Promise<void> {
  try {
    const companyId = await getCompanyId();

    const { count } = await supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('supplier_id', id)
      .eq('company_id', companyId);

    if (count && count > 0) {
      throw new Error('Cannot delete supplier with existing transactions. Archive instead.');
    }

    const { error } = await supabase
      .from('suppliers')
      .delete()
      .eq('id', id)
      .eq('company_id', companyId);

    if (error) throw error;
  } catch (error) {
    throw new Error(`Failed to delete supplier: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getSupplierLedger(
  supplierId: string,
  dateFrom?: string,
  dateTo?: string
): Promise<SupplierLedgerResponse> {
  try {
    const companyId = await getCompanyId();

    const { data: supplier, error: supErr } = await supabase
      .from('suppliers')
      .select('opening_balance, opening_balance_type')
      .eq('id', supplierId)
      .eq('company_id', companyId)
      .single();

    if (supErr || !supplier) throw new Error('Supplier not found');

    let query = supabase
      .from('supplier_ledger')
      .select('*')
      .eq('supplier_id', supplierId)
      .order('date', { ascending: true });

    if (dateFrom) {
      query = query.gte('date', dateFrom);
    }
    if (dateTo) {
      query = query.lte('date', dateTo);
    }

    const { data: entries, error } = await query;
    if (error) throw error;

    const ledgerEntries = (entries || []) as SupplierLedgerEntry[];
    const totalDebit = ledgerEntries.reduce((sum, e) => sum + (e.debit || 0), 0);
    const totalCredit = ledgerEntries.reduce((sum, e) => sum + (e.credit || 0), 0);

    const openingBalance = supplier.opening_balance || 0;
    const closingBalance = openingBalance + totalDebit - totalCredit;

    return {
      entries: ledgerEntries,
      opening_balance: openingBalance,
      closing_balance: closingBalance,
      total_debit: totalDebit,
      total_credit: totalCredit,
    };
  } catch (error) {
    throw new Error(`Failed to fetch supplier ledger: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getSupplierBalance(supplierId: string): Promise<number> {
  try {
    const companyId = await getCompanyId();

    const { data: supplier, error } = await supabase
      .from('suppliers')
      .select('opening_balance, opening_balance_type')
      .eq('id', supplierId)
      .eq('company_id', companyId)
      .single();

    if (error || !supplier) throw new Error('Supplier not found');

    const { data: ledger, error: ledgerError } = await supabase
      .from('supplier_ledger')
      .select('debit, credit')
      .eq('supplier_id', supplierId);

    if (ledgerError) throw ledgerError;

    const entries = ledger || [];
    const totalDebit = entries.reduce((sum, e) => sum + (e.debit || 0), 0);
    const totalCredit = entries.reduce((sum, e) => sum + (e.credit || 0), 0);

    return (supplier.opening_balance || 0) + totalDebit - totalCredit;
  } catch (error) {
    throw new Error(`Failed to fetch supplier balance: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getSupplierOutstanding(): Promise<SupplierOutstanding[]> {
  try {
    const companyId = await getCompanyId();

    const { data: suppliers, error } = await supabase
      .from('suppliers')
      .select('id, name, opening_balance')
      .eq('company_id', companyId)
      .eq('is_active', true);

    if (error) throw error;

    const outstanding: SupplierOutstanding[] = [];

    for (const supplier of suppliers || []) {
      const balance = await getSupplierBalance(supplier.id);
      if (balance > 0) {
        outstanding.push({
          supplier_id: supplier.id,
          supplier_name: supplier.name,
          outstanding_balance: balance,
          last_transaction_date: null,
        });
      }
    }

    const { data: lastTxns } = await supabase
      .from('transactions')
      .select('supplier_id, document_date')
      .eq('company_id', companyId)
      .in('supplier_id', outstanding.map((o) => o.supplier_id))
      .order('document_date', { ascending: false });

    if (lastTxns) {
      const lastDates = new Map<string, string>();
      for (const txn of lastTxns) {
        if (txn.supplier_id && !lastDates.has(txn.supplier_id)) {
          lastDates.set(txn.supplier_id, txn.document_date);
        }
      }
      for (const item of outstanding) {
        item.last_transaction_date = lastDates.get(item.supplier_id) || null;
      }
    }

    return outstanding.sort((a, b) => b.outstanding_balance - a.outstanding_balance);
  } catch (error) {
    throw new Error(`Failed to fetch supplier outstanding: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getOverdueSuppliers(): Promise<SupplierOutstanding[]> {
  try {
    const companyId = await getCompanyId();

    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('supplier_id')
      .eq('company_id', companyId)
      .eq('type', 'purchase')
      .in('status', ['partial', 'draft'])
      .not('status', 'eq', 'cancelled');

    if (error) throw error;

    const supplierIds = [...new Set((transactions || []).map((t) => t.supplier_id).filter(Boolean))] as string[];
    if (supplierIds.length === 0) return [];

    const outstanding = await getSupplierOutstanding();
    return outstanding.filter((o) => supplierIds.includes(o.supplier_id));
  } catch (error) {
    throw new Error(`Failed to fetch overdue suppliers: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function importSuppliers(suppliers: SupplierImportRow[]): Promise<{ imported: number; errors: string[] }> {
  try {
    const companyId = await getCompanyId();
    const errors: string[] = [];
    let imported = 0;

    for (const row of suppliers) {
      try {
        const { error } = await supabase
          .from('suppliers')
          .insert({
            company_id: companyId,
            name: row.name,
            code: row.code || null,
            gstin: row.gstin || null,
            pan: row.pan || null,
            contact_person: row.contact_person || null,
            phone: row.phone || null,
            alt_phone: row.alt_phone || null,
            email: row.email || null,
            billing_address: row.billing_address_line1 ? {
              line1: row.billing_address_line1,
              line2: row.billing_address_line2 || null,
              city: row.billing_city,
              state: row.billing_state,
              pin: row.billing_pin,
              country: 'India',
            } : null,
            shipping_address: row.shipping_address_line1 ? {
              line1: row.shipping_address_line1,
              line2: row.shipping_address_line2 || null,
              city: row.shipping_city,
              state: row.shipping_state,
              pin: row.shipping_pin,
              country: 'India',
            } : null,
            city: row.billing_city || null,
            state: row.billing_state || null,
            pin: row.billing_pin || null,
            credit_limit: row.credit_limit || 0,
            credit_period: row.credit_period || 0,
            opening_balance: row.opening_balance || 0,
            opening_balance_type: row.opening_balance_type || 'debit',
            payment_terms: row.payment_terms || null,
            notes: row.notes || null,
            is_active: true,
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
    throw new Error(`Failed to import suppliers: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function exportSuppliers(filters: SupplierFilters = {}): Promise<SupplierExportRow[]> {
  try {
    const companyId = await getCompanyId();

    let query = supabase
      .from('suppliers')
      .select('*')
      .eq('company_id', companyId);

    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,code.ilike.%${filters.search}%`);
    }
    if (filters.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    }

    const { data, error } = await query.order('name');
    if (error) throw error;

    return (data || []).map((s) => ({
      code: s.code || '',
      name: s.name,
      gstin: s.gstin || '',
      pan: s.pan || '',
      contact_person: s.contact_person || '',
      phone: s.phone || '',
      email: s.email || '',
      city: s.city || '',
      state: s.state || '',
      credit_limit: s.credit_limit || 0,
      credit_period: s.credit_period || 0,
      opening_balance: s.opening_balance || 0,
      current_balance: 0,
      payment_terms: s.payment_terms || '',
      is_active: s.is_active,
    }));
  } catch (error) {
    throw new Error(`Failed to export suppliers: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}


export const supplierService = {
  getSuppliers, getSupplier, createSupplier, updateSupplier, deleteSupplier,
  getSupplierLedger, getSupplierBalance, getSupplierOutstanding,
  getOverdueSuppliers, importSuppliers, exportSuppliers,
};
