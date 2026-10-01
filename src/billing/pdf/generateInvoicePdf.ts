import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { BillingPrintModel } from '../billing.types';

/**
 * Downloadable PDF built with jsPDF (selectable text, not a screenshot of the
 * DOM). The layout mirrors `InvoicePrintTemplate`; the browser print dialog
 * still gives the highest fidelity because it prints that template directly.
 */
export function generateInvoicePdf(model: BillingPrintModel): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  const money = (n: number) => `Rs. ${n.toFixed(2)}`;

  let y = margin;

  /* ---------------- Header ---------------- */
  if (model.company.logo_url) {
    try {
      const format = model.company.logo_url.toLowerCase().endsWith('.png') ? 'PNG' : 'JPEG';
      doc.addImage(model.company.logo_url, format, margin, y, 16, 16, undefined, 'FAST');
    } catch {
      // Logo is optional; a cross-origin or corrupt image must not break the PDF.
    }
  }

  const textX = model.company.logo_url ? margin + 20 : margin;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(model.company.name || 'Company', textX, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  let lineY = y + 10;
  const companyLines = [
    model.company.address,
    [model.company.city, model.company.state, model.company.pin].filter(Boolean).join(', '),
    model.company.phone ? `Phone: ${model.company.phone}` : null,
    model.company.email ? `Email: ${model.company.email}` : null,
    [model.company.gstin ? `GSTIN: ${model.company.gstin}` : null, model.company.pan ? `PAN: ${model.company.pan}` : null]
      .filter(Boolean)
      .join('  '),
  ].filter(Boolean) as string[];

  for (const line of companyLines) {
    doc.text(line, textX, lineY);
    lineY += 4.2;
  }

  // Right-hand title + meta
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(model.title.toUpperCase(), pageWidth - margin, y + 5, { align: 'right' });

  doc.setFontSize(9);
  const meta: Array<[string, string]> = [
    ['Document No.', model.documentNumber],
    ['Date', formatDateShort(model.documentDate)],
  ];
  if (model.validityDate) meta.push(['Validity', formatDateShort(model.validityDate)]);
  if (model.expectedDelivery) meta.push(['Delivery by', formatDateShort(model.expectedDelivery)]);
  if (model.referenceNumber) meta.push(['Reference', model.referenceNumber]);
  meta.push(['Status', model.status.toUpperCase()]);
  let metaY = y + 11;
  for (const [label, value] of meta) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(90);
    doc.text(`${label}:`, pageWidth - margin - 42, metaY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(20);
    doc.text(value, pageWidth - margin, metaY, { align: 'right' });
    metaY += 4.6;
  }
  doc.setTextColor(20);

  y = Math.max(lineY, metaY) + 3;
  doc.setDrawColor(30);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 4;

  /* ---------------- Parties ---------------- */
  const halfWidth = (pageWidth - margin * 2 - 4) / 2;
  const partyHeight = 34;

  drawBox(doc, margin, y, halfWidth, partyHeight);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(`BILL TO / ${model.billTo.label.toUpperCase()}`, margin + 3, y + 5);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(doc.splitTextToSize(model.billTo.name || '-', halfWidth - 6)[0], margin + 3, y + 10);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(
    doc.splitTextToSize(
      [
        addressLine(model.billTo.address),
        model.billTo.phone ? `Phone: ${model.billTo.phone}` : '',
        model.billTo.gstin ? `GSTIN: ${model.billTo.gstin}` : '',
        `State: ${model.billTo.state || '-'}`,
      ]
        .filter(Boolean)
        .join('\n'),
      halfWidth - 6
    ),
    margin + 3,
    y + 14
  );

  const shipX = margin + halfWidth + 4;
  drawBox(doc, shipX, y, halfWidth, partyHeight);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  if (model.shipTo) {
    doc.text('SHIP TO / DELIVERY ADDRESS', shipX + 3, y + 5);
    doc.setFontSize(10);
    doc.text(doc.splitTextToSize(model.shipTo.name || '-', halfWidth - 6)[0], shipX + 3, y + 10);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(
      doc.splitTextToSize(
        [addressLine(model.shipTo.address), model.shipTo.phone ? `Phone: ${model.shipTo.phone}` : '']
          .filter(Boolean)
          .join('\n'),
        halfWidth - 6
      ),
      shipX + 3,
      y + 14
    );
  } else {
    doc.text('PLACE OF SUPPLY', shipX + 3, y + 5);
    doc.setFontSize(10);
    doc.text(model.billTo.state || '-', shipX + 3, y + 11);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(
      model.interState ? 'Inter-state supply - IGST applies' : 'Intra-state supply - CGST + SGST apply',
      shipX + 3,
      y + 16
    );
  }
  y += partyHeight + 5;

  /* ---------------- Items ---------------- */
  const body = model.items.map((item, index) => [
    String(index + 1),
    item.product_name + (item.brand_name ? ` (${item.brand_name})` : ''),
    item.hsn_sac || '-',
    String(item.quantity),
    item.unit || '-',
    item.rate.toFixed(2),
    `${item.discount_percent || 0}%`,
    item.taxable_value.toFixed(2),
    model.interState
      ? `${item.gst_rate}% = ${item.igst_amount.toFixed(2)}`
      : `${item.gst_rate}% = ${(item.cgst_amount + item.sgst_amount).toFixed(2)}`,
    item.total_amount.toFixed(2),
  ]);

  autoTable(doc, {
    startY: y,
    head: [['#', 'Description', 'HSN/SAC', 'Qty', 'Unit', 'Rate', 'Disc', 'Taxable', 'GST', 'Amount']],
    body,
    margin: { left: margin, right: margin },
    styles: { fontSize: 8, cellPadding: 1.6, textColor: [20, 20, 20] },
    headStyles: { fillColor: [243, 244, 246], textColor: [20, 20, 20], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 8 },
      3: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right' },
      7: { halign: 'right' },
      8: { halign: 'right' },
      9: { halign: 'right', fontStyle: 'bold' },
    },
    didDrawPage: () => {
      // Footer on every page that the table spans.
    },
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;

  /* ---------------- Totals ---------------- */
  const totals: Array<[string, string]> = [
    ['Gross subtotal', money(model.totals.gross)],
  ];
  if (model.totals.discount > 0) totals.push(['Discount', `- ${money(model.totals.discount)}`]);
  totals.push(['Taxable amount', money(model.totals.taxable)]);
  if (model.interState) {
    totals.push(['IGST', money(model.totals.igst)]);
  } else {
    totals.push(['CGST', money(model.totals.cgst)]);
    totals.push(['SGST', money(model.totals.sgst)]);
  }
  totals.push(['Round off', `${model.totals.round_off >= 0 ? '+' : ''}${money(model.totals.round_off)}`]);
  totals.push(['GRAND TOTAL', money(model.totals.grand_total)]);

  const tableWidth = 82;
  const tableX = pageWidth - margin - tableWidth;
  doc.setFontSize(9);
  for (const [label, value] of totals) {
    const bold = label === 'GRAND TOTAL';
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    if (bold) doc.setDrawColor(30);
    doc.text(label, tableX, y);
    doc.text(value, pageWidth - margin, y, { align: 'right' });
    if (bold) doc.line(tableX, y + 1.5, pageWidth - margin, y + 1.5);
    y += bold ? 6 : 4.6;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('Amount in words:', margin, y);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  const words = doc.splitTextToSize(model.totals.amount_in_words, pageWidth - margin * 2 - 30);
  doc.text(words, margin, y + 4.5);
  y += 4.5 + words.length * 4 + 3;

  /* ---------------- Payments + bank ---------------- */
  const nextSection = (from: number): number => {
    if (from > pageHeight - 60) {
      doc.addPage();
      return margin;
    }
    return from;
  };
  y = nextSection(y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('PAYMENT DETAILS', margin, y);
  doc.text('BANK DETAILS', pageWidth / 2 + 2, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  if (model.payments.length === 0) {
    doc.text(model.amountPaid > 0 ? `Amount received: ${money(model.amountPaid)}` : 'Payable as per agreed credit terms.', margin, y);
  } else {
    for (const row of model.payments) {
      doc.text(
        `${row.method_label}  ${row.bank_label ? `- ${row.bank_label}` : ''}  ${row.reference ? `(${row.reference})` : ''}`.trim(),
        margin,
        y
      );
      doc.text(money(row.amount), pageWidth / 2 - 4, y, { align: 'right' });
      y += 4.4;
    }
  }

  let bankY = y;
  const accounts = model.bankAccounts.filter((b) => b.is_active);
  if (accounts.length === 0) {
    doc.text('No bank account configured.', pageWidth / 2 + 2, bankY);
  } else {
    for (const account of accounts) {
      doc.setFont('helvetica', 'bold');
      doc.text(`${account.bank_name}${account.is_default ? ' (Default)' : ''}`, pageWidth / 2 + 2, bankY);
      doc.setFont('helvetica', 'normal');
      bankY += 4.2;
      doc.text(`A/c: ${account.account_holder || model.company.name}  ${mask(account.account_number)}`, pageWidth / 2 + 2, bankY);
      bankY += 4.2;
      if (account.ifsc) {
        doc.text(`IFSC: ${account.ifsc}${account.upi_id ? `  UPI: ${account.upi_id}` : ''}`, pageWidth / 2 + 2, bankY);
        bankY += 4.2;
      }
    }
  }
  y = Math.max(y, bankY) + 5;

  /* ---------------- Terms + signature ---------------- */
  y = nextSection(y);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('TERMS & CONDITIONS', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const terms = doc.splitTextToSize(model.terms || '-', (pageWidth - margin * 2) / 2 - 4);
  doc.text(terms, margin, y + 4.5);

  const notesX = pageWidth / 2 + 2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('NOTES', notesX, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const notes = doc.splitTextToSize(model.notes || '-', (pageWidth - margin * 2) / 2 - 4);
  doc.text(notes, notesX, y + 4.5);

  y += Math.max(terms.length, notes.length) * 4.2 + 14;

  if (y > pageHeight - 30) {
    doc.addPage();
    y = margin;
  }

  doc.setDrawColor(200);
  doc.line(margin, y, pageWidth - margin, y);
  doc.setFontSize(9);
  doc.setTextColor(90);
  doc.text("Receiver's Signature", margin, y + 5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20);
  doc.text(`For ${model.company.name || 'Company'}`, pageWidth - margin, y + 5, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(90);
  doc.text('Authorized Signatory', pageWidth - margin, y + 14, { align: 'right' });

  doc.save(fileName(model));
}

function drawBox(doc: jsPDF, x: number, yy: number, w: number, h: number): void {
  doc.setDrawColor(209, 213, 219);
  doc.setLineWidth(0.3);
  doc.rect(x, yy, w, h);
}

function addressLine(address: { line1: string; line2?: string | null; city: string; state: string; pin: string }): string {
  return [address.line1, address.line2, [address.city, address.state, address.pin].filter(Boolean).join(', ')]
    .filter(Boolean)
    .join(', ');
}

function formatDateShort(value: string): string {
  if (!value) return '';
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) return value;
  return `${day}-${month}-${year}`;
}

function mask(number: string): string {
  const digits = (number || '').replace(/\s/g, '');
  if (digits.length <= 4) return digits;
  return `${'*'.repeat(Math.max(digits.length - 4, 2))}${digits.slice(-4)}`;
}

function fileName(model: BillingPrintModel): string {
  const title = model.title.replace(/\s+/g, '-').toLowerCase();
  const number = (model.documentNumber || 'draft').replace(/[^\w.-]+/g, '-');
  return `${title}-${number}.pdf`;
}
