import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, Download, FileText, Printer, Eye, Pencil, Copy, Archive,
  MoreHorizontal, ChevronDown, Package, AlertTriangle, X, Boxes,
  TrendingDown, Warehouse, IndianRupee, Loader2,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';
import {
  getProducts, deleteProduct, archiveProduct, duplicateProduct, exportProducts,
  getProductStats, getProductsForReport, getCompanyName, PRODUCT_REPORT_MAX_ROWS,
  type ProductStats,
} from '@/services/product.service';
import { ProductPrintReport, type PrintFilterLine } from './ProductPrintReport';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { ProductWithRelations, ProductFilters } from '@/types/product.types';

interface Category { id: string; name: string; }
interface Brand { id: string; name: string; }
interface Unit { id: string; name: string; short_name: string; }

const STOCK_FILTER_ALL = 'all';
const STOCK_FILTER_LOW = 'low';
const STOCK_FILTER_OUT = 'out';

/** Payload captured at the moment the report is (re)built. */
interface PendingPrint {
  companyName: string;
  products: ProductWithRelations[];
  filterLines: PrintFilterLine[];
  matchedCount: number;
  truncated: boolean;
  generatedAt: Date;
}

/**
 * Embeddable product table. Rendered as the default tab of the Product
 * workspace and reused by the standalone `/products` route wrapper below, so
 * both surfaces share one implementation.
 */
