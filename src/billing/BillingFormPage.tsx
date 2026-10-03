import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { Save, Eye, CheckCircle2, Loader2 } from 'lucide-react';

import { useCompanyView } from '@/contexts/CompanyContext';
import { transactionService } from '@/services/transaction.service';
import { paymentService } from '@/services/payment.service';
import { EMPTY_ADDRESS, toAddress } from '@/lib/address';

import {
  BILLING_DOC_CONFIG,
  type BillingDocType,
  type BillingItemRow,
  type BillingPartyState,
  type BillingPrintModel,
  type BillingPrintParty,
} from './billing.types';
import { computeItemRow, computeTotals, interStateFor } from './calculations';
import { previewDocumentNumber } from './document-number.service';
import {
  loadBillingConfig,
  termsFor,
  PAYMENT_METHOD_MODE,
  type BillingConfig,
} from './billing-config.service';
import { DocumentHeaderBar } from './components/DocumentHeaderBar';
import { SourceCompanyBlock, BillToBlock, ShipToBlock } from './components/PartyBlocks';
import { InvoiceItemsTable, blankRow } from './components/InvoiceItemsTable';
import { InvoiceTotals } from './components/InvoiceTotals';
import { PaymentAllocationEditor } from './components/PaymentAllocationEditor';
import { InvoicePrintPreview } from './print/InvoicePrintPreview';

import type { CompanySnapshot, DocumentPaymentAllocation, TransactionItem, TransactionStatus } from '@/types/database.types';
import type { TransactionItemFormData } from '@/types/transaction.types';

interface BillingFormPageProps {
  docType: BillingDocType;
}

function today(): string {
  return new Date().toISOString().split('T')[0];
}

function emptyParty(): BillingPartyState {
  return {
    party_id: null,
    name: '',
    code: '',
    contact_person: '',
    phone: '',
    email: '',
    gstin: '',
    state: '',
    billing: { ...EMPTY_ADDRESS },
    shipping: { ...EMPTY_ADDRESS },
    same_as_billing: true,
    shipping_recipient: '',
    shipping_contact: '',
    shipping_phone: '',
    shipping_email: '',
  };
}

function addressesMatch(a: typeof EMPTY_ADDRESS, b: typeof EMPTY_ADDRESS): boolean {
  return a.line1 === b.line1 && a.city === b.city && a.state === b.state && a.pin === b.pin;
}

/**
 * One implementation of the billing form for proforma invoices, sales
 * invoices, purchase invoices and quotations. Everything that differs lives
 * in {@link BILLING_DOC_CONFIG}; everything that is shared - numbering,
 * party blocks, inventory grid, totals, split payments, print and PDF - lives
 * in `src/billing`.
 */
