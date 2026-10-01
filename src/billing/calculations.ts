import { amountInWords, isSameState, roundTo2 } from '@/lib/utils';
import { calculateGSTBreakdown } from '@/lib/calculations';
import type { BillingItemRow, BillingTotals } from './billing.types';

/**
 * Line and document arithmetic.
 *
 * These formulas are deliberately a mirror of `computeLines()` in
 * `src/services/transaction.service.ts`: the service recomputes every line on
 * save, so the numbers shown on screen must be produced the same way or the
 * preview and the saved document will disagree by a paisa.
 */

/** Recomputes every derived column of one grid row. */
export function computeItemRow(
  row: BillingItemRow,
  interState: boolean
): BillingItemRow {
  const gross = roundTo2(toNumber(row.quantity) * toNumber(row.rate));
  const discount = roundTo2(
    toNumber(row.discount_percent) > 0
      ? (gross * toNumber(row.discount_percent)) / 100
      : 0
  );
  const taxable = roundTo2(gross - discount);
  const gst = calculateGSTBreakdown(taxable, toNumber(row.gst_rate), interState);

  return {
    ...row,
    gross_amount: gross,
    discount_amount: discount,
    taxable_value: taxable,
    cgst_amount: gst.cgst,
    sgst_amount: gst.sgst,
    igst_amount: gst.igst,
    total_amount: gst.totalAmount,
  };
}

export interface TotalsInput {
  headerDiscount?: number;
  roundOff?: number;
}

/**
 * Document totals. `roundOff` defaults to the automatic "round to the nearest
 * rupee" the sales form has always used; pass an explicit value when a draft
 * already carries one.
 */
export function computeTotals(
  items: BillingItemRow[],
  interState: boolean,
  input: TotalsInput = {}
): BillingTotals {
  let quantity = 0;
  let gross = 0;
  let discount = 0;
  let taxable = 0;
  let cgst = 0;
  let sgst = 0;
  let igst = 0;
  let tax = 0;

  for (const raw of items) {
    const row = computeItemRow(raw, interState);
    quantity += toNumber(row.quantity);
    gross = roundTo2(gross + row.gross_amount);
    discount = roundTo2(discount + row.discount_amount);
    taxable = roundTo2(taxable + row.taxable_value);
    cgst = roundTo2(cgst + row.cgst_amount);
    sgst = roundTo2(sgst + row.sgst_amount);
    igst = roundTo2(igst + row.igst_amount);
    tax = roundTo2(tax + row.cgst_amount + row.sgst_amount + row.igst_amount);
  }

  const headerDiscount = roundTo2(input.headerDiscount || 0);
  const taxableAfterHeader = roundTo2(Math.max(0, taxable - headerDiscount));
  const taxAfterHeader =
    taxable > 0 ? roundTo2(tax * (taxableAfterHeader / taxable)) : 0;

  const beforeRoundOff = roundTo2(taxableAfterHeader + taxAfterHeader);
  const autoRoundOff = roundTo2(Math.round(beforeRoundOff) - beforeRoundOff);
  const roundOff =
    input.roundOff === undefined || input.roundOff === null
      ? autoRoundOff
      : roundTo2(input.roundOff);

  const grandTotal = roundTo2(beforeRoundOff + roundOff);

  return {
    quantity: roundTo2(quantity),
    gross,
    discount: roundTo2(discount + headerDiscount),
    taxable: taxableAfterHeader,
    cgst: interState ? 0 : rescale(cgst, tax, taxAfterHeader),
    sgst: interState ? 0 : rescale(sgst, tax, taxAfterHeader),
    igst: interState ? rescale(igst, tax, taxAfterHeader) : 0,
    tax: taxAfterHeader,
    other_charges: 0,
    round_off: roundOff,
    grand_total: grandTotal,
    amount_in_words: amountInWords(grandTotal),
  };
}

/**
 * Line taxes are stored unrounded-per-header, but the header discount shrinks
 * the taxable base, so the displayed tax must shrink with it. Keeping the
 * original proportion is what the service writes back.
 */
function rescale(part: number, total: number, scaledTotal: number): number {
  if (total <= 0) return 0;
  return roundTo2(part * (scaledTotal / total));
}

export function toNumber(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Parses "1,234.50" / "1234.5" typed into a currency text input. */
export function parseAmount(value: string): number {
  const cleaned = value.replace(/[^0-9.-]/g, '');
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

export function interStateFor(
  companyState: string | null | undefined,
  partyState: string | null | undefined
): boolean {
  return !isSameState(companyState, partyState);
}
