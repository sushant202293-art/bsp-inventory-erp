import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Plus,
  Eye,
  Pencil,
  Printer,
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
import { useCompany } from '@/contexts/CompanyContext';
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

export default function SalesListPage() {
  const navigate = useNavigate();
  const { company } = useCompany();
  const { canCreate, canEdit, canDelete } = usePermissions();
  const { toast } = useToast();

  const [sales, setSales] = useState<TransactionWithRelations[]>([]);
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

  const fetchSales = useCallback(async () => {
    try {
      setLoading(true);
      const filters: Record<string, string> = {};
      if (statusFilter !== 'all') filters.status = statusFilter as 'draft' | 'confirmed' | 'cancelled' | 'paid' | 'partial';
      if (searchQuery) filters.search = searchQuery;
      if (dateFrom) filters.date_from = dateFrom;
      if (dateTo) filters.date_to = dateTo;

      const response = await getTransactions('sale', filters, currentPage, pageSize);
      let filtered = response.transactions;

      if (paymentFilter === 'unpaid') {
        filtered = filtered.filter((t) => t.amount_paid === 0);
      } else if (paymentFilter === 'partial') {
        filtered = filtered.filter((t) => t.amount_paid > 0 && t.amount_paid < t.grand_total);
      } else if (paymentFilter === 'paid') {
        filtered = filtered.filter((t) => t.amount_paid >= t.grand_total);
      }

      setSales(filtered);
      setTotalItems(response.total);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to fetch sales invoices', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, statusFilter, paymentFilter, searchQuery, dateFrom, dateTo, toast]);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  const handleDelete = async () => {
    if (!selectedId) return;
    try {
      setActionLoading(true);
      await deleteTransaction(selectedId);
      toast({ title: 'Deleted', description: 'Sales invoice deleted successfully', variant: 'success' });
      fetchSales();
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
      toast({ title: 'Cancelled', description: 'Sales invoice cancelled successfully', variant: 'success' });
      fetchSales();
    } catch (error) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to cancel', variant: 'destructive' });
    } finally {
      setActionLoading(false);
      setCancelDialogOpen(false);
      setSelectedId(null);
    }
  };

  const summary = useMemo(() => {
    return sales.reduce(
      (acc, s) => ({
        subtotal: acc.subtotal + (s.subtotal || 0),
        tax: acc.tax + (s.tax_amount || 0),
        total: acc.total + (s.grand_total || 0),
        paid: acc.paid + (s.amount_paid || 0),
        balance: acc.balance + ((s.grand_total || 0) - (s.amount_paid || 0)),
      }),
      { subtotal: 0, tax: 0, total: 0, paid: 0, balance: 0 }
    );
  }, [sales]);

  const exportToCSV = () => {
    const headers = ['Doc No', 'Date', 'Customer', 'Items', 'Subtotal', 'Tax', 'Total', 'Paid', 'Balance', 'Status'];
    const rows = sales.map((s) => [
      s.document_number,
      formatDate(s.document_date),
      s.customer?.name || '-',
      String(s.items?.length || 0),
      formatCurrency(s.subtotal),
      formatCurrency(s.tax_amount),
      formatCurrency(s.grand_total),
      formatCurrency(s.amount_paid),
      formatCurrency(s.grand_total - s.amount_paid),
      s.status,
    ]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-invoices-${formatDate(new Date(), 'YYYY-MM-DD')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Exported', description: 'Sales data exported successfully', variant: 'success' });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <PageHeader
        title="Sales Invoices"
        description="Manage all sales invoices and billing"
        breadcrumbs={[
          { label: 'Dashboard', onClick: () => navigate('/') },
          { label: 'Transactions' },
          { label: 'Sales Invoices' },
        ]}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={exportToCSV}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export
            </Button>
            {canCreate('sales') && (
              <Button size="sm" onClick={() => navigate('/transactions/sales/new')}>
                <Plus className="h-4 w-4 mr-2" />
                New Sale
              </Button>
            )}
          </>
        }
      />

      <Card className="mt-6">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
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
              <Button variant="ghost" size="sm" onClick={fetchSales}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>

            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="flex items-center gap-3"
              >
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
              </motion.div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : sales.length === 0 ? (
            <EmptyState
              icon={<Receipt className="h-8 w-8" />}
              title="No sales invoices found"
              description="Create your first sales invoice to get started"
              action={
                canCreate('sales')
                  ? { label: 'New Sale', onClick: () => navigate('/transactions/sales/new') }
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
                      <TableHead>Customer</TableHead>
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
                    {sales.map((sale) => {
                      const balance = sale.grand_total - sale.amount_paid;
                      return (
                        <TableRow key={sale.id}>
                          <TableCell className="font-medium">{sale.document_number}</TableCell>
                          <TableCell>{formatDate(sale.document_date)}</TableCell>
                          <TableCell>
                            <div>
                              <span className="font-medium">{sale.customer?.name || '-'}</span>
                              {sale.customer?.gstin && (
                                <span className="block text-xs text-muted-foreground">
                                  GSTIN: {sale.customer.gstin}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">{sale.items?.length || 0}</TableCell>
                          <TableCell className="text-right">{formatCurrency(sale.subtotal)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(sale.tax_amount)}</TableCell>
                          <TableCell className="text-right font-semibold">{formatCurrency(sale.grand_total)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(sale.amount_paid)}</TableCell>
                          <TableCell className={cn("text-right font-medium", balance > 0 ? "text-destructive" : "text-green-600")}>
                            {formatCurrency(balance)}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              {getStatusBadge(sale.status)}
                              {getPaymentStatusBadge(sale.grand_total, sale.amount_paid)}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                title="View"
                                onClick={() => navigate(`/transactions/sales/${sale.id}`)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {canEdit('sales') && sale.status === 'draft' && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  title="Edit"
                                  onClick={() => navigate(`/transactions/sales/${sale.id}/edit`)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                title="Print"
                                onClick={() => navigate(`/transactions/sales/${sale.id}?print=true`)}
                              >
                                <Printer className="h-4 w-4" />
                              </Button>
                              {sale.status !== 'cancelled' && sale.status !== 'paid' && canEdit('sales') && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-orange-500 hover:text-orange-600"
                                  title="Cancel"
                                  onClick={() => { setSelectedId(sale.id); setCancelDialogOpen(true); }}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              )}
                              {canDelete('sales') && sale.status === 'draft' && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  title="Delete"
                                  onClick={() => { setSelectedId(sale.id); setDeleteDialogOpen(true); }}
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
                <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
                  <div className="flex items-center gap-6">
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
        <div className="mt-4">
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
        title="Delete Sales Invoice"
        description="Are you sure you want to delete this sales invoice? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        loading={actionLoading}
      />

      <ConfirmDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        title="Cancel Sales Invoice"
        description="Are you sure you want to cancel this sales invoice? This will reverse any stock changes."
        confirmLabel="Cancel Invoice"
        variant="warning"
        onConfirm={handleCancel}
        loading={actionLoading}
      />
    </motion.div>
  );
}
