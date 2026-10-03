import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  MoreHorizontal,
  Eye,
  Pencil,
  BookOpen,
  Trash2,
  Users,
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
  getCustomers,
  deleteCustomer,
  exportCustomers,
} from '@/services/customer.service';
import { INDIAN_STATES } from '@/constants';
import type { CustomerWithRelations, CustomerFilters } from '@/types/customer.types';

type CustomerColumnKey =
  | 'code'
  | 'name'
  | 'contact_person'
  | 'phone'
  | 'city'
  | 'state'
  | 'opening_balance'
  | 'credit_limit'
  | 'is_active'
  | 'actions';

/**
 * Single source of truth for the customer table columns. Mirrors the supplier
 * table so both ERP lists share one design system. Widths total 100%.
 */
const CUSTOMER_COLUMNS: AlignedTableColumn<CustomerColumnKey>[] = [
  { key: 'code', header: 'Code', width: '9%', align: 'left' },
  { key: 'name', header: 'Name', width: '16%', align: 'left' },
  { key: 'contact_person', header: 'Contact', width: '13%', align: 'left' },
  { key: 'phone', header: 'Phone', width: '12%', align: 'left' },
  { key: 'city', header: 'City', width: '9%', align: 'left' },
  { key: 'state', header: 'State', width: '9%', align: 'left' },
  { key: 'opening_balance', header: 'Outstanding', width: '11%', align: 'right' },
  { key: 'credit_limit', header: 'Credit Limit', width: '11%', align: 'right' },
  { key: 'is_active', header: 'Status', width: '6%', align: 'center' },
  { key: 'actions', header: 'Actions', width: '4%', align: 'center' },
];

export default function CustomerListPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { canCreate, canEdit, canDelete, canExport } = usePermissions();

  const [customers, setCustomers] = useState<CustomerWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [filters, setFilters] = useState<CustomerFilters>({
    search: '',
    state: '',
    is_active: undefined,
  });

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getCustomers(filters, page, pageSize);
      setCustomers(response.customers);
      setTotalPages(response.total_pages);
      setTotalItems(response.total);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to fetch customers',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [filters, page, pageSize, toast]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await deleteCustomer(deleteId);
      toast({ title: 'Success', description: 'Customer deleted successfully', variant: 'success' });
      setDeleteId(null);
      fetchCustomers();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete customer',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleExport = async () => {
    if (!canExport('customers')) return;
    try {
      const data = await exportCustomers(filters);
      const headers = ['Code', 'Name', 'GSTIN', 'PAN', 'Contact Person', 'Phone', 'Email', 'City', 'State', 'Credit Limit', 'Credit Period', 'Opening Balance', 'Current Balance', 'Active'];
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
            row.is_active,
          ].join(',')
        ),
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `customers-${formatDate(new Date(), 'YYYY-MM-DD')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Success', description: 'Customers exported successfully', variant: 'success' });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Export failed',
        variant: 'destructive',
      });
    }
  };

  const renderCustomerCell = (
    customer: CustomerWithRelations,
    columnKey: CustomerColumnKey
  ) => {
    switch (columnKey) {
      case 'code':
        return <span className="font-mono">{customer.code || '-'}</span>;

      case 'name':
        return (
          <button
            onClick={() => navigate(`/customers/${customer.id}`)}
            className="max-w-full truncate text-left font-medium text-foreground hover:text-primary transition-colors"
          >
            {customer.name}
          </button>
        );

      case 'contact_person':
        return <span className="truncate">{customer.contact_person || '-'}</span>;

      case 'phone':
        return <span className="whitespace-nowrap">{customer.phone || '-'}</span>;

      case 'city':
        return <span className="truncate">{customer.city || '-'}</span>;

      case 'state':
        return <span className="whitespace-nowrap">{customer.state || '-'}</span>;

      case 'opening_balance': {
        const balance = customer.opening_balance || 0;
        return (
          <span
            className={cn(
              'whitespace-nowrap font-semibold tabular-nums',
              balance > 0 ? 'text-red-600' : balance < 0 ? 'text-green-600' : 'text-muted-foreground'
            )}
          >
            {formatCurrency(balance)}
          </span>
        );
      }

      case 'credit_limit':
        return (
          <span className="whitespace-nowrap tabular-nums">
            {formatCurrency(customer.credit_limit || 0)}
          </span>
        );

      case 'is_active':
        return (
          <Badge variant={customer.is_active ? 'success' : 'secondary'} className="text-[10px] px-1.5 py-0">
            {customer.is_active ? 'Active' : 'Inactive'}
          </Badge>
        );

      case 'actions':
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate(`/customers/${customer.id}`)}>
                <Eye className="mr-2 h-3.5 w-3.5" />
                View
              </DropdownMenuItem>
              {canEdit('customers') && (
                <DropdownMenuItem onClick={() => navigate(`/customers/${customer.id}/edit`)}>
                  <Pencil className="mr-2 h-3.5 w-3.5" />
                  Edit
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => navigate(`/ledgers/customers?customer_id=${customer.id}`)}>
                <BookOpen className="mr-2 h-3.5 w-3.5" />
                Ledger
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {canDelete('customers') && (
                <DropdownMenuItem
                  className="text-red-500 focus:text-red-500"
                  onClick={() => setDeleteId(customer.id)}
                >
                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
    }
  };

  return (
    <div className="space-y-2">
      <PageHeader
        title="Customers"
        description="Manage customer accounts and credit settings"
        breadcrumbs={[
          { label: 'Dashboard', onClick: () => navigate('/dashboard') },
          { label: 'Customers' },
        ]}
        actions={
          <div className="flex items-center gap-1.5">
            {canExport('customers') && (
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="mr-1 h-3.5 w-3.5" />
                Export
              </Button>
            )}
            {canCreate('customers') && (
              <Button size="sm" onClick={() => navigate('/customers/new')}>
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add Customer
              </Button>
            )}
          </div>
        }
      />

      <Card>
        <CardContent className="p-2">
          <div className="mb-2 flex flex-col gap-2 lg:flex-row lg:items-center">
            <SearchInput
              placeholder="Search by name, code, phone, email..."
              value={filters.search || ''}
              onChange={(value) => {
                setFilters((prev) => ({ ...prev, search: value }));
                setPage(1);
              }}
              className="w-full lg:max-w-md lg:flex-1"
            />
            <div className="flex flex-wrap items-center gap-1.5 lg:ml-auto lg:flex-nowrap">
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
                <SelectTrigger className="w-[110px]">
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
                <SelectTrigger className="w-[140px]">
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
            <AlignedTableSkeleton columns={CUSTOMER_COLUMNS} rows={10} />
          ) : customers.length === 0 ? (
            <EmptyState
              icon={<Users className="h-8 w-8 text-muted-foreground/60" />}
              title="No customers found"
              description={
                filters.search || filters.state || filters.is_active !== undefined
                  ? 'Try adjusting your filters.'
                  : 'Get started by adding your first customer.'
              }
              action={
                canCreate('customers')
                  ? {
                      label: 'Add Customer',
                      onClick: () => navigate('/customers/new'),
                    }
                  : undefined
              }
            />
          ) : (
            <>
              <AlignedTable
                columns={CUSTOMER_COLUMNS}
                rows={customers}
                rowKey={(customer) => customer.id}
                renderCell={renderCustomerCell}
              />

              <div className="mt-2">
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
        title="Delete Customer"
        description="Are you sure you want to delete this customer? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
