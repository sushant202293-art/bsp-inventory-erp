import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Regression coverage for the shared product query builder.
 *
 * A PostgREST builder is a *thenable*. When `buildProductsQuery` was an async
 * function that returned the builder directly, the caller's `await` executed
 * the request and received a response instead of a query, so `.order()` threw
 * `Property 'order' does not exist`. These tests pin the wrapped-builder
 * contract and the filter semantics shared by the table and the print report.
 */

interface RecordedCall {
  table: string;
  op: 'select' | 'eq' | 'in' | 'or' | 'order' | 'range';
  args: unknown[];
}

const calls: RecordedCall[] = [];

/** Result handed back when a builder is awaited (i.e. actually executed). */
let executeResult: { data: unknown; error: null; count: number | null } = {
  data: [],
  error: null,
  count: 0,
};

let profileResult: { data: { company_id: string } | null; error: null } = {
  data: { company_id: 'company-1' },
  error: null,
};

let authResult: { data: { user: { id: string } | null }; error: null } = {
  data: { user: { id: 'user-1' } },
  error: null,
};

let stockRows: { product_id: string; current_stock: number }[] = [];
let lowStockLevels: Record<string, number> = {};

function makeBuilder(table: string) {
  const builder: Record<string, unknown> = {};

  const record = (op: RecordedCall['op']) => (arg?: unknown) => {
    calls.push({ table, op, args: arg === undefined ? [] : [arg] });
    return builder;
  };

  builder.select = (arg: unknown) => {
    calls.push({ table, op: 'select', args: [arg] });
    return builder;
  };
  builder.eq = (col: string, val: unknown) => {
    calls.push({ table, op: 'eq', args: [col, val] });
    return builder;
  };
  builder.or = (arg: unknown) => {
    calls.push({ table, op: 'or', args: [arg] });
    return builder;
  };
  builder.in = (col: string, vals: unknown) => {
    calls.push({ table, op: 'in', args: [col, vals] });
    return builder;
  };
  builder.order = (col: string, opts: unknown) => {
    calls.push({ table, op: 'order', args: [col, opts] });
    return builder;
  };
  builder.range = (from: number, to: number) => {
    calls.push({ table, op: 'range', args: [from, to] });
    return builder;
  };

  // The thenable: awaiting a builder runs the query.
  builder.then = (resolve: (value: unknown) => unknown) => Promise.resolve(executeResult).then(resolve);

  return builder;
}

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getUser: () => Promise.resolve(authResult) },
    from: (table: string) => {
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve(profileResult),
            }),
          }),
        };
      }
      if (table === 'product_stock') {
        return {
          select: () => {
            const b: Record<string, unknown> = {};
            b.eq = () => b;
            b.then = (resolve: (v: unknown) => unknown) =>
              Promise.resolve({ data: stockRows, error: null }).then(resolve);
            return b;
          },
        };
      }
      if (table === 'products') {
        // A bare select is the stock-status id probe; it selects only ids.
        return {
          select: (arg: unknown) => {
            if (typeof arg === 'string' && arg.includes('id, low_stock_level')) {
              const rows = Object.entries(lowStockLevels).map(([id, level]) => ({
                id,
                low_stock_level: level,
              }));
              const b: Record<string, unknown> = {};
              b.then = (resolve: (v: unknown) => unknown) =>
                Promise.resolve({ data: rows, error: null }).then(resolve);
              return b;
            }
            calls.push({ table, op: 'select', args: [arg] });
            return makeBuilder(table);
          },
        };
      }
      return makeBuilder(table);
    },
  },
}));
import {
  getProducts,
  getProductsForReport,
  PRODUCT_REPORT_MAX_ROWS,
} from '@/services/product.service';

beforeEach(() => {
  calls.length = 0;
  stockRows = [];
  lowStockLevels = {};
  executeResult = { data: [], error: null, count: 0 };
  profileResult = { data: { company_id: 'company-1' }, error: null };
  authResult = { data: { user: { id: 'user-1' } }, error: null };
});

