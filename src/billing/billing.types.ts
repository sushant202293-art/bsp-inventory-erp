import type {
  Address,
  CompanySnapshot,
  ConfiguredBankAccount,
  DocumentPaymentAllocation,
} from '@/types/database.types';

/**
 * The four billable documents share one implementation. Everything that
 * differs between them lives in `BILLING_DOC_CONFIG`; everything that is
 * shared (numbering, master-data lookup, grid maths, print, PDF) lives in
 * `src/billing`.
 */
export type BillingDocType =
  | 'proforma_invoice'
  | 'sale'
  | 'purchase'
  | 'quotation'
  | 'purchase_order';

export interface BillingDocConfig {
  /** Transaction type stored in the database. */
  type: BillingDocType;
  /** Title printed on the document. Never call a quotation a tax invoice. */
  title: string;
  /** Title shown on the interactive form. */
  formTitle: string;
  /** Which master supplies the party: customers or suppliers. */
  party: 'customer' | 'supplier';
  /** Default numbering prefix used the first time a series is created. */
  defaultPrefix: string;
  /** Product price used when a line is picked. */
  priceField: 'selling_price' | 'purchase_price';
  /** Approving the document moves stock through post_document_stock. */
  postsStock: boolean;
  /**
   * Approving writes real rows to payments_received / payments_made.
   * False for proforma invoices and quotations: their payment rows are an
   * intention, never a receipt.
   */
  recordsPayments: 'received' | 'made' | null;
  /** Proforma / quotation / PO carry a validity or delivery date. */
  dateField: 'validity' | 'delivery' | 'none';
  listPath: string;
  /** True when the document must never touch stock or ledgers. */
  isEstimate: boolean;
  /** Prefix used when labelling the party block ("Customer"/"Supplier"). */
  partyLabel: string;
}

export const BILLING_DOC_CONFIG: Record<BillingDocType, BillingDocConfig> = {
  proforma_invoice: {
    type: 'proforma_invoice',
    title: 'PROFORMA INVOICE',
    formTitle: 'Proforma Invoice',
    party: 'customer',
    defaultPrefix: 'PI/',
    priceField: 'selling_price',
    postsStock: false,
    recordsPayments: null,
    dateField: 'validity',
    listPath: '/proforma-invoices',
    isEstimate: true,
    partyLabel: 'Customer',
  },
  sale: {
    type: 'sale',
    title: 'TAX INVOICE',
    formTitle: 'Sales Invoice',
    party: 'customer',
    defaultPrefix: 'INV/',
    priceField: 'selling_price',
    postsStock: true,
    recordsPayments: 'received',
    dateField: 'none',
    listPath: '/transactions/sales',
    isEstimate: false,
    partyLabel: 'Customer',
  },
  purchase: {
    type: 'purchase',
    title: 'PURCHASE INVOICE',
    formTitle: 'Purchase Invoice',
    party: 'supplier',
    defaultPrefix: 'PUR/',
    priceField: 'purchase_price',
    postsStock: true,
    recordsPayments: 'made',
    dateField: 'none',
    listPath: '/purchase',
    isEstimate: false,
    partyLabel: 'Supplier',
  },
  quotation: {
    type: 'quotation',
    title: 'QUOTATION',
    formTitle: 'Quotation',
    party: 'customer',
    defaultPrefix: 'QUO/',
    priceField: 'selling_price',
    postsStock: false,
    recordsPayments: null,
    dateField: 'validity',
    listPath: '/quotations',
    isEstimate: true,
    partyLabel: 'Customer',
  },
  purchase_order: {
    type: 'purchase_order',
    title: 'PURCHASE ORDER',
    formTitle: 'Purchase Order',
    party: 'supplier',
    defaultPrefix: 'PO/',
    priceField: 'purchase_price',
    postsStock: false,
    recordsPayments: null,
    dateField: 'delivery',
    listPath: '/purchase-orders',
    isEstimate: true,
    partyLabel: 'Supplier',
  },
};

/** One editable row of the item grid. Derived columns are recomputed on
 *  every keystroke by `computeItemRow`, never stored from the input. */
export interface BillingItemRow {
  key: string;
  product_id: string | null;
  product_name: string;
  product_code: string;
  brand_name: string;
  hsn_sac: string;
  description: string;
  quantity: number;
  unit: string;
  rate: number;
  discount_percent: number;
  gst_rate: number;
  // Derived - kept on the row so the grid and the print view agree.
  gross_amount: number;
  discount_amount: number;
  taxable_value: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  total_amount: number;
}

export interface BillingTotals {
  quantity: number;
  gross: number;
  discount: number;
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
  tax: number;
  other_charges: number;
  round_off: number;
  grand_total: number;
  amount_in_words: string;
}

/** Party block state - billing and shipping are snapshotted on save. */
export interface BillingPartyState {
  party_id: string | null;
  name: string;
  code: string;
  contact_person: string;
  phone: string;
  email: string;
  gstin: string;
  state: string;
  billing: Address;
  shipping: Address;
  same_as_billing: boolean;
  shipping_recipient: string;
  shipping_contact: string;
  shipping_phone: string;
  shipping_email: string;
}

export type { Address, CompanySnapshot, DocumentPaymentAllocation };

/** One side of the printed party blocks. */
export interface BillingPrintParty {
  label: string;
  name: string;
  code: string | null;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  gstin: string | null;
  state: string | null;
  address: Address;
}

/**
 * Everything the A4 print template and the PDF generator need. Built once by
 * the form so the on-screen preview, the printed page and the downloaded PDF
 * can never drift apart.
 */
export interface BillingPrintModel {
  docType: BillingDocType;
  title: string;
  documentNumber: string;
  documentDate: string;
  validityDate?: string | null;
  expectedDelivery?: string | null;
  referenceNumber?: string | null;
  status: string;
  company: CompanySnapshot;
  billTo: BillingPrintParty;
  shipTo: BillingPrintParty | null;
  interState: boolean;
  items: BillingItemRow[];
  totals: BillingTotals;
  headerDiscount: number;
  terms: string;
  notes: string;
  payments: DocumentPaymentAllocation[];
  bankAccounts: ConfiguredBankAccount[];
  amountPaid: number;
}
