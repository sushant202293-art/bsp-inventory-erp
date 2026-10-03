import { formatDate, formatCurrency, formatNumber } from '@/lib/utils';
import { addressToMultiline, isAddressEmpty } from '@/lib/address';
import { maskAccountNumber } from '../billing-config.service';
import type { BillingPrintModel, BillingItemRow } from '../billing.types';

/**
 * The single A4 document layout. Used by Print Preview (on screen and through
 * the browser's own print dialog) so what the user sees is exactly what prints.
 */
export function InvoicePrintTemplate({ model }: { model: BillingPrintModel }) {
  const t = model.totals;
  const ship = model.shipTo;
  const hasShipAddress = Boolean(ship && !isAddressEmpty(ship.address));

  return (
    <div className="billing-print-doc">
      {/* ---------------- Header ---------------- */}
      <header className="flex items-start justify-between gap-3 border-b-2 border-neutral-800 pb-3">
        <div className="flex gap-3">
          {model.company.logo_url ? (
            <img
              src={model.company.logo_url}
              alt=""
              style={{ width: 56, height: 56, objectFit: 'contain', border: '1px solid #e5e7eb' }}
            />
          ) : null}
          <div>
            <p style={{ fontSize: 17, fontWeight: 700 }}>{model.company.name || 'Company Name'}</p>
            {model.company.address ? <p className="muted">{model.company.address}</p> : null}
            <p className="muted">
              {[model.company.city, model.company.state, model.company.pin].filter(Boolean).join(', ')}
              {model.company.country ? ` ${model.company.country}` : ''}
            </p>
            {model.company.phone ? <p className="muted">Phone: {model.company.phone}</p> : null}
            {model.company.email ? <p className="muted">Email: {model.company.email}</p> : null}
            <p>
              {model.company.gstin ? <strong>GSTIN: {model.company.gstin}</strong> : <span className="muted">GSTIN: not set</span>}
              {model.company.pan ? <span className="muted"> &middot; PAN: {model.company.pan}</span> : null}
            </p>
          </div>
        </div>

        <div style={{ textAlign: 'right', minWidth: 210 }}>
          <p
            style={{
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: 6,
            }}
          >
            {model.title}
          </p>
          <table style={{ width: 'auto', marginLeft: 'auto', fontSize: 11 }}>
            <tbody>
              <MetaRow label="Document No." value={model.documentNumber} />
              <MetaRow label="Date" value={formatDate(model.documentDate) || model.documentDate} />
              {model.validityDate ? <MetaRow label="Validity" value={formatDate(model.validityDate) || model.validityDate} /> : null}
              {model.expectedDelivery ? <MetaRow label="Delivery by" value={formatDate(model.expectedDelivery) || model.expectedDelivery} /> : null}
              {model.referenceNumber ? <MetaRow label="Reference" value={model.referenceNumber} /> : null}
              <MetaRow label="Status" value={model.status.toUpperCase()} />
            </tbody>
          </table>
        </div>
      </header>

      {/* ---------------- Parties ---------------- */}
      <section className="mt-3 grid grid-cols-2 gap-3">
        <div className="box">
          <p style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.06em' }}>
            Bill To / {model.billTo.label}
          </p>
          <p style={{ fontWeight: 600, marginTop: 4 }}>{model.billTo.name || '—'}</p>
          {model.billTo.code ? <p className="muted">Code: {model.billTo.code}</p> : null}
          <p className="whitespace-pre-line">{addressToMultiline(model.billTo.address)}</p>
          {model.billTo.contact_person ? <p className="muted">Contact: {model.billTo.contact_person}</p> : null}
          {model.billTo.phone ? <p className="muted">Phone: {model.billTo.phone}</p> : null}
          {model.billTo.email ? <p className="muted">Email: {model.billTo.email}</p> : null}
          <p>
            {model.billTo.gstin ? <strong>GSTIN: {model.billTo.gstin}</strong> : <span className="muted">GSTIN: —</span>}
          </p>
          <p className="muted">Place of Supply: {model.billTo.state || '—'}</p>
          <p className="muted">
            {model.interState ? 'Inter-state supply — IGST applies' : 'Intra-state supply — CGST + SGST apply'}
          </p>
        </div>

        <div className="box">
          <p style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.06em' }}>
            Ship To / Delivery Address
          </p>
          <p style={{ fontWeight: 600, marginTop: 4 }}>
            {(hasShipAddress && ship?.name) || model.billTo.name || '—'}
          </p>
          {hasShipAddress && ship ? (
            <>
              <p className="whitespace-pre-line">{addressToMultiline(ship.address)}</p>
              {ship.contact_person ? <p className="muted">Contact: {ship.contact_person}</p> : null}
              {ship.phone ? <p className="muted">Phone: {ship.phone}</p> : null}
              {ship.email ? <p className="muted">Email: {ship.email}</p> : null}
              {ship.gstin ? (
                <p>
                  <strong>GSTIN: {ship.gstin}</strong>
                </p>
              ) : null}
              <p className="muted">State: {ship.state || '—'}</p>
            </>
          ) : (
            <p className="muted" style={{ marginTop: 4 }}>
              No delivery address available yet. Tick &ldquo;Same as billing address&rdquo; after selecting a
              {model.billTo.name ? ` customer with a billing address` : ''}, or untick it to enter a delivery address
              manually.
            </p>
          )}
        </div>
      </section>

      {/* ---------------- Items ---------------- */}
      <section className="mt-3">
        <table className="doc-table">
          <thead>
            <tr>
              <th style={{ width: '4%' }}>#</th>
              <th style={{ textAlign: 'left' }}>Description of Goods / Services</th>
              <th style={{ width: '10%' }}>HSN/SAC</th>
              <th style={{ width: '7%', textAlign: 'right' }}>Qty</th>
              <th style={{ width: '6%' }}>Unit</th>
              <th style={{ width: '10%', textAlign: 'right' }}>Rate</th>
              <th style={{ width: '8%', textAlign: 'right' }}>Disc %</th>
              <th style={{ width: '12%', textAlign: 'right' }}>Taxable</th>
              <th style={{ width: '10%', textAlign: 'right' }}>GST</th>
              <th style={{ width: '13%', textAlign: 'right' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {model.items.map((item, index) => (
              <Line key={item.key} index={index} item={item} interState={model.interState} />
            ))}
          </tbody>
        </table>
      </section>

      {/* ---------------- Totals + tax summary ---------------- */}
      <section className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <TaxSummary items={model.items} interState={model.interState} />
        </div>

        <div>
          <table style={{ width: '100%' }}>
            <tbody>
              <TotalRow label="Gross subtotal" value={formatCurrency(t.gross)} />
              {t.discount > 0 ? <TotalRow label="Discount" value={`- ${formatCurrency(t.discount)}`} /> : null}
              <TotalRow label="Taxable amount" value={formatCurrency(t.taxable)} />
              {model.interState ? (
                <TotalRow label="IGST" value={formatCurrency(t.igst)} />
              ) : (
                <>
                  <TotalRow label="CGST" value={formatCurrency(t.cgst)} />
                  <TotalRow label="SGST" value={formatCurrency(t.sgst)} />
                </>
              )}
              <TotalRow label="Round off" value={`${t.round_off >= 0 ? '+' : ''}${formatCurrency(t.round_off)}`} />
              <tr>
                <td style={{ borderTop: '1px solid #111827', fontWeight: 700, fontSize: 13 }}>Grand Total</td>
                <td style={{ borderTop: '1px solid #111827', fontWeight: 700, fontSize: 13, textAlign: 'right' }}>
                  {formatCurrency(t.grand_total)}
                </td>
              </tr>
            </tbody>
          </table>
          <p style={{ marginTop: 6 }}>
            <strong>Amount in words:</strong> {t.amount_in_words}
          </p>
        </div>
      </section>

      {/* ---------------- Payments + bank ---------------- */}
      <section className="mt-3 grid grid-cols-2 gap-3">
        <div className="box">
          <p style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.06em' }}>
            Payment Details
          </p>
          {model.payments.length === 0 ? (
            <p className="muted" style={{ marginTop: 4 }}>
              {model.amountPaid > 0
                ? `Amount received: ${formatCurrency(model.amountPaid)}`
                : 'Payable as per agreed credit terms.'}
            </p>
          ) : (
            <table className="doc-table" style={{ marginTop: 4 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Method</th>
                  <th style={{ textAlign: 'left' }}>Bank / Account</th>
                  <th style={{ textAlign: 'left' }}>Reference</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {model.payments.map((row, index) => (
                  <tr key={`${row.method_key}-${index}`}>
                    <td>{row.method_label}</td>
                    <td>{row.bank_label || '—'}</td>
                    <td>{row.reference || '—'}</td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(row.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {model.amountPaid > 0 ? (
            <p style={{ marginTop: 4 }}>
              <strong>Paid:</strong> {formatCurrency(model.amountPaid)} &middot;{' '}
              <strong>Balance:</strong> {formatCurrency(Math.max(0, model.totals.grand_total - model.amountPaid))}
            </p>
          ) : null}
        </div>

        <div className="box">
          <p style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.06em' }}>
            Bank Details
          </p>
          {model.bankAccounts.filter((b) => b.is_active).length === 0 ? (
            <p className="muted" style={{ marginTop: 4 }}>Configure bank accounts in Settings → Payment Methods.</p>
          ) : (
            model.bankAccounts
              .filter((b) => b.is_active)
              .map((account) => (
                <div key={account.id} style={{ marginBottom: 6 }}>
                  <p style={{ fontWeight: 600 }}>
                    {account.bank_name}
                    {account.is_default ? ' (Default)' : ''}
                  </p>
                  <p className="muted">
                    A/c: {account.account_holder || model.company.name} &middot;{' '}
                    {maskAccountNumber(account.account_number)}
                  </p>
                  {account.ifsc ? <p className="muted">IFSC: {account.ifsc}</p> : null}
                  {account.upi_id ? <p className="muted">UPI: {account.upi_id}</p> : null}
                </div>
              ))
          )}
        </div>
      </section>

      {/* ---------------- Terms ---------------- */}
      <section className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <p style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.06em' }}>
            Terms &amp; Conditions
          </p>
          <p className="whitespace-pre-line" style={{ marginTop: 4 }}>
            {model.terms || '—'}
          </p>
        </div>
        <div>
          <p style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.06em' }}>
            Notes
          </p>
          <p className="whitespace-pre-line" style={{ marginTop: 4 }}>
            {model.notes || '—'}
          </p>
        </div>
      </section>

      {/* ---------------- Signature ---------------- */}
      <section className="mt-3 flex items-end justify-between border-t border-neutral-300 pt-3">
        <p className="muted">Receiver&rsquo;s Signature</p>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontWeight: 600 }}>For {model.company.name || 'Company'}</p>
          <p className="muted" style={{ marginTop: 24 }}>Authorized Signatory</p>
        </div>
      </section>
      <p className="muted" style={{ textAlign: 'center', fontSize: 9, marginTop: 8 }}>
        This is a computer generated {model.title.toLowerCase()} and does not require a signature.
      </p>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td className="muted" style={{ paddingRight: 10, whiteSpace: 'nowrap' }}>
        {label}
      </td>
      <td style={{ fontWeight: 600, textAlign: 'left' }}>{value}</td>
    </tr>
  );
}

function Line({
  index,
  item,
  interState,
}: {
  index: number;
  item: BillingItemRow;
  interState: boolean;
}) {
  const description = [item.product_name, item.brand_name ? `(${item.brand_name})` : '']
    .filter(Boolean)
    .join(' ');
  return (
    <tr>
      <td>{index + 1}</td>
      <td>
        <strong>{description || '—'}</strong>
        {item.product_code ? <div className="muted">Code: {item.product_code}</div> : null}
        {item.description ? <div className="muted">{item.description}</div> : null}
      </td>
      <td>{item.hsn_sac || '—'}</td>
      <td style={{ textAlign: 'right' }}>{formatNumber(item.quantity)}</td>
      <td>{item.unit || '—'}</td>
      <td style={{ textAlign: 'right' }}>{formatNumber(item.rate)}</td>
      <td style={{ textAlign: 'right' }}>{item.discount_percent || 0}</td>
      <td style={{ textAlign: 'right' }}>{item.taxable_value.toFixed(2)}</td>
      <td style={{ textAlign: 'right' }}>{item.gst_rate}%</td>
      <td style={{ textAlign: 'right', fontWeight: 600 }}>{item.total_amount.toFixed(2)}</td>
    </tr>
  );
}

/** HSN-wise tax summary - mandatory on a GST tax invoice. */
function TaxSummary({ items, interState }: { items: BillingItemRow[]; interState: boolean }) {
  const groups = new Map<
    string,
    { hsn: string; rate: number; taxable: number; cgst: number; sgst: number; igst: number }
  >();

  for (const item of items) {
    const hsn = item.hsn_sac || item.product_code || '0000';
    const key = `${hsn}@${item.gst_rate}`;
    const entry = groups.get(key) || { hsn, rate: item.gst_rate, taxable: 0, cgst: 0, sgst: 0, igst: 0 };
    entry.taxable += item.taxable_value;
    entry.cgst += item.cgst_amount;
    entry.sgst += item.sgst_amount;
    entry.igst += item.igst_amount;
    groups.set(key, entry);
  }

  const rows = Array.from(groups.values());
  if (rows.length === 0) return null;

  return (
    <div>
      <p style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.06em' }}>
        Tax Summary (HSN wise)
      </p>
      <table className="doc-table" style={{ marginTop: 4 }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left' }}>HSN/SAC</th>
            <th style={{ textAlign: 'right' }}>Taxable</th>
            <th style={{ textAlign: 'right' }}>{interState ? 'IGST' : 'CGST'}</th>
            <th style={{ textAlign: 'right' }}>{interState ? '—' : 'SGST'}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.hsn}-${row.rate}`}>
              <td>{row.hsn}</td>
              <td style={{ textAlign: 'right' }}>{row.taxable.toFixed(2)}</td>
              <td style={{ textAlign: 'right' }}>
                {interState ? `${row.rate}% = ${row.igst.toFixed(2)}` : `${row.rate / 2}% = ${row.cgst.toFixed(2)}`}
              </td>
              <td style={{ textAlign: 'right' }}>
                {interState ? '—' : `${row.rate / 2}% = ${row.sgst.toFixed(2)}`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td className="muted">{label}</td>
      <td style={{ textAlign: 'right' }}>{value}</td>
    </tr>
  );
}
