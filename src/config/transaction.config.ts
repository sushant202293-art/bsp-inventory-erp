import { GST_RATES } from './app.config';

export const DOCUMENT_PREFIXES = {
  quotation: 'QT',
  proforma_invoice: 'PI',
  sales_invoice: 'INV',
  purchase_order: 'PO',
  delivery_challan: 'DC',
  credit_note: 'CN',
  debit_note: 'DN',
  stock_adjustment: 'SA',
  stock_transfer: 'ST',
} as const;

export type DocumentType = keyof typeof DOCUMENT_PREFIXES;

export const DOCUMENT_NUMBER_FORMAT = {
  quotation: '{prefix}/{YYYY}/{MM}/{seq:5}',
  proforma_invoice: '{prefix}/{YYYY}/{MM}/{seq:5}',
  sales_invoice: '{prefix}/{YYYY}/{MM}/{seq:5}',
  purchase_order: '{prefix}/{YYYY}/{MM}/{seq:5}',
  delivery_challan: '{prefix}/{YYYY}/{MM}/{seq:5}',
  credit_note: '{prefix}/{YYYY}/{MM}/{seq:5}',
  debit_note: '{prefix}/{YYYY}/{MM}/{seq:5}',
  stock_adjustment: '{prefix}/{YYYY}/{MM}/{seq:5}',
  stock_transfer: '{prefix}/{YYYY}/{MM}/{seq:5}',
} as const;

export const DOCUMENT_STATUSES = {
  quotation: [
    { id: 'draft', label: 'Draft', color: '#64748b' },
    { id: 'sent', label: 'Sent', color: '#3b82f6' },
    { id: 'accepted', label: 'Accepted', color: '#10b981' },
    { id: 'rejected', label: 'Rejected', color: '#ef4444' },
    { id: 'expired', label: 'Expired', color: '#f59e0b' },
  ],
  proforma_invoice: [
    { id: 'draft', label: 'Draft', color: '#64748b' },
    { id: 'sent', label: 'Sent', color: '#3b82f6' },
    { id: 'confirmed', label: 'Confirmed', color: '#10b981' },
    { id: 'cancelled', label: 'Cancelled', color: '#ef4444' },
  ],
  sales_invoice: [
    { id: 'draft', label: 'Draft', color: '#64748b' },
    { id: 'pending', label: 'Pending', color: '#f59e0b' },
    { id: 'partial', label: 'Partially Paid', color: '#f97316' },
    { id: 'paid', label: 'Paid', color: '#10b981' },
    { id: 'overdue', label: 'Overdue', color: '#ef4444' },
    { id: 'cancelled', label: 'Cancelled', color: '#64748b' },
  ],
  purchase_order: [
    { id: 'draft', label: 'Draft', color: '#64748b' },
    { id: 'sent', label: 'Sent', color: '#3b82f6' },
    { id: 'confirmed', label: 'Confirmed', color: '#10b981' },
    { id: 'partial', label: 'Partially Received', color: '#f97316' },
    { id: 'received', label: 'Fully Received', color: '#10b981' },
    { id: 'cancelled', label: 'Cancelled', color: '#ef4444' },
  ],
  delivery_challan: [
    { id: 'draft', label: 'Draft', color: '#64748b' },
    { id: 'dispatched', label: 'Dispatched', color: '#3b82f6' },
    { id: 'delivered', label: 'Delivered', color: '#10b981' },
    { id: 'cancelled', label: 'Cancelled', color: '#ef4444' },
  ],
  credit_note: [
    { id: 'draft', label: 'Draft', color: '#64748b' },
    { id: 'issued', label: 'Issued', color: '#3b82f6' },
    { id: 'applied', label: 'Applied', color: '#10b981' },
    { id: 'cancelled', label: 'Cancelled', color: '#ef4444' },
  ],
  debit_note: [
    { id: 'draft', label: 'Draft', color: '#64748b' },
    { id: 'issued', label: 'Issued', color: '#3b82f6' },
    { id: 'applied', label: 'Applied', color: '#10b981' },
    { id: 'cancelled', label: 'Cancelled', color: '#ef4444' },
  ],
  stock_adjustment: [
    { id: 'draft', label: 'Draft', color: '#64748b' },
    { id: 'approved', label: 'Approved', color: '#10b981' },
    { id: 'rejected', label: 'Rejected', color: '#ef4444' },
  ],
  stock_transfer: [
    { id: 'draft', label: 'Draft', color: '#64748b' },
    { id: 'in_transit', label: 'In Transit', color: '#f59e0b' },
    { id: 'received', label: 'Received', color: '#10b981' },
    { id: 'cancelled', label: 'Cancelled', color: '#ef4444' },
  ],
} as const;

