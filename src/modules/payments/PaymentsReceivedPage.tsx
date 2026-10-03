import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Download,
  FileText,
  Edit2,
  Trash2,
  Banknote,
  Smartphone,
  Building2,
  CreditCard,
  Calendar,
  Filter,
  RefreshCw,
  ArrowDownCircle,
  TrendingUp,
  Wallet,
  AlertCircle,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/use-toast';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import {
  getPaymentsReceived,
  createPaymentReceived,
  updatePaymentReceived,
  deletePayment,
  getCustomerPaymentSummary,
  type PaymentFilters,
  type PaymentSummary,
} from '@/services/payment.service';
import { getCustomers } from '@/services/customer.service';
import type { PaymentReceived } from '@/types/database.types';
import type { CustomerWithRelations } from '@/types/customer.types';
import { PAYMENT_MODES } from '@/config/app.config';

interface PaymentFormData {
  customer_id: string;
  date: string;
  amount: number;
  mode: string;
  reference_number: string;
  bank_name: string;
  notes: string;
}

const emptyForm: PaymentFormData = {
  customer_id: '',
  date: new Date().toISOString().split('T')[0],
  amount: 0,
  mode: 'cash',
  reference_number: '',
  bank_name: '',
  notes: '',
};

const modeIcons: Record<string, React.ReactNode> = {
  cash: <Banknote className="h-4 w-4" />,
  bank: <Building2 className="h-4 w-4" />,
  upi: <Smartphone className="h-4 w-4" />,
  cheque: <FileText className="h-4 w-4" />,
  other: <CreditCard className="h-4 w-4" />,
};

