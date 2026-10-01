import {
  Transaction,
  TransactionItem,
  TransactionType,
  TransactionStatus,
  Address,
  PaymentMode,
  CompanySnapshot,
  DocumentPaymentAllocation,
} from './database.types';

export interface TransactionWithRelations extends Transaction {
  customer?: {
    id: string;
    name: string;
    code: string | null;
    phone: string | null;
    email: string | null;
    gstin: string | null;
    state: string | null;
    billing_address: Address | null;
    shipping_address: Address | null;
  } | null;
  supplier?: {
    id: string;
    name: string;
    code: string | null;
    phone: string | null;
    email: string | null;
    gstin: string | null;
    state: string | null;
    payment_terms: string | null;
    billing_address: Address | null;
    shipping_address: Address | null;
  } | null;
  items?: TransactionItem[];
  created_by_user?: {
    id: string;
    full_name: string | null;
    email: string | null;
  } | null;
  approved_by_user?: {
    id: string;
    full_name: string | null;
    email: string | null;
  } | null;
}

export interface TransactionFormData {
  type: TransactionType;
  document_number: string;
  document_date: string;
  items: TransactionItemFormData[];
  status: TransactionStatus;
  reference_number?: string;
  reference_date?: string;
  customer_id?: string | null;
  supplier_id?: string | null;
  billing_address?: Address | null;
  shipping_address?: Address | null;
  subtotal?: number;
  discount_amount?: number;
  tax_amount?: number;
  round_off?: number;
  grand_total?: number;
  amount_paid?: number;
  notes?: string;
  terms?: string;
  gstin?: string;
  validity_date?: string;
  expected_delivery?: string;
  salesperson?: string;
  /** Company identity captured when the document is issued. */
  company_snapshot?: CompanySnapshot | null;
  /** Payment rows shown on the document and posted on approval. */
  payment_allocations?: DocumentPaymentAllocation[];
}

export interface TransactionItemFormData {
  id?: string;
  product_id: string | null;
  product_name: string;
  product_code?: string;
  brand_name?: string;
  hsn_sac?: string | null;
  description?: string | null;
  quantity: number;
  unit?: string;
  rate: number;
  discount_percent: number;
  discount_amount: number;
  gst_rate: number;
  sort_order?: number;
}

export interface TransactionFilters {
  type?: TransactionType;
  status?: TransactionStatus;
  customer_id?: string;
  supplier_id?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
  min_amount?: number;
  max_amount?: number;
}

export interface TransactionListResponse {
  transactions: TransactionWithRelations[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface TransactionSummary {
  subtotal: number;
  discount_amount: number;
  taxable_value: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  tax_amount: number;
  round_off: number;
  grand_total: number;
}

export interface SalesInvoice extends Transaction {
  type: 'sale';
  customer_id: string;
}

export interface PurchaseInvoice extends Transaction {
  type: 'purchase';
  supplier_id: string;
}

export interface Quotation extends Transaction {
  type: 'quotation';
  customer_id: string;
  valid_until?: string;
}

export interface PurchaseOrder extends Transaction {
  type: 'purchase_order';
  supplier_id: string;
  expected_delivery_date?: string;
}

export interface ProformaInvoice extends Transaction {
  type: 'proforma_invoice';
  customer_id: string;
  valid_until?: string;
}

export interface PaymentAllocation {
  transaction_id: string;
  amount: number;
}

export interface SalesReturn {
  original_transaction_id: string;
  items: SalesReturnItem[];
  reason: string;
}

export interface SalesReturnItem {
  transaction_item_id: string;
  quantity: number;
  rate: number;
}

export interface PurchaseReturn {
  original_transaction_id: string;
  items: PurchaseReturnItem[];
  reason: string;
}

export interface PurchaseReturnItem {
  transaction_item_id: string;
  quantity: number;
  rate: number;
}

export interface TransactionNumberPreview {
  prefix: string;
  fiscal_year: string;
  next_number: number;
  preview: string;
}

export interface DuplicateTransactionData {
  original_id: string;
  new_type: TransactionType;
  new_date: string;
  new_document_number: string;
  items: TransactionItemFormData[];
}

export interface TransactionPrintData {
  company: {
    name: string;
    logo_url: string | null;
    address: string;
    city: string;
    state: string;
    pin: string;
    phone: string;
    email: string;
    gstin: string;
    pan: string;
  };
  transaction: TransactionWithRelations;
  items: TransactionItem[];
  tax_summary: TaxSummary[];
  amount_in_words: string;
}

export interface TaxSummary {
  hsn_sac: string;
  taxable_value: number;
  cgst_rate: number;
  cgst_amount: number;
  sgst_rate: number;
  sgst_amount: number;
  igst_rate: number;
  igst_amount: number;
  total: number;
}

export interface TransactionExportRow {
  document_number: string;
  document_date: string;
  type: string;
  party_name: string;
  party_gstin: string;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  grand_total: number;
  amount_paid: number;
  balance: number;
  status: string;
  created_at: string;
}

export interface TransactionImportRow {
  type: string;
  document_number: string;
  document_date: string;
  party_name: string;
  party_type: 'customer' | 'supplier';
  items: string;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  grand_total: number;
  status: string;
}