export const DEFAULT_TERMS_AND_CONDITIONS: Record<DocumentType, string[]> = {
  quotation: [
    'This quotation is valid for 15 days from the date of issue.',
    'Prices are exclusive of applicable taxes unless stated otherwise.',
    'Delivery timeline: 7-10 business days from order confirmation.',
    'Payment terms: 100% advance payment.',
    'Prices are subject to change without prior notice.',
  ],
  proforma_invoice: [
    'This is not a tax invoice. A proper tax invoice will be issued upon payment.',
    'Payment must be received within 7 days of this proforma invoice.',
    'Prices include applicable GST unless stated otherwise.',
    'Goods will be dispatched upon realization of payment.',
  ],
  sales_invoice: [
    'Payment is due within 30 days from the date of invoice.',
    'A late payment fee of 1.5% per month will be charged on overdue amounts.',
    'Goods once sold will not be taken back or exchanged.',
    'Subject to local jurisdiction for any disputes.',
    'E. & O.E (Errors and Omissions Excepted).',
  ],
  purchase_order: [
    'This purchase order is subject to our terms and conditions.',
    'Delivery must be made on or before the specified delivery date.',
    'Quality and quantity must match the specifications mentioned.',
    'Invoice must be submitted along with delivery.',
    'Payment will be processed as per agreed terms after delivery and verification.',
  ],
  delivery_challan: [
    'This is not a tax invoice.',
    'Goods must be inspected upon delivery.',
    'Report any damages or discrepancies within 24 hours of delivery.',
    'Delivery person must obtain proof of delivery (signature/stamp).',
  ],
  credit_note: [
    'This credit note can be adjusted against future invoices.',
    'Refund, if applicable, will be processed within 15 business days.',
    'This credit note is issued against the referenced invoice.',
  ],
  debit_note: [
    'This debit note is issued for the additional amount payable.',
    'Payment for this debit note is due within 15 days.',
  ],
  stock_adjustment: [
    'This adjustment has been reviewed and approved.',
    'All supporting documents are attached.',
    'Reason for adjustment is documented.',
  ],
  stock_transfer: [
    'Items must be verified at both source and destination.',
    'Transfer must be acknowledged by the receiving party.',
    'Any discrepancy must be reported within 48 hours.',
  ],
};

export const AVAILABLE_GST_RATES = [...GST_RATES];

export const INVOICE_TOTAL_ROUNDOFF = true;
export const INVOICE_ROUND_OFF_NEAREST = 1;
export const INVOICE_DEFAULT_DISCOUNT_TYPE = 'percentage' as const;

export const PAYMENT_TERMS = [
  { id: 'cod', label: 'Cash on Delivery', days: 0 },
  { id: 'net7', label: 'Net 7', days: 7 },
  { id: 'net15', label: 'Net 15', days: 15 },
  { id: 'net30', label: 'Net 30', days: 30 },
  { id: 'net45', label: 'Net 45', days: 45 },
  { id: 'net60', label: 'Net 60', days: 60 },
  { id: 'advance', label: '100% Advance', days: 0 },
  { id: 'partial', label: '50% Advance, 50% on Delivery', days: 0 },
] as const;

export const DISCOUNT_TYPES = [
  { id: 'percentage', label: 'Percentage (%)' },
  { id: 'fixed', label: 'Fixed Amount (₹)' },
] as const;

export default {
  DOCUMENT_PREFIXES,
  DOCUMENT_NUMBER_FORMAT,
  DOCUMENT_STATUSES,
  DEFAULT_TERMS_AND_CONDITIONS,
  AVAILABLE_GST_RATES,
  PAYMENT_TERMS,
  DISCOUNT_TYPES,
};