const opsFor = (table: string) => calls.filter((c) => c.table === table);

describe('product query builder contract', () => {
  it('hands back an unexecuted builder, not a response', async () => {
    await getProducts({}, 1, 20);
    const order = calls.find((c) => c.op === 'order');
    expect(order).toBeDefined();
    expect(order?.args[0]).toBe('name');
  });

  it('applies the page range for the paginated table', async () => {
    await getProducts({}, 3, 20);
    const range = calls.find((c) => c.op === 'range');
    expect(range?.args).toEqual([40, 59]);
  });
});

describe('report query', () => {
  it('is unpaginated: range starts at 0 and spans the row cap', async () => {
    await getProductsForReport({});
    const range = calls.find((c) => c.op === 'range');
    expect(range?.args).toEqual([0, PRODUCT_REPORT_MAX_ROWS - 1]);
  });

  it('requests the same columns as the table so the report cannot drift', async () => {
    await getProductsForReport({});
    // Scope to the `products` table: the first select of the whole run is the
    // company-id lookup on `profiles`.
    const select = calls.find((c) => c.op === 'select' && c.table === 'products');
    const text = String(select?.args[0]);
    expect(text).toContain('category:categories(id, name)');
    expect(text).toContain('brand:brands(id, name)');
    expect(text).toContain('unit:units(id, name, short_name)');
    expect(text).toContain('product_stock');
  });

  it('reports the real matched count so the header is not a guess', async () => {
    executeResult = { data: [{ id: 'p1' }], error: null, count: 137 };
    const result = await getProductsForReport({});
    expect(result.matchedCount).toBe(137);
    expect(result.truncated).toBe(false);
  });

  it('flags truncation when the match count exceeds the cap', async () => {
    executeResult = { data: [], error: null, count: PRODUCT_REPORT_MAX_ROWS + 25 };
    const result = await getProductsForReport({});
    expect(result.truncated).toBe(true);
  });

  it('sums per-warehouse stock into a single total_stock', async () => {
    executeResult = {
      data: [{ id: 'p1', stocks: [{ current_stock: 4 }, { current_stock: 6 }] }],
      error: null,
      count: 1,
    };
    const result = await getProductsForReport({});
    expect(result.products[0].total_stock).toBe(10);
  });
});

describe('filter parity between table and report', () => {
  it('pushes category, brand, unit and status into the query', async () => {
    await getProductsForReport({
      category_id: 'c1',
      brand_id: 'b1',
      unit_id: 'u1',
      is_active: false,
    });
    const eqs = opsFor('products').filter((c) => c.op === 'eq').map((c) => c.args);
    expect(eqs).toContainEqual(['category_id', 'c1']);
    expect(eqs).toContainEqual(['brand_id', 'b1']);
    expect(eqs).toContainEqual(['unit_id', 'u1']);
    expect(eqs).toContainEqual(['is_active', false]);
  });

  it('short-circuits instead of emitting an empty .in() when nothing is low stock', async () => {
    stockRows = [];
    lowStockLevels = { p1: 5 };

    const result = await getProductsForReport({ low_stock: true });

    expect(calls.some((c) => c.op === 'in')).toBe(false);
    expect(result.products).toEqual([]);
    expect(result.matchedCount).toBe(0);
  });

  it('constrains the query to the resolved stock ids', async () => {
    lowStockLevels = { p1: 5, p2: 5 };
    stockRows = [
      { product_id: 'p1', current_stock: 2 },
      { product_id: 'p2', current_stock: 40 },
    ];

    await getProductsForReport({ low_stock: true });

    const inCall = calls.find((c) => c.op === 'in');
    expect(inCall?.args[0]).toBe('id');
    expect(inCall?.args[1]).toEqual(['p1']);
  });
});
