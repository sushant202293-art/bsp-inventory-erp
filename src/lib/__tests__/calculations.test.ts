import { describe, it, expect } from 'vitest';
import {
  calculateGSTBreakdown,
  calculateLineItemTotal,
  calculateInvoiceTotals,
  calculatePaymentAllocation,
  calculateRunningBalance,
  calculateStockValue,
  calculateTotalStockValue,
  calculateReorderPoint,
  calculateProfitMargin,
  calculateReceivableAging,
  calculateTopProducts,
  calculateGSTOnMRP,
  calculateGSTInclusiveExclusive,
  calculateCurrentStock,
} from '@/lib/calculations';

// `calculateGSTBreakdown` is the only helper in this file that the running
// app actually calls (src/services/transaction.service.ts:12). The rest are
// covered here so the reference semantics stay pinned down.

describe('calculateGSTBreakdown', () => {
  it('splits intra-state tax evenly into CGST + SGST', () => {
    const r = calculateGSTBreakdown(1200, 18, false);
    expect(r.cgst).toBe(108);
    expect(r.sgst).toBe(108);
    expect(r.igst).toBe(0);
    expect(r.totalTax).toBe(216);
    expect(r.totalAmount).toBe(1416);
  });

  it('charges inter-state sales as a single IGST line', () => {
    const r = calculateGSTBreakdown(1200, 18, true);
    expect(r.cgst).toBe(0);
    expect(r.sgst).toBe(0);
    expect(r.igst).toBe(216);
    expect(r.totalTax).toBe(216);
    expect(r.totalAmount).toBe(1416);
  });

  it('produces the same total tax for intra- and inter-state', () => {
    const intra = calculateGSTBreakdown(9500, 18, false);
    const inter = calculateGSTBreakdown(9500, 18, true);
    expect(intra.totalTax).toBe(inter.totalTax);
    expect(intra.totalAmount).toBe(inter.totalAmount);
    expect(intra.cgst + intra.sgst).toBe(inter.igst);
  });

  it('never lets CGST + SGST drift from the total tax', () => {
    // 1234.56 * 18% = 222.2208 -> 222.22, and each half rounds to 111.11.
    const r = calculateGSTBreakdown(1234.56, 18, false);
    expect(r.cgst).toBe(111.11);
    expect(r.sgst).toBe(111.11);
    expect(r.cgst + r.sgst).toBe(r.totalTax);
  });

  it('handles a 12% slab', () => {
    const r = calculateGSTBreakdown(680, 12, false);
    expect(r.cgst).toBe(40.8);
    expect(r.sgst).toBe(40.8);
    expect(r.totalAmount).toBe(761.6);
  });

  it('handles a zero-rated line', () => {
    const r = calculateGSTBreakdown(500, 0, false);
    expect(r.totalTax).toBe(0);
    expect(r.totalAmount).toBe(500);
  });

  it('handles a zero-value line without producing NaN', () => {
    const r = calculateGSTBreakdown(0, 18, true);
    expect(r.totalTax).toBe(0);
    expect(r.totalAmount).toBe(0);
  });
});

describe('calculateLineItemTotal', () => {
  it('applies a percentage discount before tax', () => {
    const r = calculateLineItemTotal(10, 100, 10, 0, 18, false);
    expect(r.lineTotal).toBe(1000);
    expect(r.discount).toBe(100);
    expect(r.taxableAmount).toBe(900);
    expect(r.totalAmount).toBe(1062);
  });

  it('prefers a flat discount amount when no percentage is given', () => {
    const r = calculateLineItemTotal(2, 500, 0, 50, 18, true);
    expect(r.discount).toBe(50);
    expect(r.taxableAmount).toBe(950);
    expect(r.igst).toBe(171);
  });
});

describe('calculateInvoiceTotals', () => {
  const items = [
    { quantity: 10, unit_price: 120, discount_percentage: 0, discount_amount: 0, gst_rate: 18 },
    { quantity: 1, unit_price: 800, discount_percentage: 0, discount_amount: 0, gst_rate: 18 },
  ];

  it('sums subtotal and tax across lines', () => {
    const r = calculateInvoiceTotals(items, false);
    expect(r.subtotal).toBe(2000);
    expect(r.taxableAmount).toBe(2000);
    expect(r.totalTax).toBe(360);
    expect(r.totalAmount).toBe(2360);
  });

  it('applies an additional percentage discount to the taxable base', () => {
    const r = calculateInvoiceTotals(items, false, 10, 'percentage');
    expect(r.taxableAmount).toBe(1800);
    expect(r.totalDiscount).toBe(200);
    expect(r.totalAmount).toBe(2124);
  });

  it('applies an additional flat discount', () => {
    const r = calculateInvoiceTotals(items, false, 200, 'amount');
    expect(r.taxableAmount).toBe(1800);
    expect(r.totalAmount).toBe(2124);
  });

  it('returns zeroes for an empty item list', () => {
    const r = calculateInvoiceTotals([], false);
    expect(r.subtotal).toBe(0);
    expect(r.totalAmount).toBe(0);
  });
});

