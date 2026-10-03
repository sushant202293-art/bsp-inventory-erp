import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/utils';
import { maskAccountNumber, PAYMENT_METHOD_MODE } from '../billing-config.service';
import type { ConfiguredBankAccount, DocumentPaymentAllocation, PaymentMethodConfig } from '@/types/database.types';
import { Plus, Trash2 } from 'lucide-react';

interface Props {
  methods: PaymentMethodConfig[];
  bankAccounts: ConfiguredBankAccount[];
  allocations: DocumentPaymentAllocation[];
  grandTotal: number;
  amountPaid: number;
  isEstimate: boolean;
  disabled?: boolean;
  onChange: (rows: DocumentPaymentAllocation[]) => void;
}

/**
 * Split-payment editor: UPI + bank + cash in one document. Allocations on a
 * proforma/quotation are an intention printed on the document; on a posted
 * sales/purchase invoice they are written to payments_received / payments_made
 * exactly once, when the document is approved.
 */
export function PaymentAllocationEditor({
  methods,
  bankAccounts,
  allocations,
  grandTotal,
  amountPaid,
  isEstimate,
  disabled = false,
  onChange,
}: Props) {
  const enabled = methods.filter((m) => m.enabled !== false);
  const activeBanks = bankAccounts.filter((b) => b.is_active !== false);

  const allocated = allocations.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
  const outstanding = Math.max(0, Math.round((grandTotal - allocated) * 100) / 100);
  const overAllocated = allocated - grandTotal > 0.009;
  const paidView = isEstimate ? allocated : Math.max(allocated, amountPaid);
  const status =
    paidView + 0.009 >= grandTotal && grandTotal > 0
      ? 'Paid'
      : paidView > 0
        ? 'Partially Paid'
        : 'Unpaid';

  function patch(index: number, partial: Partial<DocumentPaymentAllocation>) {
    const next = allocations.map((row, i) => (i === index ? { ...row, ...partial } : row));
    onChange(next);
  }

  function addRow() {
    const first = enabled[0];
    if (!first) return;
    onChange([
      ...allocations,
      {
        method_key: first.key,
        method_label: first.label,
        bank_account_id: null,
        bank_label: null,
        reference: '',
        amount: Math.max(outstanding, 0),
      },
    ]);
  }

  function removeRow(index: number) {
    onChange(allocations.filter((_, i) => i !== index));
  }

  function methodMeta(key: string): PaymentMethodConfig | undefined {
    return enabled.find((m) => m.key === key);
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span
          className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${
            status === 'Paid'
              ? 'bg-green-500/15 text-green-600 dark:text-green-400'
              : status === 'Partially Paid'
                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                : 'bg-muted text-muted-foreground'
          }`}
        >
          {status}
        </span>
      </div>

      {allocations.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No payment row yet. {isEstimate ? 'Rows you add are printed as payment instructions.' : 'Add rows to record how this invoice is being settled.'}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-[13px]">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="py-1.5 pr-2">Method</th>
                <th className="py-1.5 pr-2">Bank account</th>
                <th className="py-1.5 pr-2">Reference no.</th>
                <th className="py-1.5 pr-2 text-right">Amount</th>
                <th className="w-10 py-2" />
              </tr>
            </thead>
            <tbody>
              {allocations.map((row, index) => {
                const meta = methodMeta(row.method_key);
                const needsBank = Boolean(meta?.requires_bank);
                return (
                  <tr key={`${row.method_key}-${index}`} className="border-b">
                    <td className="py-1.5 pr-2">
                      <select
                        value={row.method_key}
                        disabled={disabled}
                        onChange={(e) => {
                          const next = enabled.find((m) => m.key === e.target.value);
                          patch(index, {
                            method_key: e.target.value,
                            method_label: next?.label || e.target.value,
                            bank_account_id: next?.requires_bank ? row.bank_account_id : null,
                            bank_label: next?.requires_bank ? row.bank_label : null,
                          });
                        }}
                        className="h-7 w-36 rounded border border-input bg-transparent px-2"
                      >
                        {enabled.map((m) => (
                          <option key={m.key} value={m.key}>
                            {m.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1.5 pr-2">
                      {needsBank ? (
                        <select
                          value={row.bank_account_id || ''}
                          disabled={disabled}
                          onChange={(e) => {
                            const account = activeBanks.find((a) => a.id === e.target.value);
                            patch(index, {
                              bank_account_id: account?.id || null,
                              bank_label: account
                                ? `${account.display_name || account.bank_name}`
                                : null,
                            });
                          }}
                          className="h-7 w-48 rounded border border-input bg-transparent px-2"
                        >
                          <option value="">Select bank...</option>
                          {activeBanks.map((account) => (
                            <option key={account.id} value={account.id}>
                              {account.display_name || account.bank_name}
                              {account.account_number
                                ? ` (${maskAccountNumber(account.account_number)})`
                                : ''}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-1.5 pr-2">
                      <Input
                        value={row.reference || ''}
                        disabled={disabled}
                        onChange={(e) => patch(index, { reference: e.target.value })}
                        placeholder={
                          row.method_key === 'upi'
                            ? 'UPI txn id'
                            : row.method_key === 'cheque'
                              ? 'Cheque no.'
                              : 'Reference'
                        }
                        className="h-7 w-40"
                      />
                    </td>
                    <td className="py-1.5 pr-2">
                      <Input
                        value={String(row.amount ?? '')}
                        disabled={disabled}
                        inputMode="decimal"
                        onChange={(e) =>
                          patch(index, {
                            amount: Number(e.target.value.replace(/[^0-9.]/g, '')) || 0,
                          })
                        }
                        className="h-7 w-32 text-right"
                      />
                    </td>
                    <td className="py-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={disabled}
                        title="Remove payment row"
                        onClick={() => removeRow(index)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addRow}
          disabled={disabled || enabled.length === 0}
        >
          <Plus className="mr-1 h-3 w-3" /> Add Payment
        </Button>

        <div className="space-y-1 text-sm">
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">Total allocated</span>
            <span className="tabular-nums">{formatCurrency(allocated)}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">Outstanding</span>
            <span className="tabular-nums">{formatCurrency(outstanding)}</span>
          </div>
          {overAllocated ? (
            <p className="text-xs text-red-500">
              Allocated amount exceeds the grand total. Reduce a row before saving.
            </p>
          ) : null}
        </div>
      </div>

      {isEstimate ? (
        <p className="text-xs text-muted-foreground">
          Payment methods here are printed as instructions. {`A ${'proforma/quote'} is not a receipt - no money is posted until a real payment is recorded.`}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Approved allocations are recorded against this invoice once
          ({Object.values(PAYMENT_METHOD_MODE).join(', ')}).
        </p>
      )}
    </div>
  );
}
