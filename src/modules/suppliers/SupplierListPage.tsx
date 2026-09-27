import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Plus,
  MoreHorizontal,
  Eye,
  Pencil,
  BookOpen,
  Trash2,
  Truck,
  Download,
} from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { SearchInput } from '@/components/ui/search-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/use-toast';
import { usePermissions } from '@/contexts/PermissionContext';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import {
  getSuppliers,
  deleteSupplier,
  exportSuppliers,
} from '@/services/supplier.service';
import { INDIAN_STATES } from '@/constants';
import type { SupplierWithRelations, SupplierFilters } from '@/types/supplier.types';

const fadeIn = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function SupplierListPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { canCreate, canEdit, canDelete, canExport } = usePermissions();

  const [suppliers, setSuppliers] = useState<SupplierWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [filters, setFilters] = useState<SupplierFilters>({
    search: '',
    state: '',
    is_active: undefined,
  });

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getSuppliers(filters, page, pageSize);
      setSuppliers(response.suppliers);
      setTotalPages(response.total_pages);
      setTotalItems(response.total);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to fetch suppliers',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [filters, page, pageSize, toast]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await deleteSupplier(deleteId);
      toast({ title: 'Success', description: 'Supplier deleted successfully', variant: 'success' });
      setDeleteId(null);
      fetchSuppliers();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete supplier',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleExport = async () => {
    if (!canExport('suppliers')) return;
    try {
      const data = await exportSuppliers(filters);
      const headers = ['Code', 'Name', 'GSTIN', 'PAN', 'Contact Person', 'Phone', 'Email', 'City', 'State', 'Credit Limit', 'Credit Period', 'Opening Balance', 'Current Balance', 'Payment Terms', 'Active'];
      const csv = [
        headers.join(','),
        ...data.map((row) =>
          [
            row.code,
            `"${row.name}"`,
            row.gstin,
            row.pan,
            `"${row.contact_person}"`,
            row.phone,
            row.email,
            row.city,
            row.state,
            row.credit_limit,
            row.credit_period,
            row.opening_balance,
            row.current_balance,
            `"${row.payment_terms}"`,
            row.is_active,
          ].join(',')
        ),
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `suppliers-${formatDate(new Date(), 'YYYY-MM-DD')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Success', description: 'Suppliers exported successfully', variant: 'success' });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Export failed',
        variant: 'destructive',
      });
    }
  };

  const columns: ColumnDef<SupplierWithRelations, unknown>[] = useMemo(
    () => [
      {
        accessorKey: 'code',
        header: 'Code',
        cell: ({ row }) => (
          <span className="font-mono text-sm">{row.original.code || '-'}</span>
        ),
      },
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }) => (
          <button
            onClick={() => navigate(`/suppliers/${row.original.id}`)}
            className="text-left font-medium text-foreground hover:text-primary transition-colors"
          >
            {row.original.name}
          </button>
        ),
      },
      {
        accessorKey: 'contact_person',
        header: 'Contact',
        cell: ({ row }) => row.original.contact_person || '-',
      },
      {
        accessorKey: 'phone',
        header: 'Phone',
        cell: ({ row }) => row.original.phone || '-',
      },
      {
        accessorKey: 'city',
        header: 'City',
        cell: ({ row }) => row.original.city || '-',
      },
      {
        accessorKey: 'state',
        header: 'State',
        cell: ({ row }) => row.original.state || '-',
      },
      {
        accessorKey: 'opening_balance',
        header: 'Payable',
        cell: ({ row }) => {
          const balance = row.original.opening_balance || 0;
          return (
            <span className={cn('font-medium', balance > 0 ? 'text-red-500' : balance < 0 ? 'text-green-500' : 'text-muted-foreground')}>
              {formatCurrency(balance)}
            </span>
          );
        },
      },
      {
        accessorKey: 'credit_period',
        header: 'Credit Period',
        cell: ({ row }) => `${row.original.credit_period || 0} days`,
      },
      {
        accessorKey: 'is_active',
        header: 'Status',
        cell: ({ row }) => (
          <Badge variant={row.original.is_active ? 'success' : 'secondary'}>
            {row.original.is_active ? 'Active' : 'Inactive'}
          </Badge>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
          const supplier = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate(`/suppliers/${supplier.id}`)}>
                  <Eye className="mr-2 h-4 w-4" />
                  View
                </DropdownMenuItem>
                {canEdit('suppliers') && (
                  <DropdownMenuItem onClick={() => navigate(`/suppliers/${supplier.id}/edit`)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => navigate(`/ledgers/suppliers?supplier_id=${supplier.id}`)}>
                  <BookOpen className="mr-2 h-4 w-4" />
                  Ledger
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {canDelete('suppliers') && (
                  <DropdownMenuItem
                    className="text-red-500 focus:text-red-500"
                    onClick={() => setDeleteId(supplier.id)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [navigate, canEdit, canDelete]
  );

  return (
    <motion.div initial="hidden" animate="visible" variants={fadeIn} className="space-y-6">
      <PageHeader
        title="Suppliers"
        description="Manage your supplier accounts and payment settings"
        breadcrumbs={[
          { label: 'Dashboard', onClick: () => navigate('/dashboard') },
          { label: 'Suppliers' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            {canExport('suppliers') && (
              <Button variant="outline" onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            )}
            {canCreate('suppliers') && (
              <Button onClick={() => navigate('/suppliers/new')}>
                <Plus className="mr-2 h-4 w-4" />
                Add Supplier
              </Button>
            )}
          </div>
        }
      />

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
            <SearchInput
              placeholder="Search by name, code, phone, email..."
              value={filters.search || ''}
              onChange={(value) => {
                setFilters((prev) => ({ ...prev, search: value }));
                setPage(1);
              }}
              className="w-full sm:w-[320px]"
            />
            <div className="flex items-center gap-2">
              <Select
                value={filters.is_active === undefined ? 'all' : String(filters.is_active)}
                onValueChange={(value) => {
                  setFilters((prev) => ({
                    ...prev,
                    is_active: value === 'all' ? undefined : value === 'true',
                  }));
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="true">Active</SelectItem>
                  <SelectItem value="false">Inactive</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filters.state || 'all'}
                onValueChange={(value) => {
                  setFilters((prev) => ({ ...prev, state: value === 'all' ? '' : value }));
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All States" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All States</SelectItem>
                  {INDIAN_STATES.map((state) => (
                    <SelectItem key={state} value={state}>
                      {state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-10 w-[250px]" />
                <Skeleton className="h-10 w-[120px]" />
              </div>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                  <Skeleton className="h-4 w-[80px]" />
                  <Skeleton className="h-4 w-[150px]" />
                  <Skeleton className="h-4 w-[120px]" />
                  <Skeleton className="h-4 w-[100px]" />
                  <Skeleton className="h-4 w-[100px]" />
                  <Skeleton className="h-4 w-[80px]" />
                  <Skeleton className="h-4 w-[100px]" />
                  <Skeleton className="h-6 w-[70px]" />
                  <Skeleton className="h-8 w-8" />
                </div>
              ))}
            </div>
          ) : suppliers.length === 0 ? (
            <EmptyState
              icon={<Truck className="h-8 w-8 text-muted-foreground/60" />}
              title="No suppliers found"
              description={
                filters.search || filters.state || filters.is_active !== undefined
                  ? 'Try adjusting your filters.'
                  : 'Get started by adding your first supplier.'
              }
              action={
                canCreate('suppliers')
                  ? {
                      label: 'Add Supplier',
                      onClick: () => navigate('/suppliers/new'),
                    }
                  : undefined
              }
            />
          ) : (
            <>
              <div className="rounded-md border border-border">
                <table className="w-full caption-bottom text-sm">
                  <thead className="[&_tr]:border-b">
                    {columns.map((col) => (
                      <tr key={col.id || 'actions'}>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                          {typeof col.header === 'string' ? col.header : 'Actions'}
                        </th>
                      </tr>
                    ))}
                  </thead>
                  <tbody className="[&_tr:last-child]:border-0">
                    {suppliers.map((supplier) => (
                      <tr
                        key={supplier.id}
                        className="border-b border-border transition-colors hover:bg-muted/50"
                      >
                        <td className="p-4 font-mono text-sm">{supplier.code || '-'}</td>
                        <td className="p-4">
                          <button
                            onClick={() => navigate(`/suppliers/${supplier.id}`)}
                            className="font-medium text-foreground hover:text-primary transition-colors"
                          >
                            {supplier.name}
                          </button>
                        </td>
                        <td className="p-4">{supplier.contact_person || '-'}</td>
                        <td className="p-4">{supplier.phone || '-'}</td>
                        <td className="p-4">{supplier.city || '-'}</td>
                        <td className="p-4">{supplier.state || '-'}</td>
                        <td className="p-4">
                          <span
                            className={cn(
                              'font-medium',
                              (supplier.opening_balance || 0) > 0
                                ? 'text-red-500'
                                : (supplier.opening_balance || 0) < 0
                                ? 'text-green-500'
                                : 'text-muted-foreground'
                            )}
                          >
                            {formatCurrency(supplier.opening_balance || 0)}
                          </span>
                        </td>
                        <td className="p-4">{supplier.credit_period || 0} days</td>
                        <td className="p-4">
                          <Badge variant={supplier.is_active ? 'success' : 'secondary'}>
                            {supplier.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => navigate(`/suppliers/${supplier.id}`)}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                View
                              </DropdownMenuItem>
                              {canEdit('suppliers') && (
                                <DropdownMenuItem
                                  onClick={() => navigate(`/suppliers/${supplier.id}/edit`)}
                                >
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() =>
                                  navigate(`/ledgers/suppliers?supplier_id=${supplier.id}`)
                                }
                              >
                                <BookOpen className="mr-2 h-4 w-4" />
                                Ledger
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {canDelete('suppliers') && (
                                <DropdownMenuItem
                                  className="text-red-500 focus:text-red-500"
                                  onClick={() => setDeleteId(supplier.id)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4">
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  totalItems={totalItems}
                  pageSize={pageSize}
                  onPageChange={setPage}
                  onPageSizeChange={(size) => {
                    setPageSize(size);
                    setPage(1);
                  }}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete Supplier"
        description="Are you sure you want to delete this supplier? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </motion.div>
  );
}
