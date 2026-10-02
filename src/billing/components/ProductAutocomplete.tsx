import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Input } from '@/components/ui/input';
import { productService } from '@/services/product.service';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatNumber } from '@/lib/utils';
import type { ProductWithRelations } from '@/types/product.types';

import { DROPDOWN_MAX_HEIGHT, MAX_RESULTS, computeDropdownPlacement, highlightMatches, type DropdownPlacement } from '../autocomplete-positioning';

interface Props {
  value: string;
  priceField?: 'selling_price' | 'purchase_price';
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
 *
 * The result list is portalled to the body with fixed positioning, so it stays
 * visible above the items grid regardless of the overflow rules of its parents.
 */
export function ProductAutocomplete({
  value,
  priceField = 'selling_price',
  onChange,
  onSelect,
  placeholder = 'Search product by name, code, barcode or brand...',
  className,
}: Props) {
  const [results, setResults] = useState<ProductWithRelations[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [active, setActive] = useState(-1);
  const [placement, setPlacement] = useState<DropdownPlacement | null>(null);

  const anchorRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focused = useRef(false);
  const listId = useId();

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  const reposition = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    setPlacement(
      computeDropdownPlacement(el.getBoundingClientRect(), {
        width: window.innerWidth,
        height: window.innerHeight,
      })
    );
  }, []);

  // Measure before paint (no flash at the wrong spot) and keep tracking the
  // field while the list is open: any page or container scroll, window resize
  // or keyboard navigation moves the anchor, so the list follows it.
  useLayoutEffect(() => {
    if (!open) return;
    reposition();
    const handler = () => reposition();
    window.addEventListener('scroll', handler, true);
    window.addEventListener('resize', handler);
    return () => {
      window.removeEventListener('scroll', handler, true);
      window.removeEventListener('resize', handler);
    };
  }, [open, reposition, results.length]);

  // Clicking anywhere outside the field or the list closes it. The rows use
  // `onMouseDown preventDefault`, so the field keeps focus while picking.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: Event) {
      const target = event.target as Node | null;
      if (!target) return;
      if (anchorRef.current?.contains(target) || listRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open || active < 0) return;
    itemRefs.current[active]?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

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
          productService.getProducts({ search: trimmed, limit: MAX_RESULTS, is_active: true }),
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
            .limit(MAX_RESULTS);
          for (const raw of (data || []) as ProductWithRelations[]) {
            if (!rows.some((r) => r.id === raw.id)) rows.push(raw);
          }
        }

        rows = rows.slice(0, MAX_RESULTS);
        setResults(rows);
        // A slow response must not pop the list open after the user moved on.
        setOpen(focused.current);
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
    if (e.key === 'Escape') {
      if (open) {
        e.preventDefault();
        setOpen(false);
      }
      return;
    }
    if (!open) {
      if (e.key === 'ArrowDown' && value.trim().length >= 2) {
        e.preventDefault();
        runSearch(value);
      }
      return;
    }
    if (results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (i + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (active >= 0 && results[active]) choose(results[active]);
    }
  }

  const activeId = `${listId}-option-${active}`;

  return (
    <div ref={anchorRef} className={`relative ${className || ''}`}>
      <Input
        value={value}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && active >= 0 ? activeId : undefined}
        onChange={(e) => {
          onChange(e.target.value);
          runSearch(e.target.value);
        }}
        onFocus={() => {
          focused.current = true;
          if (value.trim().length < 2) return;
          if (results.length > 0) {
            reposition();
            setOpen(true);
          } else {
            runSearch(value);
          }
        }}
        onBlur={(e) => {
          focused.current = false;
          if (!listRef.current?.contains(e.relatedTarget as Node | null)) setOpen(false);
        }}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        className="h-7 w-full"
      />

      {open && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={listRef}
              id={listId}
              role="listbox"
              aria-label="Product matches"
              className="fixed z-[9999] flex flex-col overflow-hidden rounded-lg border bg-popover shadow-xl"
              style={{
                top: placement?.top,
                bottom: placement?.bottom,
                left: placement?.left,
                width: placement?.width,
                maxHeight: placement?.maxHeight ?? DROPDOWN_MAX_HEIGHT,
              }}
            >
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                {searching && results.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-muted-foreground">Searching inventory...</p>
                ) : results.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-muted-foreground">
                    No product matches &ldquo;{value}&rdquo;. Pick an existing product or add it under
                    Products.
                  </p>
                ) : (
                  results.map((product, index) => (
                    <button
                      key={product.id}
                      id={`${listId}-option-${index}`}
                      type="button"
                      role="option"
                      aria-selected={index === active}
                      ref={(el) => {
                        itemRefs.current[index] = el;
                      }}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => choose(product)}
                      onMouseEnter={() => setActive(index)}
                      className={`flex w-full items-center justify-between gap-3 border-l-2 px-3 py-1.5 text-left text-sm hover:bg-accent ${
                        index === active ? 'border-l-primary bg-accent' : 'border-l-transparent'
                      }`}
                    >
                      <span className="min-w-0 flex-1 truncate">
                        <span className="font-medium">
                          {highlightMatches(product.name, value).map((part, i) =>
                            part.match ? (
                              <mark key={i} className="rounded-sm bg-primary/20 px-px text-inherit">
                                {part.text}
                              </mark>
                            ) : (
                              part.text
                            )
                          )}
                        </span>
                        {product.code ? (
                          <span className="ml-1.5 text-xs text-muted-foreground">{product.code}</span>
                        ) : null}
                      </span>
                      <span className="flex shrink-0 items-center gap-2 whitespace-nowrap text-xs text-muted-foreground tabular-nums">
                        {product.unit?.short_name || product.unit?.name ? (
                          <span>{product.unit?.short_name || product.unit?.name}</span>
                        ) : null}
                        <span>
                          {priceField === 'purchase_price' ? 'Buy' : 'Sell'}:{' '}
                          {formatCurrency(Number(product[priceField] || 0))}
                        </span>
                        <span>GST {Number(product.gst_rate || 0)}%</span>
                        {typeof product.total_stock === 'number' ? (
                          <span className={product.total_stock <= 0 ? 'text-red-500' : ''}>
                            Stock {formatNumber(product.total_stock)}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  ))
                )}
              </div>
              {results.length > 0 ? (
                <p className="shrink-0 border-t bg-muted/40 px-3 py-1 text-[11px] text-muted-foreground">
                  {results.length} match{results.length === 1 ? '' : 'es'} &middot; &uarr;&darr; move
                  &middot; Enter select &middot; Esc close
                </p>
              ) : null}
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