export default function PaymentsReceivedPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { company } = useCompany();

  const [payments, setPayments] = useState<PaymentReceived[]>([]);
  const [customers, setCustomers] = useState<CustomerWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPayments, setTotalPayments] = useState(0);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);
  const [modeFilter, setModeFilter] = useState('all');
  const [summary, setSummary] = useState<PaymentSummary | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<PaymentReceived | null>(null);
  const [formData, setFormData] = useState<PaymentFormData>(emptyForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingPayment, setDeletingPayment] = useState<PaymentReceived | null>(null);

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      const filters: PaymentFilters = {};
      if (search) filters.search = search;
      if (dateFrom) filters.date_from = dateFrom.toISOString().split('T')[0];
      if (dateTo) filters.date_to = dateTo.toISOString().split('T')[0];
      if (modeFilter !== 'all') filters.mode = modeFilter;

      const response = await getPaymentsReceived(filters);
      setPayments(response.payments);
      setTotalPayments(response.total);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to fetch payments',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [search, dateFrom, dateTo, modeFilter, toast]);

  const fetchCustomers = useCallback(async () => {
    try {
      const response = await getCustomers({ is_active: true }, 1, 500);
      setCustomers(response.customers);
    } catch {
      // silent
    }
  }, []);

  const fetchSummary = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const monthStart = today.substring(0, 7) + '-01';
      const summaryData = await getCustomerPaymentSummary('all');
      setSummary(summaryData);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  useEffect(() => {
    fetchCustomers();
    fetchSummary();
  }, [fetchCustomers, fetchSummary]);

  const openCreateDialog = () => {
    setEditingPayment(null);
    setFormData(emptyForm);
    setFormErrors({});
    setDialogOpen(true);
  };

  const openEditDialog = (payment: PaymentReceived) => {
    setEditingPayment(payment);
    setFormData({
      customer_id: payment.customer_id,
      date: payment.date,
      amount: payment.amount,
      mode: payment.mode,
      reference_number: payment.reference_number || '',
      bank_name: payment.bank_name || '',
      notes: payment.notes || '',
    });
    setFormErrors({});
    setDialogOpen(true);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.customer_id) errors.customer_id = 'Customer is required';
    if (!formData.date) errors.date = 'Date is required';
    if (!formData.amount || formData.amount <= 0) errors.amount = 'Amount must be greater than 0';
    if (!formData.mode) errors.mode = 'Payment mode is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      if (editingPayment) {
        await updatePaymentReceived(editingPayment.id, {
          date: formData.date,
          amount: formData.amount,
          mode: formData.mode,
          reference_number: formData.reference_number,
          bank_name: formData.bank_name,
          notes: formData.notes,
        });
        toast({ title: 'Payment updated successfully', variant: 'success' });
      } else {
        await createPaymentReceived({
          customer_id: formData.customer_id,
          date: formData.date,
          amount: formData.amount,
          mode: formData.mode,
          reference_number: formData.reference_number,
          bank_name: formData.bank_name,
          notes: formData.notes,
        });
        toast({ title: 'Payment recorded successfully', variant: 'success' });
      }
      setDialogOpen(false);
      fetchPayments();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save payment',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingPayment) return;
    try {
      await deletePayment(deletingPayment.id, 'received');
      toast({ title: 'Payment deleted successfully', variant: 'success' });
      setDeleteDialogOpen(false);
      setDeletingPayment(null);
      fetchPayments();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete payment',
        variant: 'destructive',
      });
    }
  };

  const handleExport = () => {
    const headers = ['Date', 'Customer', 'Mode', 'Reference', 'Amount', 'Notes'];
    const rows = payments.map((p) => [
      p.date,
      customers.find((c) => c.id === p.customer_id)?.name || '',
      p.mode,
      p.reference_number || '',
      String(p.amount),
      p.notes || '',
    ]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payments-received-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const todayTotal = payments
    .filter((p) => p.date === new Date().toISOString().split('T')[0])
    .reduce((sum, p) => sum + p.amount, 0);

  const monthTotal = payments
    .filter((p) => p.date.startsWith(new Date().toISOString().substring(0, 7)))
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-3">
      <PageHeader
        title="Payments Received"
        description="Track and manage customer payments"
        breadcrumbs={[
          { label: 'Dashboard', onClick: () => navigate('/') },
          { label: 'Payments' },
          { label: 'Received' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Receive Payment
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <Card className="border-success/20 bg-success/5">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Today's Received</p>
                  <p className="text-lg font-bold text-success">{formatCurrency(todayTotal)}</p>
                </div>
                <div className="rounded-xl bg-success/10 p-3">
                  <ArrowDownCircle className="h-6 w-6 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        <div>
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">This Month</p>
                  <p className="text-lg font-bold text-primary">{formatCurrency(monthTotal)}</p>
                </div>
                <div className="rounded-xl bg-primary/10 p-3">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        <div>
          <Card className="border-warning/20 bg-warning/5">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Outstanding</p>
                  <p className="text-lg font-bold text-warning">{formatCurrency(summary?.pending_amount || 0)}</p>
                </div>
                <div className="rounded-xl bg-warning/10 p-3">
                  <Wallet className="h-6 w-6 text-warning" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardContent className="p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by reference, notes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <DatePicker value={dateFrom} onChange={(d) => setDateFrom(d)} placeholder="From Date" className="w-full sm:w-[150px]" />
            <DatePicker value={dateTo} onChange={(d) => setDateTo(d)} placeholder="To Date" className="w-full sm:w-[150px]" />
            <Select value={modeFilter} onValueChange={setModeFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="All Modes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modes</SelectItem>
                {PAYMENT_MODES.map((mode) => (
                  <SelectItem key={mode.id} value={mode.id}>{mode.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={fetchPayments}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {payments.length === 0 && !loading ? (
            <EmptyState
              icon={<Banknote className="h-8 w-8 text-muted-foreground/60" />}
              title="No payments found"
              description="Record your first customer payment to get started"
              action={{ label: 'Receive Payment', onClick: openCreateDialog }}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment, index) => {
                  const customer = customers.find((c) => c.id === payment.customer_id);
                  return (
                    <tr key={payment.id} className="border-b border-border hover:bg-muted/50">
                      <TableCell>{formatDate(payment.date)}</TableCell>
                      <TableCell className="font-medium">{customer?.name || 'Unknown'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize gap-1">
                          {modeIcons[payment.mode] || <CreditCard className="h-3 w-3" />}
                          {payment.mode}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{payment.reference_number || '-'}</TableCell>
                      <TableCell className="text-right font-semibold text-success">
                        {formatCurrency(payment.amount)}
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-[200px] truncate">{payment.notes || '-'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(payment)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-danger hover:text-danger"
                            onClick={() => { setDeletingPayment(payment); setDeleteDialogOpen(true); }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </tr>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingPayment ? 'Edit Payment' : 'Receive Payment'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Customer *</label>
              <Select
                value={formData.customer_id}
                onValueChange={(v) => setFormData((p) => ({ ...p, customer_id: v }))}
              >
                <SelectTrigger className={cn(formErrors.customer_id && 'border-danger')}>
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formErrors.customer_id && <p className="text-xs text-danger">{formErrors.customer_id}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Date *</label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData((p) => ({ ...p, date: e.target.value }))}
                  className={cn(formErrors.date && 'border-danger')}
                />
                {formErrors.date && <p className="text-xs text-danger">{formErrors.date}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Amount *</label>
                <Input
                  type="number"
                  value={formData.amount || ''}
                  onChange={(e) => setFormData((p) => ({ ...p, amount: parseFloat(e.target.value) || 0 }))}
                  placeholder="0.00"
                  className={cn(formErrors.amount && 'border-danger')}
                />
                {formErrors.amount && <p className="text-xs text-danger">{formErrors.amount}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Payment Mode *</label>
                <Select
                  value={formData.mode}
                  onValueChange={(v) => setFormData((p) => ({ ...p, mode: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_MODES.map((mode) => (
                      <SelectItem key={mode.id} value={mode.id}>{mode.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Bank Name</label>
                <Input
                  value={formData.bank_name}
                  onChange={(e) => setFormData((p) => ({ ...p, bank_name: e.target.value }))}
                  placeholder="Bank name"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Reference Number</label>
              <Input
                value={formData.reference_number}
                onChange={(e) => setFormData((p) => ({ ...p, reference_number: e.target.value }))}
                placeholder="Cheque/UPI/Transaction reference"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Notes</label>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Additional notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Saving...' : editingPayment ? 'Update Payment' : 'Record Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Payment"
        description={`Are you sure you want to delete this payment of ${deletingPayment ? formatCurrency(deletingPayment.amount) : ''}? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
      />
    </div>
  );
}
