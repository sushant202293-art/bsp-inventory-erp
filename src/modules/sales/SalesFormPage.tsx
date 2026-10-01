import BillingFormPage from '@/billing/BillingFormPage';

/**
 * Sales Invoice form. The whole billing UI is shared - see
 * `src/billing/BillingFormPage` and `BILLING_DOC_CONFIG.sale`.
 */
export default function SalesFormPage() {
  return <BillingFormPage docType="sale" />;
}
