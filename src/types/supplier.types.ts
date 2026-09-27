import { Supplier, SupplierLedger, Address, BankDetails } from './database.types';

export interface SupplierWithRelations extends Supplier {
  current_balance?: number;
  recent_transactions?: SupplierTransactionSummary[];
}

export interface SupplierFormData {
  name: string;
  code?: string;
  gstin?: string;
  pan?: string;
  contact_person?: string;
  phone?: string;
  alt_phone?: string;
  email?: string;
  billing_address: AddressFormData;
  shipping_address?: AddressFormData;
  same_as_billing?: boolean;
  city?: string;
  state?: string;
  pin?: string;
  country?: string;
  credit_limit?: number;
  credit_period?: number;
  opening_balance?: number;
  opening_balance_type?: 'debit' | 'credit';
  payment_terms?: string;
  bank_details?: BankDetailsFormData;
  notes?: string;
  is_active?: boolean;
}

export interface AddressFormData {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  pin?: string;
  country?: string;
}

export interface BankDetailsFormData {
  bank_name?: string;
  account_number?: string;
  ifsc_code?: string;
  branch?: string;
}

export interface SupplierFilters {
  limit?: number;
  offset?: number;
  search?: string;
  city?: string;
  state?: string;
  is_active?: boolean;
  has_balance?: boolean;
}

export interface SupplierListResponse {
  suppliers: SupplierWithRelations[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface SupplierTransactionSummary {
  id: string;
  document_number: string;
  document_date: string;
  type: string;
  grand_total: number;
  amount_paid: number;
  status: string;
}

export interface SupplierLedgerEntry {
  id: string;
  date: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  reference_type: string | null;
  reference_id: string | null;
  created_at: string;
}

export interface SupplierLedgerResponse {
  entries: SupplierLedgerEntry[];
  opening_balance: number;
  closing_balance: number;
  total_debit: number;
  total_credit: number;
}

export interface SupplierStatement {
  supplier: SupplierWithRelations;
  from_date: string;
  to_date: string;
  opening_balance: number;
  entries: SupplierLedgerEntry[];
  closing_balance: number;
  total_purchases: number;
  total_payments: number;
  total_returns: number;
}

export interface SupplierOutstanding {
  supplier_id: string;
  supplier_name: string;
  outstanding_balance: number;
  last_transaction_date: string | null;
}

export interface SupplierAgeing {
  supplier_id: string;
  supplier_name: string;
  current: number;
  days_30: number;
  days_60: number;
  days_90: number;
  over_90: number;
  total_outstanding: number;
}

export interface SupplierImportRow {
  name: string;
  code: string;
  gstin: string;
  pan?: string;
  contact_person: string;
  phone: string;
  alt_phone?: string;
  email: string;
  billing_address_line1: string;
  billing_address_line2: string;
  billing_city: string;
  billing_state: string;
  billing_pin: string;
  shipping_address_line1: string;
  shipping_address_line2: string;
  shipping_city: string;
  shipping_state: string;
  shipping_pin: string;
  credit_limit: number;
  credit_period: number;
  opening_balance: number;
  opening_balance_type: string;
  payment_terms: string;
  notes?: string;
}

export interface SupplierExportRow {
  code: string;
  name: string;
  gstin: string;
  pan?: string;
  contact_person: string;
  phone: string;
  email: string;
  city?: string;
  state?: string;
  credit_limit: number;
  credit_period: number;
  opening_balance: number;
  current_balance: number;
  payment_terms: string;
  is_active: boolean;
}
