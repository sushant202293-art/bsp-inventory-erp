import { useEffect, useState } from 'react';
import {
  Package, TrendingUp, AlertTriangle, Search, Upload, FileSpreadsheet,
  Loader2, PlusCircle, Download, CheckCircle2, AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency } from '@/lib/utils';
import { stockService } from '@/services/stock.service';
import {
  stockStatementService,
  isFixedHeader,
  FIXED_COLUMN_LABELS,
  type ImportPreview,
  type ImportResult,
} from '@/services/stock-statement.service';

interface StockRow {
  product_id: string;
  product_name: string;
  product_code: string;
  category_name: string | null;
  brand_name: string | null;
  total_stock: number;
  avg_cost: number;
  stock_value: number;
  low_stock_level: number;
}

export default function StockOverviewPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stock, setStock] = useState<StockRow[]>([]);
  const [summary, setSummary] = useState({ total_products: 0, total_qty: 0, total_value: 0, low_stock: 0 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Advanced import state
  const [dynamicColumns, setDynamicColumns] = useState<string[]>([]);
  const [rowsByProduct, setRowsByProduct] = useState<Record<string, Record<string, unknown>>>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [chosenFile, setChosenFile] = useState<File | null>(null);
  const [picking, setPicking] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  useEffect(() => { loadStock(); }, []);

  async function loadStock() {
    setLoading(true);
    try {
      const [data, statement] = await Promise.all([
        stockService.getStockSummary({}),
        stockStatementService.getStatementData().catch(() => null),
      ]);
      const rows = (data || []) as unknown as StockRow[];
      setStock(rows);
      const total_value = rows.reduce((sum, s) => sum + (s.stock_value || 0), 0);
      const total_qty = rows.reduce((sum, s) => sum + (s.total_stock || 0), 0);
      const low_stock = rows.filter((s) => s.total_stock <= (s.low_stock_level || 0)).length;
      setSummary({ total_products: rows.length, total_qty, total_value, low_stock });

      if (statement) {
        setDynamicColumns(statement.columns.filter((header) => !isFixedHeader(header)));
        setRowsByProduct(statement.rowsByProduct);
      }
    } catch (e) {
      console.error(e);
      toast({
        title: 'Could not load stock',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  const filtered = stock.filter((s) => {
    const needle = search.trim().toLowerCase();
    if (needle && !s.product_name?.toLowerCase().includes(needle) && !s.product_code?.toLowerCase().includes(needle)) return false;
    if (statusFilter === 'low' && s.total_stock > (s.low_stock_level || 0)) return false;
    if (statusFilter === 'out' && s.total_stock > 0) return false;
    return true;
  });

  function openImport() {
    setPreview(null);
    setChosenFile(null);
    setResult(null);
    setImportError(null);
    setDialogOpen(true);
  }

  async function onFileChosen(file: File | null) {
    if (!file) return;
    setImportError(null);
    setResult(null);
    setPicking(true);
    try {
      const parsed = await stockStatementService.previewStockImport(file);
      setPreview(parsed);
      setChosenFile(file);
    } catch (e) {
      setImportError(e instanceof Error ? e.message : 'Could not read the file');
      setPreview(null);
      setChosenFile(null);
    } finally {
      setPicking(false);
    }
  }

  async function runImport() {
    if (!preview || !chosenFile) {
      setImportError('Choose the file again to import it');
      return;
    }
    setImporting(true);
    setImportError(null);
    try {
      const res = await stockStatementService.importStockWorkbook(chosenFile);
      setResult(res);
      setPreview(null);
      setChosenFile(null);
      await loadStock();
    } catch (e) {
      setImportError(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  }

  async function downloadTemplate() {
    const XLSX = await import('xlsx');
    const rows = [
      ['Sl No', 'Item Name', 'Category', 'Brand', 'Unit', 'Quantity', 'Rate', 'GST', 'Total Value'],
      [1, 'Sample Item', 'Sample Category', 'Sample Brand', 'Pcs', 10, 100, 18, 1000],
    ];
    const sheet = XLSX.utils.aoa_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Stock Statement');
    XLSX.writeFile(workbook, 'stock-statement-template.xlsx');
  }

  if (loading) return <div className="flex h-96 items-center justify-center"><LoadingSpinner size="lg" text="Loading stock..." /></div>;

  const stats = [
    { label: 'Total Products', value: summary.total_products, icon: Package },
    { label: 'Total Stock Qty', value: summary.total_qty.toLocaleString(), icon: TrendingUp },
    { label: 'Stock Value', value: formatCurrency(summary.total_value), icon: Package },
    { label: 'Low Stock Items', value: summary.low_stock, icon: AlertTriangle },
  ];

  return (
    <div className="space-y-3 pb-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-bold">Stock Statement</h1>
          <p className="text-xs text-muted-foreground">Current inventory status across all products</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={downloadTemplate}>
            <Download className="mr-1.5 h-3.5 w-3.5" /> Template
          </Button>
          <Button size="sm" onClick={openImport}>
            <Upload className="mr-1.5 h-3.5 w-3.5" /> Advanced Import
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="rounded transition-colors hover:border-primary/50">
            <CardContent className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    {stat.label}
                  </p>
                  <p className="mt-1 truncate text-xl font-semibold tabular-nums">{stat.value}</p>
                </div>
                <stat.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Stock Details</CardTitle>
              {dynamicColumns.length > 0 && (
                <p className="mt-1 flex items-center gap-1 text-xs text-emerald-600">
                  <PlusCircle className="h-3.5 w-3.5" />
                  {dynamicColumns.length} column{dynamicColumns.length === 1 ? '' : 's'} created from imported Excel files: {dynamicColumns.join(', ')}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 w-64" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="low">Low Stock</SelectItem>
                  <SelectItem value="out">Out of Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b">
                  <th className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground text-left">Code</th>
                  <th className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground text-left">Product</th>
                  <th className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground text-left">Category</th>
                  <th className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground text-left">Brand</th>
                  <th className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground text-right">Stock</th>
                  <th className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground text-right">Avg Cost</th>
                  <th className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground text-right">Value</th>
                  {dynamicColumns.map((header) => (
                    <th key={header} className="p-3 text-right font-medium text-primary" title="Created from the Excel header">
                      {header}
                    </th>
                  ))}
                  <th className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => {
                  const imported = rowsByProduct[item.product_id] || {};
                  return (
                    <tr key={item.product_id} className="border-b hover:bg-muted/50">
                      <td className="px-2.5 py-1.5 font-mono text-xs">{item.product_code || '-'}</td>
                      <td className="px-2.5 py-1.5 font-medium">{item.product_name || '-'}</td>
                      <td className="px-2.5 py-1.5 text-muted-foreground">{item.category_name || '-'}</td>
                      <td className="px-2.5 py-1.5 text-muted-foreground">{item.brand_name || '-'}</td>
                      <td className="px-2.5 py-1.5 text-right font-semibold">{item.total_stock}</td>
                      <td className="px-2.5 py-1.5 text-right">{formatCurrency(item.avg_cost || 0)}</td>
                      <td className="px-2.5 py-1.5 text-right font-semibold">{formatCurrency(item.stock_value || 0)}</td>
                      {dynamicColumns.map((header) => (
                        <td key={header} className="p-3 text-right tabular-nums">
                          {formatCell(imported[header])}
                        </td>
                      ))}
                      <td className="px-2.5 py-1.5 text-center">
                        <Badge variant={item.total_stock === 0 ? 'destructive' : item.total_stock <= (item.low_stock_level || 0) ? 'warning' : 'success'}>
                          {item.total_stock === 0 ? 'Out' : item.total_stock <= (item.low_stock_level || 0) ? 'Low' : 'In Stock'}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8 + dynamicColumns.length} className="p-4 text-center text-muted-foreground">
                      No stock data found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Advanced Import - Stock Inventory Update</DialogTitle>
            <DialogDescription>
              Upload an Excel sheet. Every column header is read first: headers that match an existing
              statement column fill it, any other header automatically creates a new column.
            </DialogDescription>
          </DialogHeader>

          {result ? (
            <div className="space-y-3 py-2">
              <div className="flex items-start gap-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                <div className="text-sm">
                  <p className="font-medium">{result.fileName} imported</p>
                  <p className="text-muted-foreground">
                    {result.created} new item{result.created === 1 ? '' : 's'}, {result.updated} updated, {result.skipped} skipped.
                  </p>
                  {result.newColumns.length > 0 && (
                    <p className="mt-1 text-muted-foreground">
                      New column{result.newColumns.length === 1 ? '' : 's'} created in the statement:{' '}
                      <span className="font-medium text-foreground">{result.newColumns.join(', ')}</span>
                    </p>
                  )}
                </div>
              </div>
              {result.errors.length > 0 && (
                <div className="max-h-32 overflow-y-auto rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs">
                  {result.errors.map((err, i) => (
                    <p key={i} className="flex items-start gap-1">
                      <AlertCircle className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" /> {err}
                    </p>
                  ))}
                </div>
              )}
              <DialogFooter>
                <Button onClick={() => { setDialogOpen(false); setResult(null); }}>Done</Button>
              </DialogFooter>
            </div>
          ) : !preview ? (
            <div className="space-y-3 py-2">
              <label
                htmlFor="stock-import-file"
                className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-10 text-center transition ${picking ? 'opacity-60' : 'border-border hover:border-primary/60'}`}
              >
                {picking ? <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /> : <FileSpreadsheet className="h-8 w-8 text-emerald-500" />}
                <span className="text-sm font-medium">
                  {picking ? 'Reading workbook...' : 'Click to choose an Excel file (.xlsx, .xls, .csv)'}
                </span>
                <span className="text-xs text-muted-foreground">
                  e.g. sl no, item name, category, brand, unit, quantity, rate, gst, total value
                </span>
              </label>
              <input
                id="stock-import-file"
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => onFileChosen(e.target.files?.[0] ?? null)}
              />
              <Button variant="outline" className="w-full" onClick={downloadTemplate}>
                <Download className="mr-2 h-4 w-4" /> Download sample template
              </Button>
            </div>
          ) : (
            <div className="space-y-3 py-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{preview.fileName}</span>
                <span className="text-muted-foreground">{preview.rows.length} rows</span>
              </div>

              <div className="rounded-lg border">
                <div className="border-b bg-muted/40 px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Columns read from the header row
                </div>
                <div className="max-h-40 divide-y overflow-y-auto">
                  {preview.plan.map((entry) => (
                    <div key={entry.header} className="flex items-center justify-between px-3 py-1.5 text-sm">
                      <span>{entry.header}</span>
                      {entry.fixed ? (
                        <span className="text-xs text-muted-foreground">→ {FIXED_COLUMN_LABELS[entry.fixed]}</span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                          <PlusCircle className="h-3 w-3" /> New column
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      {preview.columns.map((header) => (
                        <th key={header} className="whitespace-nowrap px-2 py-1.5 text-left font-medium">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.slice(0, 3).map((row, i) => (
                      <tr key={i} className="border-b last:border-0">
                        {preview.columns.map((header) => (
                          <td key={header} className="whitespace-nowrap px-2 py-1.5 text-muted-foreground">
                            {String(row[header] ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {preview.newColumns.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  New columns to be created in the stock statement:{' '}
                  <span className="font-medium text-foreground">{preview.newColumns.join(', ')}</span>
                </p>
              )}

              {importError && (
                <p className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-500">{importError}</p>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => { setPreview(null); setChosenFile(null); setImportError(null); }} disabled={importing}>
                  Cancel
                </Button>
                <Button onClick={runImport} disabled={importing}>
                  {importing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                  {importing ? 'Importing...' : `Import ${preview.rows.length} rows`}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'number') return String(value);
  return String(value);
}
