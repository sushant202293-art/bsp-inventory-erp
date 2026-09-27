import { supabase } from '@/lib/supabase';

export async function exportToExcel(data: Record<string, unknown>[], filename: string): Promise<void> {
  try {
    if (data.length === 0) {
      throw new Error('No data to export');
    }

    const XLSX = await import('xlsx');
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

    const colWidths = Object.keys(data[0]).map((key) => ({
      wch: Math.max(
        key.length,
        ...data.map((row) => String(row[key] || '').length)
      ) + 2,
    }));
    worksheet['!cols'] = colWidths;

    XLSX.writeFile(workbook, `${filename}.xlsx`);
  } catch (error) {
    throw new Error(`Failed to export to Excel: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function exportToCSV(data: Record<string, unknown>[], filename: string): Promise<void> {
  try {
    if (data.length === 0) {
      throw new Error('No data to export');
    }

    const headers = Object.keys(data[0]);
    const csvRows: string[] = [];

    csvRows.push(headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(','));

    for (const row of data) {
      const values = headers.map((header) => {
        const val = row[header];
        const str = val === null || val === undefined ? '' : String(val);
        return `"${str.replace(/"/g, '""')}"`;
      });
      csvRows.push(values.join(','));
    }

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  } catch (error) {
    throw new Error(`Failed to export to CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function importFromExcel(file: File): Promise<Record<string, unknown>[]> {
  try {
    const XLSX = await import('xlsx');
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });

    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      throw new Error('No sheets found in the Excel file');
    }

    const worksheet = workbook.Sheets[firstSheetName];
    const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet);

    return data;
  } catch (error) {
    throw new Error(`Failed to import from Excel: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function importFromCSV(file: File): Promise<Record<string, unknown>[]> {
  try {
    const text = await file.text();
    const lines = text.split('\n').filter((line) => line.trim() !== '');

    if (lines.length < 2) {
      throw new Error('CSV file must have at least a header row and one data row');
    }

    const headers = lines[0].split(',').map((h) => h.replace(/^"|"$/g, '').trim());
    const data: Record<string, unknown>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.replace(/^"|"$/g, '').trim());
      const row: Record<string, unknown> = {};
      headers.forEach((header, index) => {
        const val = values[index] || '';
        const num = Number(val);
        row[header] = val !== '' && !isNaN(num) ? num : val;
      });
      data.push(row);
    }

    return data;
  } catch (error) {
    throw new Error(`Failed to import from CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

import { formatCurrency, formatDate, amountInWords, getStateCode, roundTo2 } from '@/lib/utils';

interface PrintAddress {
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  pin?: string | null;
  country?: string | null;
}

interface PrintParty {
  name?: string | null;
  gstin?: string | null;
  phone?: string | null;
  email?: string | null;
  billing_address?: PrintAddress | string | null;
}

interface PrintCompany {
  name?: string | null;
  logo_url?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pin?: string | null;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  gstin?: string | null;
  pan?: string | null;
  cin?: string | null;
  bank_name?: string | null;
  bank_account_name?: string | null;
  bank_account_number?: string | null;
  bank_ifsc?: string | null;
  bank_branch?: string | null;
  bank_upi?: string | null;
}

interface PrintItem {
  product_name?: string | null;
  product_code?: string | null;
  hsn_sac?: string | null;
  quantity?: number | null;
  unit?: string | null;
  rate?: number | null;
  discount_percent?: number | null;
  discount_amount?: number | null;
  taxable_value?: number | null;
  cgst_amount?: number | null;
  sgst_amount?: number | null;
  igst_amount?: number | null;
  gst_rate?: number | null;
  total_amount?: number | null;
}

interface PrintDoc {
  document_number?: string | null;
  document_date?: string | null;
  reference_number?: string | null;
  type?: string | null;
  status?: string | null;
  subtotal?: number | null;
  discount_amount?: number | null;
  tax_amount?: number | null;
  round_off?: number | null;
  grand_total?: number | null;
  notes?: string | null;
  terms?: string | null;
  validity_date?: string | null;
  customer?: PrintParty | null;
  supplier?: PrintParty | null;
  billing_address?: PrintAddress | string | null;
  // payments_received / payments_made columns
  amount?: number | null;
  date?: string | null;
  mode?: string | null;
  bank_name?: string | null;
}

const str = (v: string | null | undefined): string => v ?? '';
const num = (v: number | null | undefined): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

function toAddress(v: PrintAddress | string | null | undefined): PrintAddress {
  if (!v) return {};
  if (typeof v === 'string') return { line1: v };
  return v;
}

function addressLines(a: PrintAddress): string[] {
  const parts = [a.line1, a.line2, [a.city, a.state].filter(Boolean).join(', '), a.pin, a.country].filter(
    (p) => p && String(p).trim()
  );
  return parts.map((p) => str(p));
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function isInterState(companyState: string | null | undefined, partyState: string | null | undefined): boolean {
  const companyCode = getStateCode(str(companyState));
  const partyCode = getStateCode(str(partyState));
  if (!companyCode || !partyCode) return false;
  return companyCode !== partyCode;
}

export async function printDocument(docType: string, docId: string): Promise<void> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    const companyId = (profile as { company_id: string | null } | null)?.company_id;
    if (!companyId) throw new Error('No company assigned to your account');

    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .single();

    if (companyError) throw companyError;
    const company = companyData as PrintCompany;

    let doc: PrintDoc | null = null;
    let items: PrintItem[] = [];

    const isTransaction =
      docType === 'invoice' ||
      docType === 'sale' ||
      docType === 'purchase' ||
      docType === 'quotation' ||
      docType === 'proforma' ||
      docType === 'purchase_order' ||
      docType === 'delivery_challan';

    if (isTransaction) {
      const { data: txn, error: txnError } = await supabase
        .from('transactions')
        .select(
          `*,
           customer:customers(name, gstin, phone, email, billing_address),
           supplier:suppliers(name, gstin, phone, email, billing_address)`
        )
        .eq('id', docId)
        .eq('company_id', companyId)
        .single();

      if (txnError || !txn) throw new Error('Document not found');
      doc = txn as PrintDoc;

      const { data: txnItems, error: itemsError } = await supabase
        .from('transaction_items')
        .select('*')
        .eq('transaction_id', docId)
        .order('sort_order');

      if (itemsError) throw itemsError;
      items = (txnItems ?? []) as PrintItem[];
    } else if (docType === 'payment') {
      const { data: received } = await supabase
        .from('payments_received')
        .select('*, customer:customers(name, gstin, phone, billing_address)')
        .eq('id', docId)
        .eq('company_id', companyId)
        .maybeSingle();

      if (received) {
        doc = received as PrintDoc;
      } else {
        const { data: made, error: madeError } = await supabase
          .from('payments_made')
          .select('*, supplier:suppliers(name, gstin, phone, billing_address)')
          .eq('id', docId)
          .eq('company_id', companyId)
          .single();

        if (madeError || !made) throw new Error('Payment not found');
        doc = made as PrintDoc;
      }
    } else {
      throw new Error(`Unsupported document type: ${docType}`);
    }

    if (!doc) throw new Error('Document data not found');

    const party = docType === 'purchase' || docType === 'purchase_order' || !doc.customer ? doc.supplier : doc.customer;
    const partyAddress = toAddress(party?.billing_address ?? doc.billing_address);
    const companyAddress: PrintAddress = {
      line1: company.address,
      city: company.city,
      state: company.state,
      pin: company.pin,
      country: company.country,
    };

    const interState = isInterState(company.state, partyAddress.state);
    const hasItems = items.length > 0;

    const rowsHtml = hasItems
      ? items
          .map((item, index) => {
            const taxable = num(item.taxable_value);
            const total = num(item.total_amount);
            return `
        <tr>
          <td>${index + 1}</td>
          <td>
            <strong>${escapeHtml(str(item.product_name))}</strong>
            ${item.hsn_sac ? `<div class="muted">HSN: ${escapeHtml(str(item.hsn_sac))}</div>` : ''}
          </td>
          <td class="num">${num(item.quantity).toFixed(2)} ${escapeHtml(str(item.unit))}</td>
          <td class="num">${num(item.rate).toFixed(2)}</td>
          <td class="num">${taxable.toFixed(2)}</td>
          <td class="num">${num(item.gst_rate).toFixed(2)}%</td>
          <td class="num">${
            interState
              ? num(item.igst_amount).toFixed(2)
              : `${num(item.cgst_amount).toFixed(2)}<br>${num(item.sgst_amount).toFixed(2)}`
          }</td>
          <td class="num"><strong>${total.toFixed(2)}</strong></td>
        </tr>`;
          })
          .join('')
      : '';

    const cgstTotal = items.reduce((sum, i) => sum + num(i.cgst_amount), 0);
    const sgstTotal = items.reduce((sum, i) => sum + num(i.sgst_amount), 0);
    const igstTotal = items.reduce((sum, i) => sum + num(i.igst_amount), 0);
    const taxableTotal = items.reduce((sum, i) => sum + num(i.taxable_value), 0);
    const isPaymentDoc = docType === 'payment';
    const grandTotal = roundTo2(
      num(doc.grand_total) || num(doc.amount) || taxableTotal + num(doc.tax_amount)
    );

    // A payment receipt has no line items and no tax split, so it must not
    // print an empty GST breakdown table or a meaningless "Balance Due".
    const totalsHtml = isPaymentDoc
      ? `<table class="totals">
           <tr class="grand"><td>Amount Received</td><td class="num">${formatCurrency(grandTotal)}</td></tr>
         </table>
         <div class="words">Amount in words: <strong>${escapeHtml(amountInWords(grandTotal))} Rupees Only</strong></div>`
      : `<table class="totals">
           <tr><td>Subtotal</td><td class="num">${num(doc.subtotal).toFixed(2)}</td></tr>
           ${
             num(doc.discount_amount)
               ? `<tr><td>Discount</td><td class="num">-${num(doc.discount_amount).toFixed(2)}</td></tr>`
               : ''
           }
           ${
             interState
               ? `<tr><td>IGST</td><td class="num">${igstTotal.toFixed(2)}</td></tr>`
               : `<tr><td>CGST</td><td class="num">${cgstTotal.toFixed(2)}</td></tr>
                  <tr><td>SGST</td><td class="num">${sgstTotal.toFixed(2)}</td></tr>`
           }
           <tr><td>Round Off</td><td class="num">${num(doc.round_off).toFixed(2)}</td></tr>
           <tr class="grand"><td>Grand Total</td><td class="num">${formatCurrency(grandTotal)}</td></tr>
         </table>
         <div class="words">Amount in words: <strong>${escapeHtml(amountInWords(grandTotal))} Rupees Only</strong></div>`;

    const bankHtml = company.bank_name
      ? `<div class="bank">
           <strong>Bank Details</strong>
           <div>Bank: ${escapeHtml(str(company.bank_name))}${company.bank_branch ? `, ${escapeHtml(str(company.bank_branch))}` : ''}</div>
           <div>A/c Name: ${escapeHtml(str(company.bank_account_name) || str(company.name))}</div>
           <div>A/c No: ${escapeHtml(str(company.bank_account_number))}</div>
           <div>IFSC: ${escapeHtml(str(company.bank_ifsc))}</div>
           ${company.bank_upi ? `<div>UPI: ${escapeHtml(str(company.bank_upi))}</div>` : ''}
         </div>`
      : '';

    const titleMap: Record<string, string> = {
      invoice: 'Tax Invoice',
      sale: 'Sales Invoice',
      purchase: 'Purchase Invoice',
      quotation: 'Quotation',
      proforma: 'Proforma Invoice',
      purchase_order: 'Purchase Order',
      delivery_challan: 'Delivery Challan',
      payment: 'Payment Receipt',
    };

    const printContent = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${titleMap[docType] ?? 'Document'} ${escapeHtml(str(doc.document_number))}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: "Segoe UI", Arial, sans-serif; font-size: 12px; color: #111827; margin: 0; padding: 24px; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #111827; padding-bottom: 12px; }
  .company-name { font-size: 20px; font-weight: 700; }
  .doc-title { font-size: 15px; font-weight: 700; text-align: right; text-transform: uppercase; }
  .muted { color: #6b7280; font-size: 11px; }
  .grid { display: flex; justify-content: space-between; gap: 24px; margin: 16px 0; }
  .party { border: 1px solid #d1d5db; padding: 10px; min-width: 280px; }
  .meta { text-align: right; }
  .meta div { margin-bottom: 3px; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  th, td { border: 1px solid #d1d5db; padding: 6px 8px; }
  th { background: #f3f4f6; text-align: left; font-size: 11px; text-transform: uppercase; }
  td.num, th.num { text-align: right; }
  .totals { width: 320px; margin-left: auto; margin-top: 14px; }
  .totals td { border: none; border-bottom: 1px solid #e5e7eb; padding: 4px 8px; }
  .totals tr.grand td { font-weight: 700; font-size: 14px; border-top: 2px solid #111827; border-bottom: none; }
  .words { margin-top: 14px; padding: 8px; background: #f9fafb; border-left: 3px solid #111827; }
  .foot { display: flex; justify-content: space-between; margin-top: 28px; gap: 24px; }
  .bank { border: 1px solid #d1d5db; padding: 10px; font-size: 11px; min-width: 280px; }
  .sign { text-align: right; min-width: 240px; }
  .sign div { margin-top: 48px; border-top: 1px solid #111827; padding-top: 4px; }
  @media print { body { padding: 0; } .no-print { display: none; } }
</style>
</head>
<body>
  <div class="head">
    <div>
      <div class="company-name">${escapeHtml(str(company.name))}</div>
      ${addressLines(companyAddress).map((l) => `<div>${escapeHtml(l)}</div>`).join('')}
      <div class="muted">
        ${company.phone ? `Phone: ${escapeHtml(str(company.phone))} ` : ''}
        ${company.email ? `| Email: ${escapeHtml(str(company.email))}` : ''}
        ${company.website ? `| ${escapeHtml(str(company.website))}` : ''}
      </div>
      <div class="muted">
        ${company.gstin ? `GSTIN: ${escapeHtml(str(company.gstin))}` : ''}
        ${company.pan ? ` | PAN: ${escapeHtml(str(company.pan))}` : ''}
        ${company.cin ? ` | CIN: ${escapeHtml(str(company.cin))}` : ''}
      </div>
    </div>
    <div class="doc-title">
      ${titleMap[docType] ?? 'Document'}
      <div style="font-weight: 400; font-size: 12px; margin-top: 4px;">${escapeHtml(str(doc.document_number))}</div>
    </div>
  </div>

  <div class="grid">
    <div class="party">
      <strong>${docType === 'purchase' || docType === 'purchase_order' || (party && !doc.customer) ? 'Supplier' : 'Customer'}</strong>
      <div>${escapeHtml(str(party?.name))}</div>
      ${addressLines(partyAddress).map((l) => `<div>${escapeHtml(l)}</div>`).join('')}
      ${party?.gstin ? `<div><strong>GSTIN:</strong> ${escapeHtml(str(party.gstin))}</div>` : ''}
      ${party?.phone ? `<div>Phone: ${escapeHtml(str(party.phone))}</div>` : ''}
    </div>
    <div class="meta">
      <div><strong>Date:</strong> ${formatDate(str(doc.document_date) || str(doc.date) || new Date().toISOString())}</div>
      ${
        doc.reference_number
          ? `<div><strong>${isPaymentDoc ? 'Ref No' : 'Reference'}:</strong> ${escapeHtml(str(doc.reference_number))}</div>`
          : ''
      }
      ${doc.validity_date ? `<div><strong>Valid Till:</strong> ${formatDate(str(doc.validity_date))}</div>` : ''}
      ${doc.mode ? `<div><strong>Mode:</strong> ${escapeHtml(str(doc.mode))}</div>` : ''}
      ${doc.bank_name ? `<div><strong>Bank:</strong> ${escapeHtml(str(doc.bank_name))}</div>` : ''}
      ${doc.status ? `<div><strong>Status:</strong> ${escapeHtml(str(doc.status).toUpperCase())}</div>` : ''}
    </div>
  </div>

  ${
    hasItems
      ? `<table>
          <thead>
            <tr>
              <th style="width:28px;">#</th>
              <th>Item</th>
              <th class="num" style="width:80px;">Qty</th>
              <th class="num" style="width:70px;">Rate</th>
              <th class="num" style="width:80px;">Taxable</th>
              <th class="num" style="width:50px;">GST</th>
              <th class="num" style="width:90px;">Tax</th>
              <th class="num" style="width:90px;">Amount</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>`
      : ''
  }

  ${totalsHtml}

  ${doc.notes ? `<div class="words"><strong>Notes:</strong> ${escapeHtml(str(doc.notes))}</div>` : ''}
  ${doc.terms ? `<div class="words"><strong>Terms:</strong> ${escapeHtml(str(doc.terms))}</div>` : ''}

  <div class="foot">
    ${bankHtml}
    <div class="sign">
      <div>For ${escapeHtml(str(company.name))}</div>
      <div>Authorised Signatory</div>
    </div>
  </div>

  <script>
    // setTimeout(0) lets the stylesheet above apply before print() fires;
    // firing on 'load' alone printed a blank page in some browsers.
    window.addEventListener('load', function () { setTimeout(function () { window.print(); }, 50); });
  </script>
</body>
</html>`;

    const printWindow = window.open('', '_blank');
    if (!printWindow) throw new Error('Pop-up blocked. Please allow pop-ups to print.');

    printWindow.document.write(printContent);
    printWindow.document.close();
  } catch (error) {
    throw new Error(
      `Failed to print document: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export const documentService = {
  exportToExcel,
  exportToCSV,
  importFromExcel,
  importFromCSV,
  printDocument,
  printQuotation: (id: string) => printDocument('quotation', id),
  printInvoice: (id: string) => printDocument('invoice', id),
  printProformaInvoice: (id: string) => printDocument('proforma', id),
  printPurchaseOrder: (id: string) => printDocument('purchase_order', id),
  printPurchase: (id: string) => printDocument('purchase', id),
  printPayment: (id: string) => printDocument('payment', id),
};