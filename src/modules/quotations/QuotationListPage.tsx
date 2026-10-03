import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
  FileText,
  ArrowRight,
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
import {
  getTransactions,
  deleteTransaction,
  cancelTransaction,
  convertTransaction,
} from '@/services/transaction.service';
import type { TransactionWithRelations } from '@/types/transaction.types';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'draft', label: 'Draft' },
  { value: 'confirmed', label: 'Sent' },
  { value: 'approved', label: 'Accepted' },
  { value: 'cancelled', label: 'Rejected' },
];

function getStatusBadge(status: string) {
  switch (status) {
    case 'draft':
      return <Badge variant="secondary">Draft</Badge>;
    case 'confirmed':
      return <Badge variant="info">Sent</Badge>;
    case 'approved':
      return <Badge variant="success">Accepted</Badge>;
    case 'cancelled':
      return <Badge variant="destructive">Rejected</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

function isExpired(validUntil: string | null | undefined): boolean {
  if (!validUntil) return false;
  return new Date(validUntil) < new Date();
}

export default function QuotationListPage() {
  const navigate = useNavigate();
  const { canCreate, canEdit, canDelete } = usePermissions();
  const { toast } = useToast();

  const [quotations, setQuotations] = useState<TransactionWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalItems, setTotalItems] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchQuotations = useCallback(async () => {
    try {
      setLoading(true);
      const filters: Record<string, string> = {};
      if (statusFilter !== 'all') filters.status = statusFilter as 'draft' | 'confirmed' | 'cancelled' | 'paid' | 'partial';
      if (searchQuery) filters.search = searchQuery;
      if (dateFrom) filters.date_from = dateFrom;
      if (dateTo) filters.date_to = dateTo;

      const response = await getTransactions('quotation', filters, currentPage, pageSize);
      setQuotations(response.transactions);
      setTotalItems(response.total);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to fetch quotations', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, statusFilter, searchQuery, dateFrom, dateTo, toast]);

  useEffect(() => {
    fetchQuotations();
  }, [fetchQuotations]);

  const handleDelete = async () => {
    if (!selectedId) return;
    try {
      setActionLoading(true);
      await deleteTransaction(selectedId);
      toast({ title: 'Deleted', description: 'Quotation deleted successfully', variant: 'success' });
      fetchQuotations();
    } catch (error) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to delete', variant: 'destructive' });
    } finally {
      setActionLoading(false);
      setDeleteDialogOpen(false);
      setSelectedId(null);
    }
  };

  const handleConvertToSales = async (id: string) => {
    try {
      setActionLoading(true);
      await convertTransaction(id, 'sale');
      toast({ title: 'Converted', description: 'Quotation converted to Sales Invoice', variant: 'success' });
      navigate('/transactions/sales');
    } catch (error) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to convert', variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleConvertToPI = async (id: string) => {
    try {
      setActionLoading(true);
      await convertTransaction(id, 'proforma_invoice');
      toast({ title: 'Converted', description: 'Quotation converted to Proforma Invoice', variant: 'success' });
      navigate('/proforma-invoices');
    } catch (error) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to convert', variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const summary = useMemo(() => {
    return quotations.reduce(
      (acc, q) => ({
        total: acc.total + (q.grand_total || 0),
        count: acc.count + 1,
      }),
      { total: 0, count: 0 }
    );
  }, [quotations]);

  const exportToCSV = () => {
    const headers = ['Doc No', 'Date', 'Customer', 'Items', 'Total', 'Status', 'Valid Until'];
    const rows = quotations.map((q) => [
      q.document_number,
      formatDate(q.document_date),
      q.customer?.name || '-',
      String(q.items?.length || 0),
      formatCurrency(q.grand_total),
      q.status,
      q.validity_date ? formatDate(q.validity_date) : '-',
    ]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quotations-${formatDate(new Date(), 'YYYY-MM-DD')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Exported', description: 'Quotation data exported successfully', variant: 'success' });
  };

  return (
    <div>
      <PageHeader
        title="Quotations"
        description="Manage all quotations and price quotes"
        breadcrumbs={[
          { label: 'Dashboard', onClick: () => navigate('/') },
          { label: 'Transactions' },
          { label: 'Quotations' },
        ]}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={exportToCSV}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export
            </Button>
            {canCreate('quotations') && (
              <Button size="sm" onClick={() => navigate('/quotations/new')}>
                <Plus className="h-4 w-4 mr-2" />
                New Quotation
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
                placeholder="Search quotations..."
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Date Filters
                <ChevronDown className={cn("h-4 w-4 ml-1 transition-transform", showFilters && "rotate-180")} />
              </Button>
              <Button variant="ghost" size="sm" onClick={fetchQuotations}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>

            {showFilters && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-muted-foreground">From:</label>
                  <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-muted-foreground">To:</label>
                  <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
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
          ) : quotations.length === 0 ? (
            <EmptyState
              icon={<FileText className="h-8 w-8" />}
              title="No quotations found"
              description="Create your first quotation to get started"
              action={
                canCreate('quotations')
                  ? { label: 'New Quotation', onClick: () => navigate('/quotations/new') }
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
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Validity</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {quotations.map((q) => {
                      const expired = isExpired(q.validity_date);
                      return (
                        <TableRow key={q.id}>
                          <TableCell className="font-medium">{q.document_number}</TableCell>
                          <TableCell>{formatDate(q.document_date)}</TableCell>
                          <TableCell>
                            <div>
                              <span className="font-medium">{q.customer?.name || '-'}</span>
                              {q.customer?.gstin && (
                                <span className="block text-xs text-muted-foreground">
                                  GSTIN: {q.customer.gstin}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">{q.items?.length || 0}</TableCell>
                          <TableCell className="text-right font-semibold">{formatCurrency(q.grand_total)}</TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              {getStatusBadge(q.status)}
                              {expired && <Badge variant="destructive" className="text-[10px]">Expired</Badge>}
                            </div>
                          </TableCell>
                          <TableCell>
                            {q.validity_date ? (
                              <span className={cn("text-sm", expired ? "text-destructive" : "text-muted-foreground")}>
                                {formatDate(q.validity_date)}
                              </span>
                            ) : (
                              <span className="text-sm text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                title="View"
                                onClick={() => navigate(`/quotations/${q.id}`)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {canEdit('quotations') && q.status === 'draft' && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  title="Edit"
                                  onClick={() => navigate(`/quotations/${q.id}/edit`)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                title="Print"
                                onClick={() => navigate(`/quotations/${q.id}?print=true`)}
                              >
                                <Printer className="h-4 w-4" />
                              </Button>
                              {q.status !== 'cancelled' && canEdit('quotations') && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 text-xs"
                                    title="Convert to PI"
                                    onClick={() => handleConvertToPI(q.id)}
                                    disabled={actionLoading}
                                  >
                                    <ArrowRight className="h-3 w-3 mr-1" />
                                    PI
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 text-xs"
                                    title="Convert to Sales Invoice"
                                    onClick={() => handleConvertToSales(q.id)}
                                    disabled={actionLoading}
                                  >
                                    <ArrowRight className="h-3 w-3 mr-1" />
                                    SI
                                  </Button>
                                </>
                              )}
                              {canDelete('quotations') && q.status === 'draft' && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  title="Delete"
                                  onClick={() => { setSelectedId(q.id); setDeleteDialogOpen(true); }}
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
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Total Quotations: <span className="font-semibold text-foreground">{summary.count}</span>
                  </span>
                  <span className="text-muted-foreground">
                    Total Value: <span className="font-bold text-foreground">{formatCurrency(summary.total)}</span>
                  </span>
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
        title="Delete Quotation"
        description="Are you sure you want to delete this quotation? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        loading={actionLoading}
      />
    </div>
  );
}
