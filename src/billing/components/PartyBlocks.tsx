import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Building2, Check, ChevronDown, ChevronRight, Pencil, Plus, Search } from 'lucide-react';
import { customerService } from '@/services/customer.service';
import { supplierService } from '@/services/supplier.service';
import { EMPTY_ADDRESS, toAddress, addressToMultiline, addressToString } from '@/lib/address';
import type { Address } from '@/types/database.types';
import type { BillingPartyState } from '../billing.types';
import type { CompanyView } from '@/contexts/CompanyContext';

/**
 * Every party card is deliberately shallow (~120-180px on a 1920px screen) so
 * that the items grid below gets the viewport: tight header, 11px body text
 * with short line boxes, 28px inputs and collapsed address fields.
 */
const HEADER = 'px-2 pt-1.5 pb-0.5';
const BODY = 'px-2 pb-2 pt-0 text-[11px] leading-snug';

/* ------------------------------------------------------------------ */
/* Source Company / From                                               */
/* ------------------------------------------------------------------ */

/**
 * Read-only view of the active company. The details are taken from the
 * Company Profile, never re-typed per invoice, and the same object is stored
 * as `transactions.company_snapshot` when the document is saved.
 */
export function SourceCompanyBlock({ company }: { company: CompanyView }) {
  const missing: string[] = [];
  if (!company.name) missing.push('company name');
  if (!company.address) missing.push('address');
  if (!company.gstin) missing.push('GSTIN');

  const cityLine = [company.city, company.state, company.pincode].filter(Boolean).join(', ');
  const contactLine = [company.phone ? `Ph ${company.phone}` : '', company.email || ''].filter(Boolean).join('  ·  ');

  return (
    <Card className="rounded-sm">
      <CardHeader className={HEADER}>
        <CardTitle className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          <Building2 className="h-3 w-3" /> Source Company / From
        </CardTitle>
      </CardHeader>
      <CardContent className={`${BODY} space-y-0.5`}>
        <div className="flex items-start gap-1.5">
          {company.logo ? (
            <img
              src={company.logo}
              alt=""
              className="h-6 w-6 shrink-0 rounded-sm border object-contain bg-white"
            />
          ) : null}
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold leading-tight text-foreground">
              {company.name || 'Company not configured'}
            </p>
            {company.tagline ? (
              <p className="truncate text-[10px] leading-tight text-muted-foreground">{company.tagline}</p>
            ) : null}
          </div>
        </div>

        {company.address ? <p className="truncate text-muted-foreground">{company.address}</p> : null}
        <p className="truncate text-muted-foreground">
          {cityLine}
          {company.country ? ` ${company.country}` : ''}
        </p>
        <p className="truncate text-muted-foreground">
          {contactLine}
          {company.website ? `  ·  ${company.website}` : ''}
        </p>
        <p className="truncate text-muted-foreground">
          {company.gstin ? (
            <>
              GSTIN: <span className="font-medium text-foreground">{company.gstin}</span>
            </>
          ) : (
            'GSTIN: not set'
          )}
          {company.pan ? <> &middot; PAN: {company.pan}</> : null}
        </p>

        {missing.length > 0 ? (
          <p className="rounded-sm border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[10px] leading-snug text-amber-600 dark:text-amber-400">
            Missing {missing.join(', ')} — complete in Settings
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Bill To / Customer                                                  */
/* ------------------------------------------------------------------ */

interface PartyBlockProps {
  kind: 'customer' | 'supplier';
  label: string;
  state: BillingPartyState;
  onChange: (next: BillingPartyState) => void;
  newPartyPath: string;
}

export function BillToBlock({ kind, label, state, onChange, newPartyPath }: PartyBlockProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Array<Record<string, unknown>>>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  // Address fields only take the space they need: collapsed into a one-line
  // summary until the party has none on file or the user asks to edit it.
  const [showAddress, setShowAddress] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Prefill the search box with the selected party's name so the field is
  // never left showing raw address text.
  useEffect(() => {
    if (state.party_id) setQuery(state.name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.party_id]);

  // A party without an address needs the fields straight away; one with an
  // address on file keeps them folded away until "Edit address".
  useEffect(() => {
    if (!state.party_id) return;
    setShowAddress(!(state.billing.line1 || state.billing.city));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.party_id]);

  function search(value: string) {
    setQuery(value);
    if (timer.current) clearTimeout(timer.current);
    if (value.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    setSearching(true);
    timer.current = setTimeout(async () => {
      try {
        const data =
          kind === 'customer'
            ? await customerService.getCustomers({ search: value, limit: 8 })
            : await supplierService.getSuppliers({ search: value, limit: 8 });
        const rows =
          kind === 'customer'
            ? (data as { customers?: Array<Record<string, unknown>> }).customers || []
            : (data as { suppliers?: Array<Record<string, unknown>> }).suppliers || [];
        setResults(rows);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 250);
  }

  function select(row: Record<string, unknown>) {
    const billing = toAddress({
      ...(typeof row.billing_address === 'object' && row.billing_address ? (row.billing_address as object) : {}),
      city: (row.billing_address as Address | null)?.city || (row.city as string) || '',
      state: (row.billing_address as Address | null)?.state || (row.state as string) || '',
      pin: (row.billing_address as Address | null)?.pin || (row.pin as string) || '',
    });
    const shipping = toAddress(row.shipping_address);
    const hasShipping = Boolean(shipping.line1 && (shipping.city || shipping.state));

    onChange({
      ...state,
      party_id: row.id as string,
      name: (row.name as string) || '',
      code: (row.code as string) || '',
      contact_person: (row.contact_person as string) || '',
      phone: (row.phone as string) || '',
      email: (row.email as string) || '',
      gstin: (row.gstin as string) || '',
      state: (row.state as string) || billing.state,
      billing,
      shipping: hasShipping ? shipping : { ...billing },
      same_as_billing: !hasShipping,
      shipping_recipient: (row.name as string) || '',
      shipping_contact: (row.contact_person as string) || '',
      shipping_phone: (row.phone as string) || '',
      shipping_email: (row.email as string) || '',
    });
    setQuery((row.name as string) || '');
    setOpen(false);
  }

  function patch(partial: Partial<BillingPartyState>) {
    onChange({ ...state, ...partial });
  }

  function patchBilling(partial: Partial<Address>) {
    onChange({ ...state, billing: { ...state.billing, ...partial } });
  }

  const noAddress = !state.billing.line1 && !state.billing.city;
  const isNewParty = Boolean(state.party_id) === false && Boolean(state.name);
  const addressSummary = addressToString(state.billing) || 'No billing address';

  return (
    <Card className="rounded-lg">
      <CardHeader className={HEADER}>
        <CardTitle className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          <span>Bill To / {label}</span>
          <Link to={newPartyPath} className="flex items-center gap-1 text-[11px] font-normal normal-case text-primary hover:underline">
            <Plus className="h-3 w-3" /> New
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className={`${BODY} space-y-1.5`}>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => search(e.target.value)}
            onFocus={() => results.length > 0 && setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder={`Search ${label.toLowerCase()} name, code, phone, GSTIN...`}
            className="h-7 pl-7 text-[12px]"
          />
          {open && (
            <div className="absolute z-40 mt-1 max-h-56 w-full overflow-y-auto rounded border bg-popover shadow-lg">
              {searching ? (
                <p className="px-3 py-2 text-sm text-muted-foreground">Searching...</p>
              ) : results.length === 0 ? (
                <p className="px-3 py-2 text-sm text-muted-foreground">
                  No {label.toLowerCase()} matches. Use &ldquo;New&rdquo; to add one.
                </p>
              ) : (
                results.map((row) => (
                  <button
                    key={row.id as string}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => select(row)}
                    className="block w-full px-3 py-1.5 text-left text-sm hover:bg-primary/10"
                  >
                    <span className="font-medium">{row.name as string}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {[row.code, row.phone, row.gstin].filter(Boolean).join(' · ')}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {state.party_id ? (
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <Check className="h-3.5 w-3.5 shrink-0 text-green-500" />
            <span className="truncate">
              Selected: <span className="font-medium text-foreground">{state.name}</span>
              {state.code ? <span className="text-muted-foreground"> ({state.code})</span> : null}
            </span>
            <button
              type="button"
              className="ml-auto flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
              onClick={() =>
                onChange({
                  ...state,
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
                })
              }
            >
              Clear
            </button>
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-x-2 gap-y-1 2xl:grid-cols-4">
          <Field label="Contact person" value={state.contact_person} onChange={(v) => patch({ contact_person: v })} />
          <Field label="Phone" value={state.phone} onChange={(v) => patch({ phone: v })} />
          <Field label="Email" value={state.email} onChange={(v) => patch({ email: v })} />
          <Field label="GSTIN" value={state.gstin} onChange={(v) => patch({ gstin: v })} />
        </div>

        <div>
          <button
            type="button"
            onClick={() => setShowAddress((prev) => !prev)}
            className="flex w-full items-center justify-between gap-2 rounded border border-border bg-muted/40 px-2 py-1 text-left text-[11px] leading-tight text-muted-foreground hover:bg-muted"
          >
            <span className="truncate">{showAddress ? 'Billing address' : addressSummary}</span>
            <span className="flex shrink-0 items-center gap-1 text-primary">
              {showAddress ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              {showAddress ? 'Hide' : 'Edit'}
            </span>
          </button>

          {showAddress ? (
            <div className="mt-1.5 space-y-1.5">
              <Input
                value={state.billing.line1}
                onChange={(e) => patchBilling({ line1: e.target.value })}
                placeholder="Address line 1"
                className="h-7 text-[12px]"
              />
              <Input
                value={state.billing.line2 || ''}
                onChange={(e) => patchBilling({ line2: e.target.value || null })}
                placeholder="Address line 2"
                className="h-7 text-[12px]"
              />
              <div className="grid grid-cols-3 gap-1.5">
                <Input
                  value={state.billing.city}
                  onChange={(e) => patchBilling({ city: e.target.value })}
                  placeholder="City"
                  className="h-7 text-[12px]"
                />
                <Input
                  value={state.billing.state}
                  onChange={(e) => patchBilling({ state: e.target.value })}
                  placeholder="State"
                  className="h-7 text-[12px]"
                />
                <Input
                  value={state.billing.pin}
                  onChange={(e) => patchBilling({ pin: e.target.value })}
                  placeholder="PIN"
                  className="h-7 text-[12px]"
                />
              </div>
              <Input
                value={state.billing.country}
                onChange={(e) => patchBilling({ country: e.target.value })}
                placeholder="Country"
                className="h-7 text-[12px]"
              />
            </div>
          ) : null}
        </div>

        {noAddress && state.party_id ? (
          <p className="rounded border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[11px] leading-snug text-amber-600 dark:text-amber-400">
            No billing address on file for this {label.toLowerCase()}; it is saved on this document only.
          </p>
        ) : null}
        {isNewParty && !state.party_id ? (
          <p className="text-[11px] leading-snug text-muted-foreground">
            Free-text party: save it through{' '}
            <Link to={newPartyPath} className="text-primary hover:underline">
              {label}s
            </Link>{' '}
            to reuse it later.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Ship To / Delivery Address                                          */
/* ------------------------------------------------------------------ */

export function ShipToBlock({
  state,
  onChange,
  savedShipping,
}: {
  state: BillingPartyState;
  onChange: (next: BillingPartyState) => void;
  savedShipping: Address | null;
}) {
  // The delivery address only opens up when the user actually edits it.
  const [showAddress, setShowAddress] = useState(false);

  function patch(partial: Partial<BillingPartyState>) {
    onChange({ ...state, ...partial });
  }
  function patchShipping(partial: Partial<Address>) {
    onChange({ ...state, shipping: { ...state.shipping, ...partial } });
  }

  const shippingSummary = addressToString(state.shipping) || 'No delivery address';

  return (
    <Card className="rounded-lg">
      <CardHeader className={HEADER}>
        <CardTitle className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Ship To / Delivery Address
        </CardTitle>
      </CardHeader>
      <CardContent className={`${BODY} space-y-1.5`}>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <label className="flex cursor-pointer items-center gap-2 text-[12px]">
            <input
              type="checkbox"
              id="sameAsBilling"
              checked={state.same_as_billing}
              onChange={(e) => {
                patch({
                  same_as_billing: e.target.checked,
                  ...(e.target.checked ? { shipping: { ...state.billing } } : {}),
                });
                if (!e.target.checked) setShowAddress(true);
              }}
              className="h-3.5 w-3.5 rounded border-input"
            />
            Same as billing address
          </label>
          {savedShipping && !state.same_as_billing ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[11px]"
              onClick={() =>
                patch({
                  shipping: savedShipping,
                  shipping_recipient: state.name,
                  shipping_contact: state.contact_person,
                  shipping_phone: state.phone,
                })
              }
            >
              <Pencil className="mr-1 h-3 w-3" /> Use saved shipping address
            </Button>
          ) : null}
        </div>

        {state.same_as_billing ? (
          <div className="rounded border border-border bg-muted/40 px-2 py-1.5 leading-snug">
            <p className="truncate font-medium">{state.name || '—'}</p>
            <p className="line-clamp-2 whitespace-pre-line text-muted-foreground">
              {addressToMultiline(state.billing) || 'No billing address'}
            </p>
            <p className="truncate text-muted-foreground">
              {[state.phone ? `Ph ${state.phone}` : '', state.gstin ? `GSTIN ${state.gstin}` : '']
                .filter(Boolean)
                .join('  ·  ')}
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            <div className="grid grid-cols-2 gap-x-2 gap-y-1">
              <Field label="Recipient" value={state.shipping_recipient} onChange={(v) => patch({ shipping_recipient: v })} />
              <Field label="Contact person" value={state.shipping_contact} onChange={(v) => patch({ shipping_contact: v })} />
              <Field label="Phone" value={state.shipping_phone} onChange={(v) => patch({ shipping_phone: v })} />
              <Field label="Email" value={state.shipping_email} onChange={(v) => patch({ shipping_email: v })} />
            </div>

            <button
              type="button"
              onClick={() => setShowAddress((prev) => !prev)}
              className="flex w-full items-center justify-between gap-2 rounded border border-border bg-muted/40 px-2 py-1 text-left text-[11px] leading-tight text-muted-foreground hover:bg-muted"
            >
              <span className="truncate">{showAddress ? 'Delivery address' : shippingSummary}</span>
              <span className="flex shrink-0 items-center gap-1 text-primary">
                {showAddress ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                {showAddress ? 'Hide' : 'Edit'}
              </span>
            </button>

            {showAddress ? (
              <div className="space-y-1.5">
                <Input
                  value={state.shipping.line1}
                  onChange={(e) => patchShipping({ line1: e.target.value })}
                  placeholder="Address line 1"
                  className="h-7 text-[12px]"
                />
                <Input
                  value={state.shipping.line2 || ''}
                  onChange={(e) => patchShipping({ line2: e.target.value || null })}
                  placeholder="Address line 2"
                  className="h-7 text-[12px]"
                />
                <div className="grid grid-cols-3 gap-1.5">
                  <Input
                    value={state.shipping.city}
                    onChange={(e) => patchShipping({ city: e.target.value })}
                    placeholder="City"
                    className="h-7 text-[12px]"
                  />
                  <Input
                    value={state.shipping.state}
                    onChange={(e) => patchShipping({ state: e.target.value })}
                    placeholder="State"
                    className="h-7 text-[12px]"
                  />
                  <Input
                    value={state.shipping.pin}
                    onChange={(e) => patchShipping({ pin: e.target.value })}
                    placeholder="PIN"
                    className="h-7 text-[12px]"
                  />
                </div>
                <Input
                  value={state.shipping.country}
                  onChange={(e) => patchShipping({ country: e.target.value })}
                  placeholder="Country"
                  className="h-7 text-[12px]"
                />
              </div>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-0.5">
      <Label className="block truncate text-[10px] leading-none text-muted-foreground">{label}</Label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || label}
        className="h-7 text-[12px]"
      />
    </div>
  );
}
