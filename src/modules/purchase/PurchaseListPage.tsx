import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Pencil,
  Trash2,
  XCircle,
  FileSpreadsheet,
  Filter,
  RefreshCw,
  ChevronDown,
  Receipt,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { SearchInput } from '@/components/ui/search-input';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState } from '@/components/ui/empty-state';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { usePermissions } from '@/contexts/PermissionContext';
import { getTransactions, deleteTransaction, cancelTransaction } from '@/services/transaction.service';
import type { TransactionWithRelations } from '@/types/transaction.types';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'draft', label: 'Draft' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'paid', label: 'Paid' },
  { value: 'partial', label: 'Partial' },
  { value: 'cancelled', label: 'Cancelled' },
];

const PAYMENT_STATUS_OPTIONS = [
  { value: 'all', label: 'All Payment' },
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'partial', label: 'Partial' },
  { value: 'paid', label: 'Fully Paid' },
];

function getStatusBadge(status: string) {
  switch (status) {
    case 'draft':
      return <Badge variant="secondary">Draft</Badge>;
    case 'confirmed':
      return <Badge variant="info">Confirmed</Badge>;
    case 'approved':
      return <Badge variant="success">Approved</Badge>;
    case 'paid':
      return <Badge variant="success">Paid</Badge>;
    case 'partial':
      return <Badge variant="warning">Partial</Badge>;
    case 'cancelled':
      return <Badge variant="destructive">Cancelled</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

function getPaymentStatusBadge(grandTotal: number, amountPaid: number) {
  if (amountPaid >= grandTotal && grandTotal > 0) {
    return <Badge variant="success">Paid</Badge>;
  }
  if (amountPaid > 0 && amountPaid < grandTotal) {
    return <Badge variant="warning">Partial</Badge>;
  }
  return <Badge variant="destructive">Unpaid</Badge>;
}

export default function PurchaseListPage() {
  const navigate = useNavigate();
  const { canCreate, canEdit, canDelete } = usePermissions();
  const { toast } = useToast();

  const [purchases, setPurchases] = useState<TransactionWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalItems, setTotalItems] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchPurchases = useCallback(async () => {
    try {
      setLoading(true);
      const filters: Record<string, string> = {};
      if (statusFilter !== 'all') filters.status = statusFilter;
      if (searchQuery) filters.search = searchQuery;
      if (dateFrom) filters.date_from = dateFrom;
      if (dateTo) filters.date_to = dateTo;

      const response = await getTransactions('purchase', filters, currentPage, pageSize);
      let filtered = response.transactions;

      if (paymentFilter === 'unpaid') {
        filtered = filtered.filter((t) => t.amount_paid === 0);
      } else if (paymentFilter === 'partial') {
        filtered = filtered.filter((t) => t.amount_paid > 0 && t.amount_paid < t.grand_total);
      } else if (paymentFilter === 'paid') {
        filtered = filtered.filter((t) => t.amount_paid >= t.grand_total);
      }

      setPurchases(filtered);
      setTotalItems(response.total);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to fetch purchase invoices', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, statusFilter, paymentFilter, searchQuery, dateFrom, dateTo, toast]);

  useEffect(() => {
    fetchPurchases();
  }, [fetchPurchases]);

  const handleDelete = async () => {
    if (!selectedId) return;
    try {
      setActionLoading(true);
      await deleteTransaction(selectedId);
      toast({ title: 'Deleted', description: 'Purchase invoice deleted successfully', variant: 'success' });
      fetchPurchases();
    } catch (error) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to delete', variant: 'destructive' });
    } finally {
      setActionLoading(false);
      setDeleteDialogOpen(false);
      setSelectedId(null);
    }
  };

  const handleCancel = async () => {
    if (!selectedId) return;
    try {
      setActionLoading(true);
      await cancelTransaction(selectedId);
      toast({ title: 'Cancelled', description: 'Purchase invoice cancelled successfully', variant: 'success' });
      fetchPurchases();
    } catch (error) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to cancel', variant: 'destructive' });
    } finally {
      setActionLoading(false);
      setCancelDialogOpen(false);
      setSelectedId(null);
    }
  };

  const summary = useMemo(() => {
    return purchases.reduce(
      (acc, p) => ({
        subtotal: acc.subtotal + (p.subtotal || 0),
        tax: acc.tax + (p.tax_amount || 0),
        total: acc.total + (p.grand_total || 0),
        paid: acc.paid + (p.amount_paid || 0),
        balance: acc.balance + ((p.grand_total || 0) - (p.amount_paid || 0)),
      }),
      { subtotal: 0, tax: 0, total: 0, paid: 0, balance: 0 }
    );
  }, [purchases]);

  const exportToCSV = () => {
    const headers = ['Doc No', 'Date', 'Supplier', 'Items', 'Subtotal', 'Tax', 'Total', 'Paid', 'Balance', 'Status'];
    const rows = purchases.map((p) => [
      p.document_number,
      formatDate(p.document_date),
      p.supplier?.name || '-',
      String(p.items?.length || 0),
      formatCurrency(p.subtotal),
      formatCurrency(p.tax_amount),
      formatCurrency(p.grand_total),
      formatCurrency(p.amount_paid),
      formatCurrency(p.grand_total - p.amount_paid),
      p.status,
    ]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `purchase-invoices-${formatDate(new Date(), 'YYYY-MM-DD')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Exported', description: 'Purchase data exported successfully', variant: 'success' });
  };

  return (
    <div>
      <PageHeader
        title="Purchase Invoices"
        description="Manage all purchase invoices and supplier billing"
        breadcrumbs={[
          { label: 'Dashboard', onClick: () => navigate('/') },
          { label: 'Transactions' },
          { label: 'Purchase Invoices' },
        ]}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={exportToCSV}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export
            </Button>
            {canCreate('purchases') && (
              <Button size="sm" onClick={() => navigate('/purchase/new')}>
                <Plus className="h-4 w-4 mr-2" />
                New Purchase
              </Button>
            )}
          </>
        }
      />

      <Card className="mt-3">
        <CardContent className="p-3">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search invoices..."
                className="w-full sm:w-72"
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Date Filters
                <ChevronDown className={cn("h-4 w-4 ml-1 transition-transform", showFilters && "rotate-180")} />
              </Button>
              <Button variant="ghost" size="sm" onClick={fetchPurchases}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>

            {showFilters && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-muted-foreground">From:</label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-40"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-muted-foreground">To:</label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-40"
                  />
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setDateFrom(''); setDateTo(''); }}>
                  Clear
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="mt-2">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : purchases.length === 0 ? (
            <EmptyState
              icon={<Receipt className="h-8 w-8" />}
              title="No purchase invoices found"
              description="Create your first purchase invoice to get started"
              action={
                canCreate('purchases')
                  ? { label: 'New Purchase', onClick: () => navigate('/purchase/new') }
                  : undefined
              }
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Doc No</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead className="text-center">Items</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                      <TableHead className="text-right">Tax</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchases.map((purchase) => {
                      const balance = purchase.grand_total - purchase.amount_paid;
                      return (
                        <TableRow key={purchase.id}>
                          <TableCell className="font-medium">{purchase.document_number}</TableCell>
                          <TableCell>{formatDate(purchase.document_date)}</TableCell>
                          <TableCell>
                            <div>
                              <span className="font-medium">{purchase.supplier?.name || '-'}</span>
                              {purchase.supplier?.gstin && (
                                <span className="block text-xs text-muted-foreground">
                                  GSTIN: {purchase.supplier.gstin}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">{purchase.items?.length || 0}</TableCell>
                          <TableCell className="text-right">{formatCurrency(purchase.subtotal)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(purchase.tax_amount)}</TableCell>
                          <TableCell className="text-right font-semibold">{formatCurrency(purchase.grand_total)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(purchase.amount_paid)}</TableCell>
                          <TableCell className={cn("text-right font-medium", balance > 0 ? "text-destructive" : "text-green-600")}>
                            {formatCurrency(balance)}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              {getStatusBadge(purchase.status)}
                              {getPaymentStatusBadge(purchase.grand_total, purchase.amount_paid)}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {canEdit('purchases') && purchase.status === 'draft' && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  title="Edit"
                                  onClick={() => navigate(`/purchase/${purchase.id}/edit`)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              )}
                              {purchase.status !== 'cancelled' && purchase.status !== 'paid' && canEdit('purchases') && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-orange-500 hover:text-orange-600"
                                  title="Cancel"
                                  onClick={() => { setSelectedId(purchase.id); setCancelDialogOpen(true); }}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              )}
                              {canDelete('purchases') && purchase.status === 'draft' && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  title="Delete"
                                  onClick={() => { setSelectedId(purchase.id); setDeleteDialogOpen(true); }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="border-t bg-muted/30 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground">
                      Subtotal: <span className="font-semibold text-foreground">{formatCurrency(summary.subtotal)}</span>
                    </span>
                    <span className="text-muted-foreground">
                      Tax: <span className="font-semibold text-foreground">{formatCurrency(summary.tax)}</span>
                    </span>
                    <span className="text-muted-foreground">
                      Total: <span className="font-bold text-foreground">{formatCurrency(summary.total)}</span>
                    </span>
                    <span className="text-muted-foreground">
                      Paid: <span className="font-semibold text-green-600">{formatCurrency(summary.paid)}</span>
                    </span>
                    <span className="text-muted-foreground">
                      Balance: <span className="font-semibold text-destructive">{formatCurrency(summary.balance)}</span>
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {totalItems > 0 && (
        <div className="mt-2">
          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(totalItems / pageSize)}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
          />
        </div>
      )}

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Purchase Invoice"
        description="Are you sure you want to delete this purchase invoice? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        loading={actionLoading}
      />

      <ConfirmDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        title="Cancel Purchase Invoice"
        description="Are you sure you want to cancel this purchase invoice? This will reverse any stock changes."
        confirmLabel="Cancel Invoice"
        variant="warning"
        onConfirm={handleCancel}
        loading={actionLoading}
      />
    </div>
  );
}
