import BillingFormPage from '@/billing/BillingFormPage';

/** Proforma Invoice form - shared billing UI (`BILLING_DOC_CONFIG.proforma_invoice`). */
export default function ProformaInvoiceFormPage() {
  return <BillingFormPage docType="proforma_invoice" />;
}
