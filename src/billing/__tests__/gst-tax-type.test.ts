import { describe, it, expect } from 'vitest';
import { computeItemRow, computeTotals, interStateFor, needsPlaceOfSupply } from '../calculations';
import { interStateFor as interStateForOriginal } from '../calculations';

/**
 * GST type is decided from the two places of supply, never from a default.
 *
 * The original `interStateFor` was `!isSameState(company, party)`, and
 * `isSameState` answers false when either side is blank. That made every voucher
 * with an unfilled company or party state charge IGST by default - the bill
 * looked interstate even when both parties were in the same state. IGST now
 * requires both states to be known and different.
 */
describe('interStateFor - GST type selection', () => {
  it('treats an unknown party state as intra-state instead of defaulting to IGST', () => {
    expect(interStateFor('Maharashtra', '')).toBe(false);
    expect(interStateFor('Maharashtra', null)).toBe(false);
    expect(interStateFor('Maharashtra', undefined)).toBe(false);
    expect(interStateFor('Maharashtra', '   ')).toBe(false);
  });

  it('treats an unknown company state as intra-state', () => {
    expect(interStateFor('', 'Maharashtra')).toBe(false);
    expect(interStateFor(null, 'Gujarat')).toBe(false);
  });

  it('applies CGST + SGST when both states match, ignoring case and padding', () => {
    expect(interStateFor('Maharashtra', 'maharashtra')).toBe(false);
    expect(interStateFor(' Maharashtra ', 'Maharashtra')).toBe(false);
  });

  it('applies IGST only when two known states differ', () => {
    expect(interStateFor('Maharashtra', 'Gujarat')).toBe(true);
    expect(interStateFor('Delhi', 'Karnataka')).toBe(true);
  });

  it('reports a missing place of supply separately from the tax type', () => {
    expect(needsPlaceOfSupply('Maharashtra', '')).toBe(true);
    expect(needsPlaceOfSupply('', 'Maharashtra')).toBe(true);
    expect(needsPlaceOfSupply('Maharashtra', 'Gujarat')).toBe(false);
  });
});

describe('intra-state vs inter-state amounts', () => {
  const row = {
    key: 'r1',
    product_id: 'p1',
    product_name: 'Widget',
    product_code: 'W-1',
    brand_name: '',
    hsn_sac: '8471',
    description: '',
    quantity: 1,
    unit: 'Pcs',
    rate: 1000,
    discount_percent: 0,
    gst_rate: 18,
    gross_amount: 0,
    discount_amount: 0,
    taxable_value: 0,
    cgst_amount: 0,
    sgst_amount: 0,
    igst_amount: 0,
    total_amount: 0,
  };

  it('splits 18% intra-state into CGST 9% + SGST 9%', () => {
    const intra = computeItemRow(row, false);
    expect(intra.cgst_amount).toBe(90);
    expect(intra.sgst_amount).toBe(90);
    expect(intra.igst_amount).toBe(0);
    expect(intra.total_amount).toBe(1180);
  });

  it('charges the full 18% as IGST inter-state', () => {
    const inter = computeItemRow(row, true);
    expect(inter.cgst_amount).toBe(0);
    expect(inter.sgst_amount).toBe(0);
    expect(inter.igst_amount).toBe(180);
    expect(inter.total_amount).toBe(1180);
  });

  it('never mixes CGST/SGST and IGST for the same line', () => {
    expect(computeItemRow(row, false).igst_amount).toBe(0);
    expect(computeItemRow(row, true).cgst_amount + computeItemRow(row, true).sgst_amount).toBe(0);
  });

  it('honours each item\'s own GST rate in the document totals', () => {
    const five = { ...row, key: 'r2', gst_rate: 5, rate: 1000 };
    const twelve = { ...row, key: 'r3', gst_rate: 12, rate: 1000 };
    const totals = computeTotals([row, five, twelve], false);

    // 18% + 5% + 12% intra-state => 9+2.5+6 CGST, mirrored SGST.
    expect(totals.cgst).toBe(175);
    expect(totals.sgst).toBe(175);
    expect(totals.igst).toBe(0);
    expect(totals.grand_total).toBe(3350);
  });

  it('keeps the whole bill IGST when the states differ', () => {
    const five = { ...row, key: 'r2', gst_rate: 5, rate: 1000 };
    const totals = computeTotals([row, five], true);
    expect(totals.igst).toBe(230);
    expect(totals.cgst).toBe(0);
    expect(totals.sgst).toBe(0);
  });

  it('leaves a zero-rated item untaxed', () => {
    const exempt = { ...row, gst_rate: 0 };
    const intra = computeItemRow(exempt, false);
    expect(intra.cgst_amount).toBe(0);
    expect(intra.sgst_amount).toBe(0);
    expect(intra.total_amount).toBe(1000);
  });

  // The summary panel prints one branch or the other, so the totals object has
  // to make the unused branch zero - a stale non-zero value there would render
  // a tax line that does not belong on the bill.
  it('zeroes the unused tax branch so the summary never shows both', () => {
    const intra = computeTotals([row], false);
    expect(intra.igst).toBe(0);
    expect(intra.cgst).toBeGreaterThan(0);
    expect(intra.sgst).toBeGreaterThan(0);

    const inter = computeTotals([row], true);
    expect(inter.cgst).toBe(0);
    expect(inter.sgst).toBe(0);
    expect(inter.igst).toBeGreaterThan(0);
  });

  it('keeps the summary total equal to the tax on the taxable value', () => {
    const intra = computeTotals([row], false);
    expect(intra.tax).toBe(180);
    expect(intra.cgst + intra.sgst).toBeCloseTo(intra.tax, 2);
    // Grand total = taxable + tax (+ round off), nothing else.
    expect(intra.grand_total).toBeCloseTo(intra.taxable + intra.tax + intra.round_off, 2);
  });
});

// Referenced so the original export is not tree-shaken from the coverage report.
void interStateForOriginal;