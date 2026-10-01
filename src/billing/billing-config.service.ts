import { supabase } from '@/lib/supabase';
import { getCompanyId } from '@/lib/tenant';
import type {
  ConfiguredBankAccount,
  PaymentMethodConfig,
} from '@/types/database.types';
import type { BillingDocType } from './billing.types';

/**
 * Backend-managed billing configuration: payment methods, the company's bank
 * accounts and the default terms per document type. Everything lives in the
 * existing `company_settings` row so RLS, the company context and the
 * settings screen all keep working unchanged.
 */

export const DEFAULT_PAYMENT_METHODS: PaymentMethodConfig[] = [
  { key: 'upi', label: 'UPI', enabled: true, requires_bank: false, requires_reference: true, sort_order: 1 },
  { key: 'cash', label: 'Cash', enabled: true, requires_bank: false, requires_reference: false, sort_order: 2 },
  { key: 'bank', label: 'Bank Transfer', enabled: true, requires_bank: true, requires_reference: true, sort_order: 3 },
  { key: 'cheque', label: 'Cheque', enabled: true, requires_bank: true, requires_reference: true, sort_order: 4 },
  { key: 'other', label: 'Other', enabled: true, requires_bank: false, requires_reference: true, sort_order: 5 },
];

/** Values written to payments_received.mode / payments_made.mode. */
export const PAYMENT_METHOD_MODE: Record<string, string> = {
  upi: 'upi',
  cash: 'cash',
  bank: 'bank',
  cheque: 'cheque',
  other: 'other',
};

export const DEFAULT_DOCUMENT_TERMS: Record<BillingDocType, string> = {
  proforma_invoice: [
    'This is not a tax invoice. A proper tax invoice will be issued upon payment.',
    'Payment must be received within 7 days of this proforma invoice.',
    'Prices include applicable GST unless stated otherwise.',
    'Goods will be dispatched upon realization of payment.',
  ].join('\n'),
  sale: [
    'Payment is due within 30 days from the date of invoice.',
    'A late payment fee of 1.5% per month will be charged on overdue amounts.',
    'Goods once sold will not be taken back or exchanged.',
    'Subject to local jurisdiction for any disputes.',
    'E. & O.E (Errors and Omissions Excepted).',
  ].join('\n'),
  purchase: [
    'Goods will be inspected on receipt and discrepancies reported within 7 days.',
    'Payment will be made as per agreed credit terms after successful verification.',
    'Invoice must be submitted along with delivery.',
    'Prices include applicable taxes unless stated otherwise.',
  ].join('\n'),
  quotation: [
    'This quotation is valid for 15 days from the date of issue.',
    'Prices are exclusive of applicable taxes unless stated otherwise.',
    'Delivery timeline: 7-10 business days from order confirmation.',
    'Payment terms: 100% advance payment.',
    'Prices are subject to change without prior notice.',
  ].join('\n'),
  purchase_order: [
    'This purchase order is subject to our terms and conditions.',
    'Delivery must be made on or before the specified delivery date.',
    'Quality and quantity must match the specifications mentioned.',
    'Invoice must be submitted along with delivery.',
    'Payment will be processed as per agreed terms after delivery and verification.',
  ].join('\n'),
};

export interface BillingConfig {
  settingsId: string;
  paymentMethods: PaymentMethodConfig[];
  bankAccounts: ConfiguredBankAccount[];
  terms: Partial<Record<BillingDocType, string>>;
}

function normaliseMethods(value: unknown): PaymentMethodConfig[] {
  if (Array.isArray(value) && value.length > 0) {
    return value as PaymentMethodConfig[];
  }
  return DEFAULT_PAYMENT_METHODS.map((m) => ({ ...m }));
}

function normaliseAccounts(value: unknown): ConfiguredBankAccount[] {
  if (!Array.isArray(value)) return [];
  return (value as ConfiguredBankAccount[]).map((account, index) => ({
    id: account.id || `bank-${index + 1}`,
    display_name:
      account.display_name ||
      (account as unknown as { account_name?: string }).account_name ||
      account.bank_name ||
      '',
    bank_name: account.bank_name || '',
    account_holder:
      account.account_holder ||
      (account as unknown as { account_name?: string }).account_name ||
      '',
    account_number: account.account_number || '',
    ifsc: account.ifsc || '',
    branch: account.branch || '',
    account_type: account.account_type || '',
    // Older rows stored the UPI handle as `upi`.
    upi_id: account.upi_id || (account as unknown as { upi?: string }).upi || '',
    is_active: account.is_active !== false,
    is_default: Boolean(account.is_default),
  }));
}

export async function loadBillingConfig(): Promise<BillingConfig> {
  const companyId = await getCompanyId();
  const { data, error } = await supabase
    .from('company_settings')
    .select('id, payment_methods, bank_accounts, document_terms')
    .eq('company_id', companyId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  return {
    settingsId: data?.id || '',
    paymentMethods: normaliseMethods(data?.payment_methods),
    bankAccounts: normaliseAccounts(data?.bank_accounts),
    terms: (data?.document_terms as Record<string, string>) || {},
  };
}

async function patchSettings(patch: Record<string, unknown>): Promise<void> {
  const config = await loadBillingConfig();
  if (!config.settingsId) throw new Error('Company settings not found');
  const { error } = await supabase
    .from('company_settings')
    .update(patch)
    .eq('id', config.settingsId);
  if (error) throw new Error(error.message);
}

export async function savePaymentMethods(
  methods: PaymentMethodConfig[]
): Promise<void> {
  await patchSettings({ payment_methods: methods });
}

export async function saveBankAccounts(
  accounts: ConfiguredBankAccount[]
): Promise<void> {
  await patchSettings({ bank_accounts: accounts });
}

export async function saveDocumentTerms(
  terms: Partial<Record<BillingDocType, string>>
): Promise<void> {
  await patchSettings({ document_terms: terms });
}

export function termsFor(
  config: BillingConfig | null,
  docType: BillingDocType
): string {
  return config?.terms?.[docType] || DEFAULT_DOCUMENT_TERMS[docType] || '';
}

/** Masks an account number for display: 1234567890 -> ******7890 */
export function maskAccountNumber(number: string): string {
  const digits = (number || '').replace(/\s/g, '');
  if (digits.length <= 4) return digits;
  return `${'*'.repeat(Math.max(digits.length - 4, 2))}${digits.slice(-4)}`;
}

export const billingConfigService = {
  loadBillingConfig,
  savePaymentMethods,
  saveBankAccounts,
  saveDocumentTerms,
  termsFor,
  DEFAULT_PAYMENT_METHODS,
  DEFAULT_DOCUMENT_TERMS,
  PAYMENT_METHOD_MODE,
};
