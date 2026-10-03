import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Structural regression guard for the aligned ERP list tables.
 *
 * Customers and Suppliers previously rendered their header by mapping directly
 * inside `<thead>`, so each column emitted its own `<tr>` containing a single
 * `<th>`. That stacked all ten headers vertically while the body laid its ten
 * `<td>`s out horizontally, so header and data could never line up. The
 * underlying cause was two independent definitions of the same columns: a
 * tanstack `ColumnDef[]` whose `cell` renderers were never used, plus a
 * separately hand-written body.
 *
 * Both pages now declare one column descriptor and delegate rendering to the
 * shared `AlignedTable`, which drives the colgroup, the header row and the body
 * from that single descriptor. These assertions pin that architecture.
 */

const read = (...segments: string[]) =>
  readFileSync(resolve(__dirname, ...segments), 'utf-8');

/** Comments are stripped: prose in these files mentions tag names literally. */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

const COMPONENT = stripComments(
  read('..', '..', '..', 'components', 'ui', 'aligned-table.tsx')
);

interface Page {
  name: string;
  file: string;
  descriptor: string;
  columns: { key: string; header: string; width: string; align: string }[];
}

function loadPage(file: string, descriptor: string): Page {
  const source = stripComments(read('..', '..', '..', 'modules', file));
  const start = source.indexOf(`const ${descriptor}`);
  const literal = source.slice(start, source.indexOf('];', start));
  const rowRe =
    /\{\s*key:\s*'([a-z_]+)',\s*header:\s*'([^']+)',\s*width:\s*'([^']+)',\s*align:\s*'(\w+)'/g;
  const columns = [...literal.matchAll(rowRe)].map((m) => ({
    key: m[1],
    header: m[2],
    width: m[3],
    align: m[4],
  }));
  return { name: file, file, descriptor, columns, ...{ source } } as Page;
}

const PAGES: Page[] = [
  loadPage('customers/CustomerListPage.tsx', 'CUSTOMER_COLUMNS'),
  loadPage('suppliers/SupplierListPage.tsx', 'SUPPLIER_COLUMNS'),
];

const CUSTOMER_HEADERS = [
  'Code',
  'Name',
  'Contact',
  'Phone',
  'City',
  'State',
  'Outstanding',
  'Credit Limit',
  'Status',
  'Actions',
];

const SUPPLIER_HEADERS = [
  'Code',
  'Name',
  'Contact',
  'Phone',
  'City',
  'State',
  'Payable',
  'Credit Period',
  'Status',
  'Actions',
];

describe('AlignedTable shared component', () => {
  it('renders exactly one <tr> inside <thead>', () => {
    const thead = COMPONENT.match(/<thead[\s\S]*?<\/thead>/);
    expect(thead).not.toBeNull();
    expect((thead![0].match(/<tr/g) ?? []).length).toBe(1);
  });

  it('never maps directly inside <thead> (the original vertical-header bug)', () => {
    const thead = COMPONENT.match(/<thead[\s\S]*?<\/thead>/)![0];
    // The map must live inside the single <tr>, never directly under <thead>.
    expect(thead.slice(0, thead.indexOf('<tr'))).not.toContain('.map(');
  });

  it('drives colgroup, thead and tbody from one shared colgroup/header/body map', () => {
    // One <colgroup> and one <thead> in the file: the widths and the header cells
    // are shared helpers, so header and body cannot diverge. The <thead> block is
    // emitted from a single place even though the data table and the loading
    // skeleton each render their own <tbody>.
    expect((COMPONENT.match(/<colgroup>/g) ?? []).length).toBe(1);
    expect((COMPONENT.match(/<thead/g) ?? []).length).toBe(1);
    expect((COMPONENT.match(/<th\s/g) ?? []).length).toBe(1);
    expect(COMPONENT).toContain('function ColumnWidths');
    expect(COMPONENT).toContain('function HeaderCells');
    // <colgroup> + <thead> + one body cell map per rendered table (2 tables).
    expect((COMPONENT.match(/columns\.map\(/g) ?? []).length).toBe(4);
    expect((COMPONENT.match(/<tbody>/g) ?? []).length).toBe(2);
  });

  it('applies each width to the matching <col>', () => {
    expect(COMPONENT).toContain('<col key={column.key} style={{ width: column.width }} />');
  });

  it('applies one alignment class to both the header cell and every data cell', () => {
    // The same ALIGN_CLASS lookup is used by <th> and <td>.
    const lookups = COMPONENT.match(/ALIGN_CLASS\[column\.align \?\? DEFAULT_ALIGN\]/g) ?? [];
    expect(lookups.length).toBeGreaterThanOrEqual(2);
    for (const align of ['left', 'right', 'center']) {
      expect(COMPONENT).toContain(`${align}:`);
    }
  });
  it('uses a fixed column layout in one horizontal scroll container', () => {
    expect(COMPONENT).toContain('table-fixed');
    expect(COMPONENT).toContain('overflow-x-auto');
    // Exactly one scroll wrapper, shared by the data table and the skeleton.
    expect((COMPONENT.match(/overflow-x-auto/g) ?? []).length).toBe(1);
    expect((COMPONENT.match(/<table/g) ?? []).length).toBe(1);
  });

  it('has no fixed-height scroll container, so the page scrolls naturally', () => {
    const tableTag = COMPONENT.match(/<table[\s\S]*?>/)![0];
    expect(tableTag).toContain('w-full');
    expect(tableTag).not.toContain('h-[');
    expect(tableTag).not.toContain('overflow-y');
  });

  it('keeps the dark ERP theme header styling and a compact action cell', () => {
    const th = COMPONENT.match(/<th\s[\s\S]*?>/)![0];
    expect(th).toContain('h-[30px]');
    expect(th).toContain('font-semibold');
    expect(th).toContain('uppercase');
    expect(th).toContain('scope="col"');
    expect(COMPONENT).toContain('bg-sidebar');
  });

  it('builds the loading skeleton from the same descriptor as the real table', () => {
    expect(COMPONENT).toContain('function AlignedTableSkeleton');
    expect(COMPONENT).toContain('<ColumnWidths columns={columns} />');
    expect(COMPONENT).toContain('<HeaderCells columns={columns} />');
  });
});

describe.each(PAGES)('$name', (page) => {
  const source = (page as Page & { source: string }).source;

  it('declares exactly one column descriptor', () => {
    expect(source).toContain(`const ${page.descriptor}`);
    expect((source.match(/DataTableColumn<|AlignedTableColumn</g) ?? []).length).toBe(1);
  });

  it('renders through the shared AlignedTable component', () => {
    expect(source).toContain("from '@/components/ui/aligned-table'");
    expect(source).toContain('<AlignedTable');
    expect(source).toContain('<AlignedTableSkeleton');
  });

  it('contains no raw table markup of its own', () => {
    // If a page ever hand-rolls a table again it can drift out of alignment.
    for (const tag of ['<table', '<thead', '<tbody', '<th', '<td', '<colgroup']) {
      expect(source).not.toContain(tag);
    }
  });

  it('has no competing tanstack column definition', () => {
    expect(source).not.toContain('ColumnDef');
    expect(source).not.toContain('accessorKey');
    expect(source).not.toContain('columns.map');
  });

  it('renders every column exactly once per row', () => {
    expect(source).toContain('columns={');
    expect(source).toContain('renderCell={');
    expect(source).toContain('rowKey={');
  });
});

describe.each([
  { page: PAGES[0], headers: CUSTOMER_HEADERS, money: ['Outstanding', 'Credit Limit'] },
  { page: PAGES[1], headers: SUPPLIER_HEADERS, money: ['Payable'] },
])('$page.name columns', ({ page, headers, money }) => {
  const width = (header: string) =>
    parseFloat(page.columns.find((c) => c.header === header)!.width);
  const align = (header: string) =>
    page.columns.find((c) => c.header === header)!.align;

  it('declares the expected headers in order', () => {
    expect(page.columns.map((c) => c.header)).toEqual(headers);
  });

  it('sums widths to 100% without uniform columns', () => {
    const total = page.columns.reduce((sum, c) => sum + parseFloat(c.width), 0);
    expect(total).toBeCloseTo(100, 5);
    expect(new Set(page.columns.map((c) => c.width)).size).toBeGreaterThan(1);
  });

  it('gives Name, Contact and Phone more room than Status and Actions', () => {
    for (const header of ['Name', 'Contact', 'Phone']) {
      expect(width(header)).toBeGreaterThan(width('Status'));
      expect(width(header)).toBeGreaterThan(width('Actions'));
    }
  });

  it('keeps Status and Actions compact', () => {
    expect(width('Status') + width('Actions')).toBeLessThanOrEqual(10);
  });

  it('right-aligns currency columns', () => {
    for (const header of money) {
      expect(align(header)).toBe('right');
    }
  });

  it('centers Status and Actions and left-aligns text columns', () => {
    expect(align('Status')).toBe('center');
    expect(align('Actions')).toBe('center');
    for (const header of ['Code', 'Name', 'Contact', 'Phone', 'City', 'State']) {
      expect(align(header)).toBe('left');
    }
  });
});

describe('Customers and Suppliers design-system parity', () => {
  it('share the same column keys in the same order except the financial column', () => {
    // The 7th column is intentionally different: a customer has a Credit Limit,
    // a supplier has a Credit Period.
    const customer = PAGES[0].columns.map((c) => c.key);
    const supplier = PAGES[1].columns.map((c) => c.key);
    expect(customer.slice(0, 6)).toEqual(supplier.slice(0, 6));
    expect(customer.slice(8)).toEqual(supplier.slice(8));
    expect(customer[7]).toBe('credit_limit');
    expect(supplier[7]).toBe('credit_period');
  });

  it('share the same leading identity columns and trailing status/action columns', () => {
    const customer = PAGES[0].columns.map((c) => c.header);
    const supplier = PAGES[1].columns.map((c) => c.header);
    expect(customer.slice(0, 6)).toEqual(supplier.slice(0, 6));
    expect(customer.slice(8)).toEqual(supplier.slice(8));
  });

  it('both render through the same shared component', () => {
    for (const page of PAGES) {
      const source = (page as Page & { source: string }).source;
      expect(source).toContain("from '@/components/ui/aligned-table'");
    }
  });
});
