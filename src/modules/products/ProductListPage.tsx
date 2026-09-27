import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, Download, FileText, Printer, Eye, Pencil, Copy, Archive,
  MoreHorizontal, ChevronDown, Package, AlertTriangle, X,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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
import { getProducts, deleteProduct, archiveProduct, duplicateProduct, exportProducts } from '@/services/product.service';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { ProductWithRelations, ProductFilters } from '@/types/product.types';

interface Category { id: string; name: string; }
interface Brand { id: string; name: string; }

export default function ProductListPage() {
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
  const [archiveDialog, setArchiveDialog] = useState<{ open: boolean; id: string; name: string }>({ open: false, id: '', name: '' });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string; name: string }>({ open: false, id: '', name: '' });
  const [actionLoading, setActionLoading] = useState(false);

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

  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const { data: cats } = await supabase.from('categories').select('id, name').order('name');
        const { data: brs } = await supabase.from('brands').select('id, name').order('name');
        setCategories(cats || []);
        setBrands(brs || []);
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

  const handleStatusFilter = (value: string) => {
    setFilters((prev) => ({
      ...prev,
      is_active: value === 'all' ? undefined : value === 'active',
    }));
    setPage(1);
  };

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

  const handlePrint = () => {
    window.print();
  };

  const getStockBadge = (product: ProductWithRelations) => {
    const stock = product.total_stock || 0;
    if (stock <= 0) return <Badge variant="destructive">Out of Stock</Badge>;
    if (stock <= product.low_stock_level) return <Badge variant="warning">Low Stock</Badge>;
    return <Badge variant="success">In Stock</Badge>;
  };

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

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, code, or barcode..."
                value={searchInput}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <Select onValueChange={handleCategoryFilter} defaultValue="all">
                <SelectTrigger className="w-[160px]">
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
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Brand" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Brands</SelectItem>
                  {brands.map((br) => (
                    <SelectItem key={br.id} value={br.id}>{br.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select onValueChange={handleStatusFilter} defaultValue="all">
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
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
                  <DropdownMenuItem onClick={handlePrint}>
                    <Printer className="mr-2 h-4 w-4" />
                    Print
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
              title="No products found"
              description="Get started by adding your first product to the inventory."
              action={{ label: 'Add Product', onClick: () => navigate('/products/new') }}
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

      <div className="fixed bottom-4 right-4 hidden rounded-lg border bg-card p-3 shadow-lg print:hidden sm:block">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <AlertTriangle className="h-3 w-3" />
          <span>Total: {total} products</span>
        </div>
      </div>
    </div>
  );
}
