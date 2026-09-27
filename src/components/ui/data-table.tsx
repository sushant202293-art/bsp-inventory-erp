import * as React from "react";
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  FileText,
  Printer,
  SlidersHorizontal,
  Search,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { Input } from "./input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";
import { Skeleton } from "./skeleton";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchKey?: string;
  searchPlaceholder?: string;
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  enableRowSelection?: boolean;
  onExportCSV?: (data: TData[]) => void;
  onExportExcel?: (data: TData[]) => void;
  onPrint?: (data: TData[]) => void;
  pageSizeOptions?: number[];
  defaultPageSize?: number;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder = "Search...",
  loading = false,
  emptyTitle = "No results found",
  emptyDescription = "Try adjusting your search or filter criteria.",
  enableRowSelection = false,
  onExportCSV,
  onExportExcel,
  onPrint,
  pageSizeOptions = [10, 20, 50, 100],
  defaultPageSize = 10,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [globalFilter, setGlobalFilter] = React.useState("");

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
    },
    enableRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const selectedRows = table.getFilteredSelectedRowModel().rows;

  const handleExportCSV = () => {
    if (onExportCSV) {
      onExportCSV(selectedRows.length > 0 ? selectedRows.map((r) => r.original) : data);
    }
  };

  const handleExportExcel = () => {
    if (onExportExcel) {
      onExportExcel(selectedRows.length > 0 ? selectedRows.map((r) => r.original) : data);
    }
  };

  const handlePrint = () => {
    if (onPrint) {
      onPrint(selectedRows.length > 0 ? selectedRows.map((r) => r.original) : data);
    }
  };

  if (loading) {
    return (
      <div className="w-full space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-[250px]" />
          <Skeleton className="h-10 w-[120px]" />
        </div>
        <div className="rounded-md border border-border">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center space-x-4 p-4">
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-[100px]" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          {searchKey && (
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ""}
                onChange={(e) =>
                  table.getColumn(searchKey)?.setFilterValue(e.target.value)
                }
                className="pl-9 w-[250px]"
              />
              {(table.getColumn(searchKey)?.getFilterValue() as string) && (
                <button
                  onClick={() => table.getColumn(searchKey)?.setFilterValue("")}
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
          {!searchKey && globalFilter !== undefined && (
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="pl-9 w-[250px]"
              />
              {globalFilter && (
                <button
                  onClick={() => setGlobalFilter("")}
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {(onExportCSV || onExportExcel || onPrint) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Export Options</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {onExportCSV && (
                  <DropdownMenuCheckboxItem
                    checked={false}
                    onCheckedChange={handleExportCSV}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Export as CSV
                  </DropdownMenuCheckboxItem>
                )}
                {onExportExcel && (
                  <DropdownMenuCheckboxItem
                    checked={false}
                    onCheckedChange={handleExportExcel}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Export as Excel
                  </DropdownMenuCheckboxItem>
                )}
                {onPrint && (
                  <DropdownMenuCheckboxItem
                    checked={false}
                    onCheckedChange={handlePrint}
                  >
                    <Printer className="mr-2 h-4 w-4" />
                    Print
                  </DropdownMenuCheckboxItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(!!value)}
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {selectedRows.length > 0 && (
        <div className="flex items-center gap-2 rounded-md bg-primary/10 px-3 py-2 text-sm text-primary">
          <span className="font-medium">{selectedRows.length} row(s) selected</span>
          <button
            onClick={() => setRowSelection({})}
            className="ml-auto text-xs underline hover:text-primary/80"
          >
            Clear selection
          </button>
        </div>
      )}

      <div className="rounded-md border border-border">
        <table className="w-full caption-bottom text-sm">
          <thead className="[&_tr]:border-b">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="[&_tr:last-child]:border-0">
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="h-48 text-center">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Search className="h-8 w-8 text-muted-foreground/50" />
                    <p className="text-sm font-medium text-foreground">{emptyTitle}</p>
                    <p className="text-xs text-muted-foreground">{emptyDescription}</p>
                  </div>
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className={cn(
                    "border-b border-border transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="p-4 align-middle [&:has([role=checkbox])]:pr-0"
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">
            {table.getFilteredRowModel().rows.length} row(s) total
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">Rows per page</p>
            <Select
              value={String(table.getState().pagination.pageSize)}
              onValueChange={(value) => {
                table.setPageSize(Number(value));
              }}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder={String(table.getState().pagination.pageSize)} />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((pageSize) => (
                  <SelectItem key={pageSize} value={String(pageSize)}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-sm text-muted-foreground">
              Page {table.getState().pagination.pageIndex + 1} of{" "}
              {table.getPageCount()}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