describe('calculatePaymentAllocation', () => {
  it('computes the outstanding balance', () => {
    const r = calculatePaymentAllocation(
      [
        { amount: 3000, date: '2025-04-14' },
      ],
      5900
    );
    expect(r.totalPaid).toBe(3000);
    expect(r.balance).toBe(2900);
    expect(r.isFullyPaid).toBe(false);
  });

  it('flags a fully settled invoice', () => {
    const r = calculatePaymentAllocation([{ amount: 2360, date: '2025-04-09' }], 2360);
    expect(r.balance).toBe(0);
    expect(r.isFullyPaid).toBe(true);
    expect(r.percentagePaid).toBe(100);
  });

  it('clamps overpayment so balance never goes negative', () => {
    const r = calculatePaymentAllocation([{ amount: 5000, date: '2025-04-09' }], 2360);
    expect(r.balance).toBe(0);
    expect(r.percentagePaid).toBe(100);
  });

  it('finds the most recent payment date', () => {
    const r = calculatePaymentAllocation(
      [
        { amount: 100, date: '2025-01-01' },
        { amount: 100, date: '2025-06-30' },
        { amount: 100, date: '2025-03-15' },
      ],
      1000
    );
    expect(r.lastPaymentDate).toBe('2025-06-30');
  });

  it('does not reorder the caller-supplied array', () => {
    const payments = [
      { amount: 100, date: '2025-01-01' },
      { amount: 100, date: '2025-06-30' },
    ];
    const snapshot = [...payments];
    calculatePaymentAllocation(payments, 1000);
    expect(payments).toEqual(snapshot);
  });
});

describe('calculateRunningBalance', () => {
  it('orders by date before accumulating', () => {
    const r = calculateRunningBalance([
      { type: 'credit', amount: 2360, date: '2025-04-09' },
      { type: 'debit', amount: 2360, date: '2025-04-08' },
    ]);
    expect(r.totalDebit).toBe(2360);
    expect(r.totalCredit).toBe(2360);
    expect(r.finalBalance).toBe(0);
  });

  it('leaves a debit outstanding', () => {
    const r = calculateRunningBalance([
      { type: 'debit', amount: 5900, date: '2025-04-12' },
      { type: 'credit', amount: 3000, date: '2025-04-14' },
    ]);
    expect(r.finalBalance).toBe(2900);
  });
});

describe('stock helpers', () => {
  it('values stock at cost', () => {
    expect(calculateStockValue(10, 65.5)).toBe(655);
  });

  it('sums total stock value', () => {
    expect(
      calculateTotalStockValue([
        { current_stock: 10, purchase_price: 100 },
        { current_stock: 5, purchase_price: 20 },
      ])
    ).toBe(1100);
  });

  it('rounds the reorder point up to a whole unit', () => {
    expect(calculateReorderPoint(3.2, 10, 5)).toBe(37);
    expect(calculateReorderPoint(3.25, 10, 5)).toBe(38);
    expect(calculateReorderPoint(0, 10, 12)).toBe(12);
  });

  it('applies movements in order', () => {
    expect(
      calculateCurrentStock(100, [
        { type: 'sale', quantity: 30 },
        { type: 'purchase', quantity: 50 },
      ])
    ).toBe(120);
  });
});

describe('misc business helpers', () => {
  it('computes margin and markup differently', () => {
    const r = calculateProfitMargin(150, 100);
    expect(r.profit).toBe(50);
    expect(r.marginPercentage).toBe(33.33);
    expect(r.markupPercentage).toBe(50);
  });

  it('buckets receivables by age and skips paid invoices', () => {
    const today = new Date();
    const daysAgo = (n: number) =>
      new Date(today.getTime() - n * 86400000).toISOString().slice(0, 10);
    const daysAhead = (n: number) =>
      new Date(today.getTime() + n * 86400000).toISOString().slice(0, 10);

    const r = calculateReceivableAging([
      // not yet due -> current
      { invoice_date: daysAgo(2), due_date: daysAhead(10), total_amount: 700, amount_paid: 0, status: 'partial' },
      // 5 days past due -> 1-30 bucket
      { invoice_date: daysAgo(20), due_date: daysAgo(5), total_amount: 1000, amount_paid: 0, status: 'partial' },
      // 100 days past due -> over 90
      { invoice_date: daysAgo(200), due_date: daysAgo(100), total_amount: 500, amount_paid: 0, status: 'partial' },
      // fully settled -> ignored
      { invoice_date: daysAgo(10), due_date: daysAgo(10), total_amount: 999, amount_paid: 999, status: 'paid' },
    ]);

    expect(r.current).toBe(700);
    expect(r.days1to30).toBe(1000);
    expect(r.over90).toBe(500);
    expect(r.total).toBe(2200);
  });

  it('ranks top products by revenue, share being of total revenue', () => {
    const r = calculateTopProducts(
      [
        { product_id: 'a', product_name: 'Cable', quantity: 10, total_amount: 1000 },
        { product_id: 'b', product_name: 'Charger', quantity: 2, total_amount: 3000 },
      ],
      1
    );
    expect(r).toHaveLength(1);
    expect(r[0].product_id).toBe('b');
    expect(r[0].totalRevenue).toBe(3000);
    // 3000 of 4000 total, even though only the top 1 is returned
    expect(r[0].percentage).toBe(75);
  });

  it('extracts base price from an MRP-inclusive amount', () => {
    const r = calculateGSTOnMRP(118, 18);
    expect(r.netPrice).toBe(118);
    expect(r.basePrice + r.gstAmount).toBeCloseTo(118, 2);
  });

  it('handles GST-inclusive and GST-exclusive input', () => {
    const incl = calculateGSTInclusiveExclusive(118, 18, true);
    expect(incl.taxableAmount).toBe(100);
    expect(incl.totalAmount).toBe(118);

    const excl = calculateGSTInclusiveExclusive(100, 18, false);
    expect(excl.taxableAmount).toBe(100);
    expect(excl.totalAmount).toBe(118);
  });
});
