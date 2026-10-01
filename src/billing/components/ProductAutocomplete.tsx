import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { productService } from '@/services/product.service';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatNumber } from '@/lib/utils';
import type { ProductWithRelations } from '@/types/product.types';

interface Props {
  value: string;
  priceField: 'selling_price' | 'purchase_price';
  onChange: (text: string) => void;
  onSelect: (product: ProductWithRelations) => void;
  placeholder?: string;
  className?: string;
}

/**
 * Inventory-backed product picker.
 *
 * Search is debounced and limited to a handful of rows, and the search covers
 * name, code, barcode and brand. The user must pick a real product - typing a
 * free-text line leaves `product_id` empty and the save validation rejects it.
 */
export function ProductAutocomplete({
  value,
  priceField,
  onChange,
  onSelect,
  placeholder = 'Search product by name, code, barcode or brand...',
  className,
}: Props) {
  const [results, setResults] = useState<ProductWithRelations[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [active, setActive] = useState(-1);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  function runSearch(query: string) {
    if (timer.current) clearTimeout(timer.current);
    if (query.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    setSearching(true);
    timer.current = setTimeout(async () => {
      try {
        const trimmed = query.trim();
        const [byText, brandIds] = await Promise.all([
          productService.getProducts({ search: trimmed, limit: 8, is_active: true }),
          findBrandIds(trimmed),
        ]);

        let rows = [...byText.products];

        if (brandIds.length > 0) {
          const { data } = await supabase
            .from('products')
            .select('id, name, code, gst_rate, hsn_sac, purchase_price, selling_price, barcode, brand_id')
            .in('brand_id', brandIds)
            .eq('is_active', true)
            .order('name')
            .limit(8);
          for (const raw of (data || []) as ProductWithRelations[]) {
            if (!rows.some((r) => r.id === raw.id)) rows.push(raw);
          }
        }

        rows = rows.slice(0, 8);
        setResults(rows);
        setOpen(true);
        setActive(rows.length > 0 ? 0 : -1);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  }

  async function findBrandIds(query: string): Promise<string[]> {
    if (query.length < 3) return [];
    const { data } = await supabase
      .from('brands')
      .select('id, name')
      .ilike('name', `%${query}%`)
      .limit(3);
    return (data || []).map((b) => b.id);
  }

  function choose(product: ProductWithRelations) {
    onSelect(product);
    setOpen(false);
    setActive(-1);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (i + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (active >= 0 && results[active]) choose(results[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div className={`relative ${className || ''}`}>
      <Input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          runSearch(e.target.value);
        }}
        onFocus={() => value.trim().length >= 2 && results.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full"
      />
      {open && (
        <div className="absolute left-0 top-full z-40 mt-1 min-w-[22rem] max-h-64 overflow-y-auto rounded-lg border bg-popover shadow-md">
          {searching ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">Searching inventory...</p>
          ) : results.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">
              No product matches &ldquo;{value}&rdquo;. Pick an existing product or add it under Products.
            </p>
          ) : (
            results.map((product, index) => {
              const price = Number(product[priceField] || 0);
              const stock = product.total_stock;
              return (
                <button
                  key={product.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(product)}
                  onMouseEnter={() => setActive(index)}
                  className={`block w-full border-l-2 px-3 py-2 text-left text-sm ${
                    index === active ? 'border-l-primary bg-accent' : 'border-l-transparent'
                  }`}
                >
                  <span className="font-medium">{product.name}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{product.code}</span>
                  <span className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                    {product.brand?.name ? <span>Brand: {product.brand.name}</span> : null}
                    <span>GST: {Number(product.gst_rate || 0)}%</span>
                    <span>{priceField === 'purchase_price' ? 'Buy' : 'Sell'}: {formatCurrency(price)}</span>
                    {typeof stock === 'number' ? (
                      <span className={stock <= 0 ? 'text-red-500' : ''}>Stock: {formatNumber(stock)}</span>
                    ) : null}
                  </span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
