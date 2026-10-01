import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ProductAutocomplete } from './ProductAutocomplete';
import { computeItemRow, parseAmount, toNumber } from '../calculations';
import type { BillingItemRow } from '../billing.types';
import { Copy, Plus, Trash2 } from 'lucide-react';

const GST_RATES = [0, 5, 12, 18, 28];

interface Props {
  items: BillingItemRow[];
  priceField: 'selling_price' | 'purchase_price';
  interState: boolean;
  onChange: (items: BillingItemRow[]) => void;
  onProductSelect: (rowKey: string) => void;
  readOnly?: boolean;
}

/**
 * The line-item grid. Column widths live on the header cells and the body
 * cells inherit them, so headers and values stay aligned; the whole grid
 * scrolls horizontally on small screens instead of reflowing.
 */
export function InvoiceItemsTable({
  items,
  priceField,
  interState,
  onChange,
  onProductSelect,
  readOnly = false,
}: Props) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  function display(row: BillingItemRow, field: 'quantity' | 'rate' | 'discount_percent', numeric: number): string {
    const draft = drafts[`${row.key}:${field}`];
    if (draft === undefined) return String(numeric);
    return parseAmount(draft) === numeric ? draft : String(numeric);
  }

  function setDraft(rowKey: string, field: string, text: string) {
    setDrafts((prev) => ({ ...prev, [`${rowKey}:${field}`]: text }));
  }

  function patch(index: number, partial: Partial<BillingItemRow>) {
    const next = [...items];
    const merged = { ...next[index], ...partial };
    next[index] = computeItemRow(merged, interState);
    onChange(next);
  }

  function recalcAll(rows: BillingItemRow[]): BillingItemRow[] {
    return rows.map((row) => computeItemRow(row, interState));
  }

  function addItem() {
    onChange(recalcAll([...items, blankRow(String(Date.now()))]));
  }

  function duplicateItem(index: number) {
    const copy = { ...items[index], key: `${items[index].key}-copy-${Date.now()}` };
    onChange(recalcAll([...items.slice(0, index + 1), copy, ...items.slice(index + 1)]));
  }

  function removeItem(index: number) {
    if (items.length === 1) {
      onChange(recalcAll([blankRow(items[0].key)]));
      return;
    }
    onChange(items.filter((_, i) => i !== index));
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[64rem] border-collapse text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="w-8 px-2 py-2">#</th>
              <th className="px-2 py-2">Product</th>
              <th className="w-28 px-2 py-2">Code</th>
              <th className="w-20 px-2 py-2 text-right">Qty</th>
              <th className="w-20 px-2 py-2">Unit</th>
              <th className="w-28 px-2 py-2 text-right">Rate</th>
              <th className="w-20 px-2 py-2 text-right">Disc %</th>
              <th className="w-28 px-2 py-2 text-right">Taxable</th>
              <th className="w-24 px-2 py-2 text-right">GST</th>
              <th className="w-32 px-2 py-2 text-right">Total</th>
              <th className="w-24 px-2 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => {
              const invalidQty = toNumber(item.quantity) <= 0;
              return (
                <tr key={item.key} className="border-b align-top">
                  <td className="px-2 py-2 text-muted-foreground">{index + 1}</td>
                  <td className="px-2 py-2">
                    <ProductAutocomplete
                      value={item.product_name}
                      priceField={priceField}
                      className="min-w-[14rem]"
                      onChange={(text) => patch(index, { product_name: text, product_id: null })}
                      onSelect={(product) => {
                        const price = Number(product[priceField] || 0);
                        patch(index, {
                          product_id: product.id,
                          product_name: product.name,
                          product_code: product.code || '',
                          brand_name: product.brand?.name || '',
                          hsn_sac: product.hsn_sac || '',
                          unit: product.unit?.name || item.unit || 'Pcs',
                          rate: price,
                          gst_rate: Number(product.gst_rate || 0),
                        });
                        setDrafts((prev) => {
                          const next = { ...prev };
                          delete next[`${item.key}:rate`];
                          return next;
                        });
                        onProductSelect(item.key);
                      }}
                    />
                    {!item.product_id && item.product_name.trim().length > 0 ? (
                      <p className="mt-1 text-xs text-amber-500">
                        Select this product from the dropdown to bill it.
                      </p>
                    ) : null}
                  </td>
                  <td className="px-2 py-2 text-muted-foreground">{item.product_code || '—'}</td>
                  <td className="px-2 py-2">
                    <Input
                      value={display(item, 'quantity', item.quantity)}
                      onChange={(e) => {
                        setDraft(item.key, 'quantity', e.target.value);
                        patch(index, { quantity: parseAmount(e.target.value) });
                      }}
                      inputMode="decimal"
                      className={`h-8 text-right ${invalidQty ? 'border-red-500' : ''}`}
                      disabled={readOnly}
                    />
                    {invalidQty ? (
                      <p className="mt-1 text-xs text-red-500">Qty must be &gt; 0</p>
                    ) : null}
                  </td>
                  <td className="px-2 py-2 text-muted-foreground">{item.unit || '—'}</td>
                  <td className="px-2 py-2">
                    <Input
                      value={display(item, 'rate', item.rate)}
                      onChange={(e) => {
                        setDraft(item.key, 'rate', e.target.value);
                        patch(index, { rate: parseAmount(e.target.value) });
                      }}
                      inputMode="decimal"
                      className="h-8 text-right"
                      disabled={readOnly}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <Input
                      value={display(item, 'discount_percent', item.discount_percent)}
                      onChange={(e) => {
                        setDraft(item.key, 'discount_percent', e.target.value);
                        patch(index, { discount_percent: parseAmount(e.target.value) });
                      }}
                      inputMode="decimal"
                      className="h-8 text-right"
                      disabled={readOnly}
                    />
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums">
                    {item.taxable_value.toFixed(2)}
                  </td>
                  <td className="px-2 py-2 text-right">
                    <select
                      value={String(item.gst_rate)}
                      onChange={(e) => patch(index, { gst_rate: Number(e.target.value) })}
                      disabled={readOnly}
                      className="h-8 w-full rounded border border-input bg-transparent px-1 text-right text-sm"
                    >
                      {GST_RATES.includes(Number(item.gst_rate)) ? null : (
                        <option value={String(item.gst_rate)}>{item.gst_rate}%</option>
                      )}
                      {GST_RATES.map((rate) => (
                        <option key={rate} value={String(rate)}>
                          {rate}%
                        </option>
                      ))}
                    </select>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {interState ? `IGST ${item.igst_amount.toFixed(2)}` : `C ${item.cgst_amount.toFixed(2)} / S ${item.sgst_amount.toFixed(2)}`}
                    </p>
                  </td>
                  <td className="px-2 py-2 text-right font-semibold tabular-nums">
                    {item.total_amount.toFixed(2)}
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        title="Duplicate row"
                        disabled={readOnly}
                        onClick={() => duplicateItem(index)}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        title="Remove row"
                        disabled={readOnly}
                        onClick={() => removeItem(index)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Button variant="outline" size="sm" className="mt-3" onClick={addItem} disabled={readOnly}>
        <Plus className="mr-1 h-3 w-3" /> Add Item
      </Button>
    </div>
  );
}

export function blankRow(key: string): BillingItemRow {
  return {
    key,
    product_id: null,
    product_name: '',
    product_code: '',
    brand_name: '',
    hsn_sac: '',
    description: '',
    quantity: 1,
    unit: 'Pcs',
    rate: 0,
    discount_percent: 0,
    gross_amount: 0,
    discount_amount: 0,
    taxable_value: 0,
    gst_rate: 18,
    cgst_amount: 0,
    sgst_amount: 0,
    igst_amount: 0,
    total_amount: 0,
  };
}