export function ProductListPanel() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [products, setProducts] = useState<ProductWithRelations[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ProductFilters>({});
  const [searchInput, setSearchInput] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [stats, setStats] = useState<ProductStats | null>(null);
  const [archiveDialog, setArchiveDialog] = useState<{ open: boolean; id: string; name: string }>({ open: false, id: '', name: '' });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string; name: string }>({ open: false, id: '', name: '' });
  const [actionLoading, setActionLoading] = useState(false);
  const [printLoading, setPrintLoading] = useState(false);
  /**
   * Report payload. The state copy drives rendering; the ref copy exists only
   * so the `beforeprint` handler can read it synchronously, since a state
   * update there is not guaranteed to be painted before the browser snapshots
   * the page. Both are written together in `refreshReport`.
   */
  const [report, setReport] = useState<PendingPrint | null>(null);
  const reportCache = useRef<PendingPrint | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getProducts(filters, page, pageSize);
      setProducts(response.products);
      setTotal(response.total);
      setTotalPages(response.total_pages);
    } catch {
      toast({ title: 'Error', description: 'Failed to fetch products.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [filters, page, pageSize, toast]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const fetchStats = useCallback(async () => {
    try {
      setStats(await getProductStats());
    } catch {
      // Summary cards are decorative; a failure here must not break the table.
      setStats(null);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const [cats, brs, unts] = await Promise.all([
          supabase.from('categories').select('id, name').eq('is_active', true).order('name'),
          supabase.from('brands').select('id, name').eq('is_active', true).order('name'),
          supabase.from('units').select('id, name, short_name').eq('is_active', true).order('name'),
        ]);
        setCategories(cats.data || []);
        setBrands(brs.data || []);
        setUnits(unts.data || []);
      } catch { /* silent */ }
    };
    fetchDropdowns();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setFilters((prev) => ({ ...prev, search: searchInput || undefined }));
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const handleSearch = (value: string) => setSearchInput(value);

  const handleCategoryFilter = (value: string) => {
    setFilters((prev) => ({ ...prev, category_id: value === 'all' ? undefined : value }));
    setPage(1);
  };

  const handleBrandFilter = (value: string) => {
    setFilters((prev) => ({ ...prev, brand_id: value === 'all' ? undefined : value }));
    setPage(1);
  };

  const handleUnitFilter = (value: string) => {
    setFilters((prev) => ({ ...prev, unit_id: value === 'all' ? undefined : value }));
    setPage(1);
  };

  const handleStatusFilter = (value: string) => {
    setFilters((prev) => ({
      ...prev,
      is_active: value === 'all' ? undefined : value === 'active',
    }));
    setPage(1);
  };

  const handleStockFilter = (value: string) => {
    setFilters((prev) => ({
      ...prev,
      low_stock: value === STOCK_FILTER_LOW ? true : undefined,
      out_of_stock: value === STOCK_FILTER_OUT ? true : undefined,
    }));
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setFilters({});
    setPage(1);
  };

  const activeFilterCount =
    (filters.search ? 1 : 0) +
    (filters.category_id ? 1 : 0) +
    (filters.brand_id ? 1 : 0) +
    (filters.unit_id ? 1 : 0) +
    (filters.is_active !== undefined ? 1 : 0) +
    (filters.low_stock || filters.out_of_stock ? 1 : 0);

  const handleArchive = async () => {
    setActionLoading(true);
    try {
      await archiveProduct(archiveDialog.id);
      toast({ title: 'Product archived', description: `${archiveDialog.name} has been archived.`, variant: 'success' });
      setArchiveDialog({ open: false, id: '', name: '' });
      fetchProducts();
    } catch {
      toast({ title: 'Error', description: 'Failed to archive product.', variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    setActionLoading(true);
    try {
      await deleteProduct(deleteDialog.id);
      toast({ title: 'Product deleted', description: `${deleteDialog.name} has been deleted.`, variant: 'success' });
      setDeleteDialog({ open: false, id: '', name: '' });
      fetchProducts();
    } catch {
      toast({ title: 'Error', description: 'Failed to delete product.', variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      await duplicateProduct(id);
      toast({ title: 'Product duplicated', description: 'A copy of the product has been created.', variant: 'success' });
      fetchProducts();
    } catch {
      toast({ title: 'Error', description: 'Failed to duplicate product.', variant: 'destructive' });
    }
  };

  const handleExportCSV = async () => {
    try {
      const data = await exportProducts(filters);
      const headers = ['Code', 'Name', 'Category', 'Brand', 'Unit', 'Purchase Price', 'Selling Price', 'Stock', 'Status'];
      const csv = [
        headers.join(','),
        ...data.map((row) => [
          row.code, `"${row.name}"`, `"${row.category}"`, `"${row.brand}"`,
          row.unit, row.purchase_price, row.selling_price, row.current_stock,
          row.is_active ? 'Active' : 'Inactive',
        ].join(',')),
      ].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `products-${formatDate(new Date(), 'YYYY-MM-DD')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Exported', description: 'Products exported to CSV.', variant: 'success' });
    } catch {
      toast({ title: 'Error', description: 'Failed to export products.', variant: 'destructive' });
    }
  };

  /**
   * Builds the human-readable filter summary for the report, resolving each
   * selected id to its dropdown label so the printout documents exactly which
   * slice of the catalogue was printed.
   */
  const buildPrintFilterLines = useCallback((): PrintFilterLine[] => {
    const lines: PrintFilterLine[] = [];

    if (filters.search) lines.push({ label: 'Search', value: filters.search });
    lines.push({
      label: 'Category',
      value: filters.category_id
        ? categories.find((c) => c.id === filters.category_id)?.name || 'Unknown'
        : 'All Categories',
    });
    lines.push({
      label: 'Brand',
      value: filters.brand_id
        ? brands.find((b) => b.id === filters.brand_id)?.name || 'Unknown'
        : 'All Brands',
    });
    lines.push({
      label: 'Unit',
      value: filters.unit_id
        ? units.find((u) => u.id === filters.unit_id)?.name || 'Unknown'
        : 'All Units',
    });
    lines.push({
      label: 'Status',
      value: filters.is_active === undefined
        ? 'All Status'
        : filters.is_active ? 'Active' : 'Inactive',
    });
    lines.push({
      label: 'Stock',
      value: filters.low_stock
        ? 'Low Stock'
        : filters.out_of_stock
          ? 'Out of Stock'
          : 'All Stock Levels',
    });

    return lines;
  }, [filters, categories, brands, units]);

  /**
   * Fetches every row matching the active filters, plus the company name, into
   * the cache that the print report renders from.
   *
   * The report is always mounted (hidden) rather than built at print time, so
   * `beforeprint` only has to toggle a CSS class synchronously — a React state
   * flip inside `beforeprint` is not guaranteed to be committed before the
   * browser snapshots the page, which would print an empty report.
   */
  const refreshReport = useCallback(async () => {
    try {
      const [{ products: rows, matchedCount, truncated }, companyName] = await Promise.all([
        getProductsForReport(filters),
        getCompanyName().catch(() => 'BSP Traders'),
      ]);
      const payload: PendingPrint = {
        companyName,
        products: rows,
        filterLines: buildPrintFilterLines(),
        matchedCount,
        truncated,
        generatedAt: new Date(),
      };
      reportCache.current = payload;
      setReport(payload);
    } catch {
      reportCache.current = null;
      setReport(null);
    }
  }, [filters, buildPrintFilterLines]);

  // Keep the cache warm so both Export -> Print and Ctrl+P have data ready.
  // Debounced harder than the table so typing does not fire a query per keystroke.
  useEffect(() => {
    const t = setTimeout(() => { refreshReport(); }, 800);
    return () => clearTimeout(t);
  }, [refreshReport]);

  const handlePrint = async () => {
    setPrintLoading(true);
    try {
      await refreshReport();
      const payload = reportCache.current;

      if (!payload || payload.products.length === 0) {
        toast({
          title: 'Nothing to print',
          description: 'No products match the current filters.',
          variant: 'default',
        });
        return;
      }

      // Two frames: one to commit the refreshed report, one to let layout
      // settle so page breaks are computed against the final document.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => window.print());
      });
    } catch {
      toast({ title: 'Error', description: 'Failed to build the print report.', variant: 'destructive' });
    } finally {
      setPrintLoading(false);
    }
  };

  /**
   * Toggles `is-printing-report`, the class the print stylesheet uses to hide
   * the app tree. That is what removes the dashboard's `h-screen
   * overflow-hidden` shell and its internal scrollbar from the printed output.
   *
   * Wired to `beforeprint` so a plain Ctrl+P on this page produces the report
   * too, not the squeezed screen layout.
   */
  useEffect(() => {
    const onBeforePrint = () => {
      if (reportCache.current && reportCache.current.products.length > 0) {
        document.body.classList.add('is-printing-report');
      }
    };
    const onAfterPrint = () => {
      document.body.classList.remove('is-printing-report');
    };

    window.addEventListener('beforeprint', onBeforePrint);
    window.addEventListener('afterprint', onAfterPrint);
    return () => {
      window.removeEventListener('beforeprint', onBeforePrint);
      window.removeEventListener('afterprint', onAfterPrint);
      document.body.classList.remove('is-printing-report');
    };
  }, []);

  const getStockBadge = (product: ProductWithRelations) => {
    const stock = product.total_stock || 0;
    if (stock <= 0) return <Badge variant="destructive">Out of Stock</Badge>;
    if (stock <= product.low_stock_level) return <Badge variant="warning">Low Stock</Badge>;
    return <Badge variant="success">In Stock</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<Package className="h-5 w-5" />}
          title="Total Products"
          value={stats ? stats.total : '-'}
          loading={!stats && !loading}
        />
        <StatCard
          icon={<Boxes className="h-5 w-5" />}
          title="Active"
          value={stats ? stats.active : '-'}
          changeLabel={`${stats ? stats.inactive : 0} inactive`}
          loading={!stats && !loading}
        />
        <StatCard
          icon={<TrendingDown className="h-5 w-5" />}
          title="Low Stock"
          value={stats ? stats.low_stock : '-'}
          changeLabel={`${stats ? stats.out_of_stock : 0} out of stock`}
          loading={!stats && !loading}
        />
        <StatCard
          icon={<IndianRupee className="h-5 w-5" />}
          title="Stock Value"
          value={stats ? formatCurrency(stats.stock_value) : '-'}
          loading={!stats && !loading}
        />
      </div>

      <Card>
        <CardContent className="p-3">
          <div className="flex flex-col gap-2 xl:flex-row xl:items-center">
            <div className="relative xl:min-w-[220px] xl:flex-[1.5] xl:basis-0">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, code, or barcode..."
                value={searchInput}
                onChange={(e) => handleSearch(e.target.value)}
                className="h-10 rounded-md border border-border pl-10"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2 xl:contents">
              <Select onValueChange={handleCategoryFilter} defaultValue="all">
                <SelectTrigger className="h-10 w-full sm:w-[calc(50%-0.25rem)] xl:w-auto xl:min-w-0 xl:flex-[1] xl:basis-0">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select onValueChange={handleBrandFilter} defaultValue="all">
                <SelectTrigger className="h-10 w-full sm:w-[calc(50%-0.25rem)] xl:w-auto xl:min-w-0 xl:flex-[1] xl:basis-0">
                  <SelectValue placeholder="Brand" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Brands</SelectItem>
                  {brands.map((br) => (
                    <SelectItem key={br.id} value={br.id}>{br.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select onValueChange={handleUnitFilter} defaultValue="all">
                <SelectTrigger className="h-10 w-full sm:w-[calc(50%-0.25rem)] xl:w-auto xl:min-w-[110px] xl:flex-[0.8] xl:basis-0">
                  <SelectValue placeholder="Unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Units</SelectItem>
                  {units.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name} ({u.short_name})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select onValueChange={handleStatusFilter} defaultValue="all">
                <SelectTrigger className="h-10 w-full sm:w-[calc(50%-0.25rem)] xl:w-auto xl:min-w-[120px] xl:flex-[0.9] xl:basis-0">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <Select onValueChange={handleStockFilter} defaultValue={STOCK_FILTER_ALL}>
                <SelectTrigger className="h-10 w-full sm:w-[calc(50%-0.25rem)] xl:w-auto xl:min-w-[150px] xl:flex-1 xl:basis-0">
                  <SelectValue placeholder="Stock" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={STOCK_FILTER_ALL}>All Stock Levels</SelectItem>
                  <SelectItem value={STOCK_FILTER_LOW}>Low Stock</SelectItem>
                  <SelectItem value={STOCK_FILTER_OUT}>Out of Stock</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2 sm:w-full xl:ml-auto xl:w-auto xl:shrink-0">
                {activeFilterCount > 0 && (
                  <Button variant="ghost" onClick={handleClearFilters} className="gap-2 text-muted-foreground">
                    <X className="h-4 w-4" />
                    Clear ({activeFilterCount})
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="h-10 gap-2">
                      <Download className="h-4 w-4" />
                      Export
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleExportCSV}>
                      <FileText className="mr-2 h-4 w-4" />
                      Export CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handlePrint} disabled={printLoading}>
                      {printLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Printer className="mr-2 h-4 w-4" />
                      )}
                      {printLoading ? 'Preparing report...' : 'Print'}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <EmptyState
              icon={<Package className="h-8 w-8 text-muted-foreground/60" />}
              title={activeFilterCount > 0 ? 'No products match your filters' : 'No products found'}
              description={
                activeFilterCount > 0
                  ? 'Try adjusting or clearing the filters above.'
                  : 'Get started by adding your first product to the inventory.'
              }
              action={
                activeFilterCount > 0
                  ? { label: 'Clear Filters', onClick: handleClearFilters }
                  : { label: 'Add Product', onClick: () => navigate('/products/new') }
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Brand</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead className="text-right">Purchase Price</TableHead>
                    <TableHead className="text-right">Selling Price</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {products.map((product, index) => (
                      <motion.tr
                        key={product.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="cursor-pointer border-b transition-colors hover:bg-muted/50"
                        onClick={() => navigate(`/products/${product.id}`)}
                      >
                        <TableCell className="text-muted-foreground">
                          {(page - 1) * pageSize + index + 1}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{product.code}</TableCell>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell>{(product.category as unknown as Category)?.name || '-'}</TableCell>
                        <TableCell>{(product.brand as unknown as Brand)?.name || '-'}</TableCell>
                        <TableCell>{(product.unit as unknown as { short_name: string })?.short_name || '-'}</TableCell>
                        <TableCell className="text-right">{formatCurrency(product.purchase_price)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(product.selling_price)}</TableCell>
                        <TableCell className="text-right">{product.total_stock || 0}</TableCell>
                        <TableCell>{getStockBadge(product)}</TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => navigate(`/products/${product.id}`)}>
                                <Eye className="mr-2 h-4 w-4" />
                                View
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => navigate(`/products/${product.id}/edit`)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDuplicate(product.id)}>
                                <Copy className="mr-2 h-4 w-4" />
                                Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => navigate(`/products/${product.id}?tab=stock`)}>
                                <Warehouse className="mr-2 h-4 w-4" />
                                Stock
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setArchiveDialog({ open: true, id: product.id, name: product.name })}
                                className="text-amber-600"
                              >
                                <Archive className="mr-2 h-4 w-4" />
                                Archive
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setDeleteDialog({ open: true, id: product.id, name: product.name })}
                                className="text-red-600"
                              >
                                <X className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {total > 0 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={total}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
        />
      )}

      <ConfirmDialog
        open={archiveDialog.open}
        onOpenChange={(open) => setArchiveDialog((prev) => ({ ...prev, open }))}
        title="Archive Product"
        description={`Are you sure you want to archive "${archiveDialog.name}"? It will be hidden from active listings.`}
        confirmLabel="Archive"
        variant="warning"
        onConfirm={handleArchive}
        loading={actionLoading}
      />

      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog((prev) => ({ ...prev, open }))}
        title="Delete Product"
        description={`Are you sure you want to delete "${deleteDialog.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        loading={actionLoading}
      />

      <div className="hidden items-center gap-2 rounded-lg border bg-card p-3 text-xs text-muted-foreground shadow-lg print:hidden sm:flex">
        <AlertTriangle className="h-3 w-3" />
        <span>Total: {total} products</span>
      </div>

      {report && report.products.length > 0 && (
        <ProductPrintReport
          companyName={report.companyName}
          products={report.products}
          filterLines={report.filterLines}
          matchedCount={report.matchedCount}
          truncated={report.truncated}
          rowCap={PRODUCT_REPORT_MAX_ROWS}
          generatedAt={report.generatedAt}
        />
      )}
    </div>
  );
}

/**
 * Standalone `/products` route wrapper. It renders the same panel the Product
 * workspace shows by default, so the deep link keeps working.
 */
export default function ProductListPage() {
  const navigate = useNavigate();
  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        description="Manage your product inventory"
        breadcrumbs={[
          { label: 'Dashboard', onClick: () => navigate('/dashboard') },
          { label: 'Products' },
        ]}
        actions={
          <Button onClick={() => navigate('/products/new')} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Product
          </Button>
        }
      />
      <ProductListPanel />
    </div>
  );
}