export default function BillingFormPage({ docType }: BillingFormPageProps) {
  const docConfig = BILLING_DOC_CONFIG[docType];
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const companyView = useCompanyView();

  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const [docNumber, setDocNumber] = useState('');
  const [docNumberLoading, setDocNumberLoading] = useState(!id);
  const [docDate, setDocDate] = useState(today());
  const [extraDate, setExtraDate] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');

  const [party, setParty] = useState<BillingPartyState>(emptyParty);
  const [items, setItems] = useState<BillingItemRow[]>(() => [blankRow('row-1')]);
  const [headerDiscount, setHeaderDiscount] = useState(0);
  const [terms, setTerms] = useState('');
  const [notes, setNotes] = useState('');
  const [payments, setPayments] = useState<DocumentPaymentAllocation[]>([]);

  const [status, setStatus] = useState<TransactionStatus>('draft');
  const [amountPaid, setAmountPaid] = useState(0);
  const [storedSnapshot, setStoredSnapshot] = useState<CompanySnapshot | null>(null);
  const [billingConfig, setBillingConfig] = useState<BillingConfig | null>(null);

  const supplyState = party.state || party.billing.state;
  const interState = interStateFor(companyView.state, supplyState);

  const validItems = useMemo(
    () => items.filter((row) => row.product_name.trim().length > 0),
    [items]
  );

  const totals = useMemo(
    () => computeTotals(validItems, interState, { headerDiscount }),
    [validItems, interState, headerDiscount]
  );

  /* ---------------- data loading ---------------- */

  useEffect(() => {
    loadBillingConfig()
      .then((config) => {
        setBillingConfig(config);
        setTerms((current) => current || termsFor(config, docType));
      })
      .catch((error) => {
        console.error('Billing config load failed:', error);
        setTerms((current) => current || termsFor(null, docType));
      });
  }, [docType]);

  // Read-only preview of the number the next document would receive.
  useEffect(() => {
    if (id) return;
    let cancelled = false;
    setDocNumberLoading(true);
    previewDocumentNumber(docType, docDate)
      .then((value) => {
        if (!cancelled) setDocNumber(value);
      })
      .catch(() => {
        if (!cancelled) setDocNumber(`${docConfig.defaultPrefix}0001`);
      })
      .finally(() => {
        if (!cancelled) setDocNumberLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, docType, docDate, docConfig.defaultPrefix]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    (async () => {
      try {
        const txn = await transactionService.getTransaction(id);
        if (cancelled) return;

        const billing = toAddress(txn.billing_address);
        const shipping = toAddress(txn.shipping_address);
        const sameAsBilling = !txn.shipping_address || addressesMatch(billing, shipping);
        const master = txn.customer || txn.supplier || null;

        setDocNumber(txn.document_number);
        setDocDate(txn.document_date);
        setExtraDate(txn.validity_date || txn.expected_delivery || '');
        setReferenceNumber(txn.reference_number || '');
        setNotes(txn.notes || '');
        setTerms(txn.terms || termsFor(billingConfig, docType));
        setHeaderDiscount(txn.discount_amount || 0);
        setPayments(txn.payment_allocations || []);
        setStatus(txn.status);
        setAmountPaid(txn.amount_paid || 0);
        setStoredSnapshot(txn.company_snapshot || null);

        setParty({
          party_id: txn.customer_id || txn.supplier_id,
          name: master?.name || '',
          code: master?.code || '',
          contact_person: '',
          phone: master?.phone || '',
          email: master?.email || '',
          gstin: txn.gstin || master?.gstin || '',
          state: master?.state || billing.state,
          billing,
          shipping: sameAsBilling ? { ...billing } : shipping,
          same_as_billing: sameAsBilling,
          shipping_recipient: '',
          shipping_contact: '',
          shipping_phone: master?.phone || '',
          shipping_email: master?.email || '',
        });

        const rows = (txn.items || []).map((item, index) =>
          itemToRow(item, index, interStateFor(companyView.state, master?.state || billing.state))
        );
        setItems(rows.length > 0 ? rows : [blankRow('row-1')]);
      } catch (error) {
        toast({
          title: 'Could not load document',
          description: error instanceof Error ? error.message : 'Unknown error',
          variant: 'destructive',
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // billingConfig lands after the transaction, so terms fall back separately.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Party state drives the CGST/SGST vs IGST split, so derived columns are
  // refreshed whenever it changes (loading, picking another party, editing).
  useEffect(() => {
    setItems((prev) => prev.map((row) => computeItemRow(row, interState)));
  }, [interState]);

  // The list pages link to `<doc>?print=true` from the printer icon: the
  // document is loaded first, then its print preview opens directly.
  useEffect(() => {
    if (searchParams.get('print') === 'true' && !loading) setShowPreview(true);
  }, [searchParams, loading]);

  /* ---------------- validation ---------------- */

  const validate = useCallback(
    (approving: boolean): string | null => {
      if (!docDate) return 'Document date is required.';
      if (validItems.length === 0) return 'Add at least one product line.';
      const unpicked = validItems.find((row) => !row.product_id);
      if (unpicked) {
        return `Pick "${unpicked.product_name}" from the inventory dropdown - lines must link to a product.`;
      }
      const badQuantity = validItems.find((row) => row.quantity <= 0);
      if (badQuantity) return `Quantity must be greater than 0 for ${badQuantity.product_name}.`;
      if (approving && !party.party_id) {
        return `Select a ${docConfig.partyLabel.toLowerCase()} before approving this document.`;
      }
      const allocated = payments.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
      if (allocated - totals.grand_total > 0.009) {
        return 'Payment allocated is more than the grand total. Adjust the payment rows.';
      }
      if (approving && !companyView.name) {
        return 'Complete your company profile in Settings before approving a document.';
      }
      return null;
    },
    [docDate, validItems, party.party_id, payments, totals.grand_total, companyView.name, docConfig.partyLabel]
  );

  /* ---------------- saving ---------------- */

  async function save(outcome: 'draft' | 'approved') {
    const approving = outcome === 'approved';
    const problem = validate(approving);
    if (problem) {
      toast({ title: 'Cannot save yet', description: problem, variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const formItems: TransactionItemFormData[] = validItems.map((row, index) => ({
        product_id: row.product_id,
        product_name: row.product_name,
        product_code: row.product_code,
        brand_name: row.brand_name,
        hsn_sac: row.hsn_sac || null,
        description: row.description || null,
        quantity: row.quantity,
        unit: row.unit,
        rate: row.rate,
        discount_percent: row.discount_percent,
        discount_amount: row.discount_amount,
        gst_rate: row.gst_rate,
        sort_order: index,
      }));

      const payload = {
        type: docType,
        document_number: docNumber,
        document_date: docDate,
        reference_number: referenceNumber,
        customer_id: docConfig.party === 'customer' ? party.party_id : null,
        supplier_id: docConfig.party === 'supplier' ? party.party_id : null,
        billing_address: party.billing,
        shipping_address: party.same_as_billing ? party.billing : party.shipping,
        gstin: party.gstin,
        items: formItems,
        subtotal: totals.taxable,
        discount_amount: headerDiscount,
        tax_amount: totals.tax,
        round_off: totals.round_off,
        grand_total: totals.grand_total,
        status: outcome,
        terms,
        notes,
        validity_date: docConfig.dateField === 'validity' ? extraDate || undefined : undefined,
        expected_delivery: docConfig.dateField === 'delivery' ? extraDate || undefined : undefined,
        company_snapshot: snapshot(),
        payment_allocations: payments,
      };

      const saved = id
        ? await transactionService.updateTransaction(id, payload)
        : await transactionService.createTransaction(payload);

      if (approving) {
        if (docConfig.postsStock) {
          // Stock first: posting refuses to run on a document the payment
          // rows have already moved to "paid"/"partial".
          await transactionService.postTransaction(saved.id);
        }
        if (docConfig.recordsPayments && amountPaid === 0 && payments.length > 0) {
          await recordPayments(saved.id);
        }
      }

      toast({
        title: approving ? 'Approved' : 'Draft saved',
        description: `${docConfig.formTitle} ${docNumber || ''} saved.`,
      });
      navigate(docConfig.listPath);
    } catch (error) {
      toast({
        title: 'Save failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }

  async function recordPayments(transactionId: string): Promise<void> {
    if (!docConfig.recordsPayments || !party.party_id) return;

    for (const row of payments) {
      const amount = Number(row.amount) || 0;
      if (amount <= 0) continue;
      const account = billingConfig?.bankAccounts.find((b) => b.id === row.bank_account_id);
      const common = {
        date: docDate,
        amount,
        mode: PAYMENT_METHOD_MODE[row.method_key] || 'other',
        reference_number: row.reference || undefined,
        bank_name: account?.bank_name || row.bank_label || undefined,
        transaction_id: transactionId,
        notes: `${docConfig.formTitle} ${docNumber}`,
      };

      if (docConfig.recordsPayments === 'received') {
        await paymentService.createPaymentReceived({ ...common, customer_id: party.party_id });
      } else {
        await paymentService.createPaymentMade({ ...common, supplier_id: party.party_id });
      }
    }
  }

  /* ---------------- print ---------------- */

  function snapshot(): CompanySnapshot {
    return {
      name: companyView.name,
      logo_url: companyView.logo || null,
      address: companyView.address,
      city: companyView.city,
      state: companyView.state,
      pin: companyView.pincode,
      country: companyView.country,
      phone: companyView.phone,
      email: companyView.email,
      website: companyView.website,
      gstin: companyView.gstin,
      pan: companyView.pan,
      cin: companyView.cin,
    };
  }

  function buildPrintModel(): BillingPrintModel {
    const billTo: BillingPrintParty = {
      label: docConfig.partyLabel,
      name: party.name,
      code: party.code || null,
      contact_person: party.contact_person || null,
      phone: party.phone || null,
      email: party.email || null,
      gstin: party.gstin || null,
      state: supplyState || null,
      address: party.billing,
    };

    // Source of truth: checked -> derive delivery address from the Bill To
    // customer's billing address (never the Place of Supply); unchecked -> the
    // manually entered shipping address. Derived fresh every render so a party
    // or address change can never leave Ship To stale.
    const sameAsBilling = party.same_as_billing;
    const shippingParty: BillingPrintParty = {
      label: 'Delivery Address',
      name: sameAsBilling ? party.name : party.shipping_recipient || party.name,
      code: null,
      contact_person: sameAsBilling
        ? party.contact_person
        : party.shipping_contact || party.contact_person,
      phone: sameAsBilling ? party.phone : party.shipping_phone,
      email: sameAsBilling ? party.email : party.shipping_email,
      gstin: party.gstin || null,
      state: (sameAsBilling ? party.billing.state : party.shipping.state) || null,
      address: sameAsBilling ? party.billing : party.shipping,
    };

    return {
      docType,
      title: docConfig.title,
      documentNumber: docNumber,
      documentDate: docDate,
      validityDate: docConfig.dateField === 'validity' ? extraDate || null : null,
      expectedDelivery: docConfig.dateField === 'delivery' ? extraDate || null : null,
      referenceNumber: referenceNumber || null,
      status,
      company: storedSnapshot ?? snapshot(),
      billTo,
      shipTo: shippingParty,
      interState,
      items: validItems,
      totals,
      headerDiscount,
      terms,
      notes,
      payments,
      bankAccounts: billingConfig?.bankAccounts ?? [],
      amountPaid,
    };
  }

  /* ---------------- render ---------------- */

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading {docConfig.formTitle.toLowerCase()}...
      </div>
    );
  }

  const extraDateField =
    docConfig.dateField === 'validity'
      ? { label: 'Validity Date', value: extraDate, onChange: setExtraDate }
      : docConfig.dateField === 'delivery'
        ? { label: 'Expected Delivery', value: extraDate, onChange: setExtraDate }
        : null;

  return (
    <div className="pb-6">
      <div
        className="sticky top-0 z-20 -mx-3 flex flex-wrap items-center justify-between gap-2 border-b border-border/60 bg-card px-3 py-1.5 shadow-sm md:-mx-4 md:px-4"
      >
        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold leading-tight">
            {id ? 'Edit' : 'New'} {docConfig.formTitle}
          </h1>
          <p className="truncate text-[11px] leading-tight text-muted-foreground">
            {docConfig.title} &middot; {status}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowPreview(true)} disabled={saving}>
            <Eye className="mr-1.5 h-3.5 w-3.5" /> Print Preview
          </Button>
          <Button size="sm" variant="outline" onClick={() => save('draft')} disabled={saving}>
            <Save className="mr-1.5 h-3.5 w-3.5" /> Save Draft
          </Button>
          <Button size="sm" onClick={() => save('approved')} disabled={saving}>
            {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />}
            Approve &amp; Save
          </Button>
        </div>
      </div>

      <div className="space-y-2 pt-2">
        <DocumentHeaderBar
          title={docConfig.type === 'quotation' ? 'Quotation' : 'Document'}
          docNumber={docNumber}
          docNumberLoading={docNumberLoading}
          docDate={docDate}
          onDocDateChange={setDocDate}
          extraDate={extraDateField}
          referenceNumber={referenceNumber}
          onReferenceNumberChange={setReferenceNumber}
          status={status}
        />

        <div className="grid grid-cols-1 gap-2 lg:grid-cols-3">
          <SourceCompanyBlock company={companyView} />
          <BillToBlock
            kind={docConfig.party}
            label={docConfig.partyLabel}
            state={party}
            onChange={setParty}
            newPartyPath={docConfig.party === 'customer' ? '/customers/new' : '/suppliers/new'}
          />
          <ShipToBlock state={party} onChange={setParty} savedShipping={null} />
        </div>

        <Card className="rounded-lg">
          <CardHeader className="px-3 pt-2 pb-0.5">
            <CardTitle className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Items
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-2.5 pt-0">
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_auto] lg:min-h-[600px]">
              <InvoiceItemsTable
                items={items}
                priceField={docConfig.priceField}
                interState={interState}
                onChange={setItems}
                onProductSelect={() => undefined}
              />
              <InvoiceTotals
                totals={totals}
                interState={interState}
                headerDiscount={headerDiscount}
                onHeaderDiscountChange={setHeaderDiscount}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader className="px-3 pt-2 pb-0.5">
            <CardTitle className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Payment Details
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-2.5 pt-0">
            <PaymentAllocationEditor
              methods={billingConfig?.paymentMethods ?? []}
              bankAccounts={billingConfig?.bankAccounts ?? []}
              allocations={payments}
              grandTotal={totals.grand_total}
              amountPaid={amountPaid}
              isEstimate={docConfig.isEstimate}
              onChange={setPayments}
            />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
          <Card className="rounded-lg">
            <CardHeader className="px-3 pt-2 pb-0.5">
              <CardTitle className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Terms &amp; Conditions
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-2.5 pt-0">
              <Label className="sr-only" htmlFor="terms">Terms and conditions</Label>
              <Textarea id="terms" rows={3} value={terms} onChange={(e) => setTerms(e.target.value)} />
            </CardContent>
          </Card>
          <Card className="rounded-lg">
            <CardHeader className="px-3 pt-2 pb-0.5">
              <CardTitle className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-2.5 pt-0">
              <Label className="sr-only" htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Internal note printed on the document, e.g. delivery instructions."
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {showPreview ? (
        <InvoicePrintPreview model={buildPrintModel()} onClose={() => setShowPreview(false)} />
      ) : null}
    </div>
  );
}

function itemToRow(item: TransactionItem, index: number, interState: boolean): BillingItemRow {
  return computeItemRow(
    {
      key: item.id || `row-${index}`,
      product_id: item.product_id,
      product_name: item.product_name,
      product_code: item.product_code || '',
      brand_name: item.brand_name || '',
      hsn_sac: item.hsn_sac || '',
      description: item.description || '',
      quantity: item.quantity,
      unit: item.unit || 'Pcs',
      rate: item.rate,
      discount_percent: item.discount_percent || 0,
      gst_rate: item.gst_rate,
      gross_amount: 0,
      discount_amount: 0,
      taxable_value: 0,
      cgst_amount: 0,
      sgst_amount: 0,
      igst_amount: 0,
      total_amount: 0,
    },
    interState
  );
}
