import { createPortal } from 'react-dom';
import { formatCurrency } from '@/lib/utils';
import type { ProductWithRelations } from '@/types/product.types';

export interface PrintFilterLine {
  label: string;
  value: string;
}

export interface ProductPrintReportProps {
  companyName: string;
  products: ProductWithRelations[];
  /** Resolved labels for the filters that were active when Print was clicked. */
  filterLines: PrintFilterLine[];
  /** Count of products matching the filters, regardless of the row cap. */
  matchedCount: number;
  truncated: boolean;
  rowCap: number;
  generatedAt: Date;
}

function stockState(product: ProductWithRelations): { label: string; className: string } {
  const stock = product.total_stock || 0;
  if (stock <= 0) return { label: 'Out of Stock', className: 'print-badge print-badge--danger' };
  if (stock <= (product.low_stock_level || 0)) return { label: 'Low Stock', className: 'print-badge print-badge--warning' };
  return { label: 'In Stock', className: 'print-badge print-badge--success' };
}

/**
 * A4-landscape, data-only product report rendered in a portal so it is a
 * sibling of the app shell rather than a descendant of the dashboard's
 * fixed-height scroll containers. Hidden on screen, printed instead.
 *
 * Multi-page behaviour comes from CSS, not JS: `thead` repeats via
 * `display: table-header-group` and `tr` is kept intact with
 * `break-inside: avoid`, so the browser's own paginator decides the breaks.
 */
export function ProductPrintReport({
  companyName,
  products,
  filterLines,
  matchedCount,
  truncated,
  rowCap,
  generatedAt,
}: ProductPrintReportProps) {
  const activeCount = products.filter((p) => p.is_active).length;
  const lowStockCount = products.filter(
    (p) => (p.total_stock || 0) > 0 && (p.total_stock || 0) <= (p.low_stock_level || 0)
  ).length;
  const outOfStockCount = products.filter((p) => (p.total_stock || 0) <= 0).length;
  const stockValue = products.reduce(
    (sum, p) => sum + (p.total_stock || 0) * Number(p.purchase_price || 0),
    0
  );

  const generatedLabel = generatedAt
    .toLocaleString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
    .replace(/\//g, '-');

  return createPortal(
    <div className="print-report-root" aria-hidden="true">
      <div className="print-report">
        <header className="print-report__header">
          <div className="print-report__identity">
            <h1 className="print-report__title">{companyName}</h1>
            <p className="print-report__subtitle">Product Management Report</p>
          </div>
          <div className="print-report__meta">
            <p>Generated: {generatedLabel}</p>
            <p>Products listed: {products.length} of {matchedCount}</p>
          </div>
        </header>

        <section className="print-summary">
          <div className="print-summary__item">
            <span className="print-summary__label">Total Products</span>
            <span className="print-summary__value">{products.length}</span>
          </div>
          <div className="print-summary__item">
            <span className="print-summary__label">Active</span>
            <span className="print-summary__value">{activeCount}</span>
          </div>
          <div className="print-summary__item">
            <span className="print-summary__label">Inactive</span>
            <span className="print-summary__value">{products.length - activeCount}</span>
          </div>
          <div className="print-summary__item">
            <span className="print-summary__label">Low Stock</span>
            <span className="print-summary__value">{lowStockCount}</span>
          </div>
          <div className="print-summary__item">
            <span className="print-summary__label">Out of Stock</span>
            <span className="print-summary__value">{outOfStockCount}</span>
          </div>
          <div className="print-summary__item">
            <span className="print-summary__label">Stock Value</span>
            <span className="print-summary__value">{formatCurrency(stockValue)}</span>
          </div>
        </section>

        {filterLines.length > 0 && (
          <section className="print-filters">
            <span className="print-filters__label">Filters</span>
            <div className="print-filters__list">
              {filterLines.map((line) => (
                <span key={line.label} className="print-filters__item">
                  {line.label}: <strong>{line.value}</strong>
                </span>
              ))}
            </div>
          </section>
        )}

        {truncated && (
          <p className="print-warning">
            This report is limited to the first {rowCap.toLocaleString('en-IN')} matching products.
            Narrow the filters to print the remaining {Math.max(0, matchedCount - rowCap).toLocaleString('en-IN')}.
          </p>
        )}

        <div className="print-table-wrapper">
          <table className="print-table">
            <colgroup>
              <col className="print-col-index" />
              <col className="print-col-code" />
              <col className="print-col-name" />
              <col className="print-col-medium" />
              <col className="print-col-medium" />
              <col className="print-col-unit" />
              <col className="print-col-money" />
              <col className="print-col-money" />
              <col className="print-col-stock" />
              <col className="print-col-status" />
            </colgroup>
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">Code</th>
                <th scope="col">Product Name</th>
                <th scope="col">Category</th>
                <th scope="col">Brand</th>
                <th scope="col">Unit</th>
                <th scope="col" className="print-num">Purchase Price</th>
                <th scope="col" className="print-num">Selling Price</th>
                <th scope="col" className="print-num">Stock</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product, index) => {
                const state = stockState(product);
                return (
                  <tr key={product.id}>
                    <td className="print-num">{index + 1}</td>
                    <td className="print-code">{product.code || '-'}</td>
                    <td className="print-name">{product.name}</td>
                    <td>{product.category?.name || '-'}</td>
                    <td>{product.brand?.name || '-'}</td>
                    <td>{product.unit?.short_name || '-'}</td>
                    <td className="print-num">{formatCurrency(product.purchase_price)}</td>
                    <td className="print-num">{formatCurrency(product.selling_price)}</td>
                    <td className="print-num">{product.total_stock || 0}</td>
                    <td>
                      <span className={state.className}>{state.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={10} className="print-tfoot">
                  {companyName} — Product Management Report
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>,
    document.body
  );
}
