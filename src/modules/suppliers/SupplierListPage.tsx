import { useState, useEffect, useCallback } from 'react';
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
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { SearchInput } from '@/components/ui/search-input';
import {
  AlignedTable,
  AlignedTableSkeleton,
  type AlignedTableColumn,
} from '@/components/ui/aligned-table';
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

type SupplierColumnKey =
  | 'code'
  | 'name'
  | 'contact_person'
  | 'phone'
  | 'city'
  | 'state'
  | 'opening_balance'
  | 'credit_period'
  | 'is_active'
  | 'actions';

/**
 * Single source of truth for the supplier table columns. Mirrors the customer
 * table so both ERP lists share one design system. Widths total 100%.
 */
const SUPPLIER_COLUMNS: AlignedTableColumn<SupplierColumnKey>[] = [
  { key: 'code', header: 'Code', width: '9%', align: 'left' },
  { key: 'name', header: 'Name', width: '17%', align: 'left' },
  { key: 'contact_person', header: 'Contact', width: '13%', align: 'left' },
  { key: 'phone', header: 'Phone', width: '13%', align: 'left' },
  { key: 'city', header: 'City', width: '9%', align: 'left' },
  { key: 'state', header: 'State', width: '10%', align: 'left' },
  { key: 'opening_balance', header: 'Payable', width: '11%', align: 'right' },
  { key: 'credit_period', header: 'Credit Period', width: '10%', align: 'center' },
  { key: 'is_active', header: 'Status', width: '5%', align: 'center' },
  { key: 'actions', header: 'Actions', width: '3%', align: 'center' },
];

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

  const renderSupplierCell = (
    supplier: SupplierWithRelations,
    columnKey: SupplierColumnKey
  ) => {
    switch (columnKey) {
      case 'code':
        return <span className="font-mono text-sm">{supplier.code || '-'}</span>;

      case 'name':
        return (
          <button
            onClick={() => navigate(`/suppliers/${supplier.id}`)}
            className="max-w-full truncate text-left font-medium text-foreground hover:text-primary transition-colors"
          >
            {supplier.name}
          </button>
        );

      case 'contact_person':
        return <span className="truncate">{supplier.contact_person || '-'}</span>;

      case 'phone':
        return <span className="whitespace-nowrap">{supplier.phone || '-'}</span>;

      case 'city':
        return <span className="truncate">{supplier.city || '-'}</span>;

      case 'state':
        return <span className="whitespace-nowrap">{supplier.state || '-'}</span>;

      case 'opening_balance': {
        const balance = supplier.opening_balance || 0;
        return (
          <span
            className={cn(
              'whitespace-nowrap font-medium tabular-nums',
              balance > 0 ? 'text-red-500' : balance < 0 ? 'text-green-500' : 'text-muted-foreground'
            )}
          >
            {formatCurrency(balance)}
          </span>
        );
      }

      case 'credit_period':
        return (
          <span className="whitespace-nowrap tabular-nums">
            {supplier.credit_period || 0} days
          </span>
        );

      case 'is_active':
        return (
          <Badge variant={supplier.is_active ? 'success' : 'secondary'}>
            {supplier.is_active ? 'Active' : 'Inactive'}
          </Badge>
        );

      case 'actions':
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
    }
  };

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
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
            <SearchInput
              placeholder="Search by name, code, phone, email..."
              value={filters.search || ''}
              onChange={(value) => {
                setFilters((prev) => ({ ...prev, search: value }));
                setPage(1);
              }}
              className="w-full lg:max-w-md lg:flex-1"
            />
            <div className="flex flex-wrap items-center gap-2 lg:ml-auto lg:flex-nowrap">
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
                <SelectTrigger className="w-[132px]">
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
                <SelectTrigger className="w-[164px]">
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
            <AlignedTableSkeleton columns={SUPPLIER_COLUMNS} rows={8} />
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
              <AlignedTable
                columns={SUPPLIER_COLUMNS}
                rows={suppliers}
                rowKey={(supplier) => supplier.id}
                renderCell={renderSupplierCell}
                rowClassName="transition-colors hover:bg-muted/50"
              />

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
