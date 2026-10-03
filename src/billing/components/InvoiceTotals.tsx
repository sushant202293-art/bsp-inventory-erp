import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { formatCurrency } from '@/lib/utils';
import type { BillingTotals } from '../billing.types';

interface Props {
  totals: BillingTotals;
  interState: boolean;
  headerDiscount: number;
  onHeaderDiscountChange?: (value: number) => void;
}

/** Invoice totals block - every figure is derived, nothing is typed in. */
export function InvoiceTotals({
  totals,
  interState,
  headerDiscount,
  onHeaderDiscountChange,
}: Props) {
  return (
    <div className="w-full shrink-0 space-y-0.5 text-xs xl:w-[17.5rem]">
      <Row label="Total quantity" value={String(totals.quantity)} />
      <Row label="Gross subtotal" value={formatCurrency(totals.gross)} />
      <div className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground">Discount</span>
        <span className="flex items-center gap-1 tabular-nums">
          {onHeaderDiscountChange ? (
            <Input
              value={String(headerDiscount)}
              onChange={(e) => onHeaderDiscountChange(Number(e.target.value.replace(/[^0-9.]/g, '')) || 0)}
              inputMode="decimal"
              className="h-7 w-24 text-right"
              aria-label="Discount on the whole bill"
            />
          ) : null}
          <span className="w-24 text-right text-red-500">- {formatCurrency(totals.discount)}</span>
        </span>
      </div>
      <Row label="Taxable amount" value={formatCurrency(totals.taxable)} />
      {/* CGST + SGST for an intra-state supply, IGST for an inter-state one -
          never both. The split comes from the company state vs the Bill To
          state, decided by `interStateFor` in `src/billing/calculations.ts`. */}
      {interState ? (
        <Row label="IGST" value={formatCurrency(totals.igst)} />
      ) : (
        <>
          <Row label="CGST" value={formatCurrency(totals.cgst)} />
          <Row label="SGST" value={formatCurrency(totals.sgst)} />
        </>
      )}
      <Row label="Total GST" value={formatCurrency(totals.tax)} />
      <Row label="Round off" value={`${totals.round_off >= 0 ? '+' : ''}${formatCurrency(totals.round_off)}`} />
      <Separator className="my-1" />
      <div className="flex items-center justify-between text-sm font-bold">
        <span>Grand Total</span>
        <span className="tabular-nums">{formatCurrency(totals.grand_total)}</span>
      </div>
      <p className="pt-1 text-[11px] leading-snug italic text-muted-foreground">
        <span className="font-semibold not-italic text-foreground">In words:</span>{' '}
        {totals.amount_in_words}
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
