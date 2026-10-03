import * as React from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "./skeleton";

/**
 * Shared aligned ERP list table.
 *
 * A single column descriptor drives the colgroup, the header row and every body
 * row, so header cells and data cells are generated from the same ordered list
 * and cannot drift out of alignment.
 *
 * This exists because the Customers and Suppliers list pages previously defined
 * their columns twice: a tanstack `ColumnDef[]` whose `cell` renderers were
 * never used, plus a separate hand-written body. The header was also built by
 * mapping directly inside `<thead>`, which emitted one `<tr>` per column and
 * stacked every header vertically above a horizontally laid out body.
 *
 * This is intentionally separate from `./data-table`, which is the feature-rich
 * tanstack table (sorting, column filters, visibility, client-side pagination)
 * used by the purchase-order and proforma-invoice lists. That component is left
 * untouched; this one exists for the server-paginated, server-filtered ERP lists
 * that need guaranteed header/body column alignment and per-column alignment.
 *
 * Layout guarantees:
 *   - exactly one `<tr>` in `<thead>`, with one `<th>` per column
 *   - `table-fixed` plus an explicit `<colgroup>`, so the browser cannot size
 *     the header independently from the body
 *   - a single horizontal scroll container wrapping the whole table, so the
 *     header and body scroll together (they are the same table)
 *   - no fixed height, so the page scrolls naturally
 */

export type AlignedTableAlign = "left" | "right" | "center";

export interface AlignedTableColumn<K extends string> {
  /** Stable column identifier, also used as the React key. */
  key: K;
  /** Header label. */
  header: string;
  /** Percentage width, applied to the matching `<col>`. */
  width: string;
  /** Horizontal alignment for both the header cell and every data cell. */
  align?: AlignedTableAlign;
  /** Extra classes merged into the `<th>`. */
  headerClassName?: string;
  /** Extra classes merged into each `<td>`. */
  cellClassName?: string;
}

const ALIGN_CLASS: Record<AlignedTableAlign, string> = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
};

const DEFAULT_ALIGN: AlignedTableAlign = "left";

interface TableFrameProps {
  /** Narrowest comfortable table width; the wrapper scrolls below this. */
  minWidth?: string;
  className?: string;
  children: React.ReactNode;
}

/**
 * The one horizontal scroll container. The table, its header and its body all
 * live inside this element, so they can never scroll independently.
 */
function TableFrame({ minWidth = "1100px", className, children }: TableFrameProps) {
  return (
    <div
      className={cn(
        "w-full overflow-x-auto rounded border border-border bg-card",
        className
      )}
    >
      <table
        className="w-full table-fixed border-collapse caption-bottom text-[13px] tabular-nums"
        style={{ minWidth }}
      >
        {children}
      </table>
    </div>
  );
}

function HeaderCells<K extends string>({ columns }: { columns: AlignedTableColumn<K>[] }) {
  return (
    <thead className="border-b border-border bg-sidebar">
      <tr>
        {columns.map((column) => (
          <th
            key={column.key}
            scope="col"
            className={cn(
              "sticky top-0 z-10 h-[30px] whitespace-nowrap border-b border-border bg-sidebar px-2.5 align-middle text-[11px] font-semibold uppercase tracking-wide text-muted-foreground",
              ALIGN_CLASS[column.align ?? DEFAULT_ALIGN],
              column.headerClassName
            )}
          >
            {column.header}
          </th>
        ))}
      </tr>
    </thead>
  );
}

function ColumnWidths<K extends string>({ columns }: { columns: AlignedTableColumn<K>[] }) {
  return (
    <colgroup>
      {columns.map((column) => (
        <col key={column.key} style={{ width: column.width }} />
      ))}
    </colgroup>
  );
}

interface AlignedTableProps<K extends string, T> {
  columns: AlignedTableColumn<K>[];
  rows: T[];
  /** Row key resolver. */
  rowKey: (row: T) => string;
  /** Renders one cell. Receives the same `key` used by the matching header. */
  renderCell: (row: T, key: K) => React.ReactNode;
  /** Row body class, e.g. hover highlight. */
  rowClassName?: string;
  /** Narrowest comfortable table width; the wrapper scrolls below this. */
  minWidth?: string;
  className?: string;
}

/**
 * Renders a real `<table>` with one header row whose cells sit directly above the
 * matching data column.
 */
function AlignedTable<K extends string, T>({
  columns,
  rows,
  rowKey,
  renderCell,
  rowClassName,
  minWidth,
  className,
}: AlignedTableProps<K, T>) {
  return (
    <TableFrame minWidth={minWidth} className={className}>
      <ColumnWidths columns={columns} />
      <HeaderCells columns={columns} />
      <tbody>
        {rows.map((row) => (
          <tr
            key={rowKey(row)}
            className={cn(
              "border-b border-border/70 transition-colors hover:bg-primary/5 [&:nth-child(even)]:bg-sidebar/50 [&:nth-child(even)]:hover:bg-primary/5",
              rowClassName
            )}
          >
            {columns.map((column) => (
              <td
                key={column.key}
                className={cn(
                  "h-8 px-2.5 py-1 align-middle",
                  ALIGN_CLASS[column.align ?? DEFAULT_ALIGN],
                  column.cellClassName
                )}
              >
                {renderCell(row, column.key)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </TableFrame>
  );
}

interface AlignedTableSkeletonProps<K extends string, T> {
  columns: AlignedTableColumn<K>[];
  rows?: number;
  minWidth?: string;
  className?: string;
}

/**
 * Loading placeholder built from the same descriptor as the real table, so the
 * column layout does not shift when data arrives.
 */
function AlignedTableSkeleton<K extends string, T>({
  columns,
  rows = 8,
  minWidth,
  className,
}: AlignedTableSkeletonProps<K, T>) {
  return (
    <TableFrame minWidth={minWidth} className={className}>
      <ColumnWidths columns={columns} />
      <HeaderCells columns={columns} />
      <tbody>
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <tr key={rowIndex} className="border-b border-border/70">
            {columns.map((column) => (
              <td
                key={column.key}
                className={cn(
                  "h-8 px-2.5 py-1 align-middle",
                  ALIGN_CLASS[column.align ?? DEFAULT_ALIGN],
                  column.cellClassName
                )}
              >
                <Skeleton
                  className={cn(
                    "h-4",
                    column.align === "center" ? "mx-auto w-10" : "w-full"
                  )}
                />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </TableFrame>
  );
}

export { AlignedTable, AlignedTableSkeleton };
export type { AlignedTableProps, AlignedTableSkeletonProps };
