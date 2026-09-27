import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { getTransactions } from '@/services/transaction.service';
import { getCustomers } from '@/services/customer.service';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { ReportLayout } from './ReportLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import type { TransactionWithRelations } from '@/types/transaction.types';
import type { CustomerWithRelations } from '@/types/customer.types';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface Filters {
  dateFrom: string;
  dateTo: string;
  customerId: string;
  status: string;
  paymentStatus: string;
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  confirmed: 'bg-blue-100 text-blue-800',
  approved: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  paid: 'bg-green-100 text-green-800',
  partial: 'bg-yellow-100 text-yellow-800',
};

export default function SalesReportPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<TransactionWithRelations[]>([]);
  const [customers, setCustomers] = useState<CustomerWithRelations[]>([]);
  const [filters, setFilters] = useState<Filters>({
    dateFrom: format(new Date(), 'yyyy-MM-01'),
    dateTo: format(new Date(), 'yyyy-MM-dd'),
    customerId: '',
    status: '',
    paymentStatus: '',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const txnFilters: Record<string, string> = {};
      if (filters.dateFrom) txnFilters.date_from = filters.dateFrom;
      if (filters.dateTo) txnFilters.date_to = filters.dateTo;
      if (filters.customerId) txnFilters.customer_id = filters.customerId;
      if (filters.status) txnFilters.status = filters.status;

      const result = await getTransactions('sale', txnFilters, 1, 500);
      let filtered = result.transactions;

      if (filters.paymentStatus === 'paid') {
        filtered = filtered.filter((t) => t.status === 'paid');
      } else if (filters.paymentStatus === 'unpaid') {
        filtered = filtered.filter((t) => t.grand_total > t.amount_paid);
      } else if (filters.paymentStatus === 'partial') {
        filtered = filtered.filter((t) => t.amount_paid > 0 && t.amount_paid < t.grand_total);
      }

      setData(filtered);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    getCustomers({}, 1, 1000).then((r) => setCustomers(r.customers)).catch(() => {});
  }, []);

  const summary = {
    subtotal: data.reduce((s, t) => s + t.subtotal, 0),
    tax: data.reduce((s, t) => s + t.tax_amount, 0),
    total: data.reduce((s, t) => s + t.grand_total, 0),
    paid: data.reduce((s, t) => s + t.amount_paid, 0),
    balance: data.reduce((s, t) => s + (t.grand_total - t.amount_paid), 0),
    count: data.length,
  };

  const exportToPDF = () => {
    const doc = new jsPDF('landscape', 'mm', 'a4');
    doc.setFontSize(16);
    doc.text('Sales Register Report', 14, 15);
    doc.setFontSize(10);
    doc.text(`Period: ${filters.dateFrom || 'All'} to ${filters.dateTo || 'All'}`, 14, 22);
    doc.text(`Generated: ${format(new Date(), 'dd-MM-yyyy HH:mm')}`, 14, 28);

    const body = data.map((t) => [
      formatDate(t.document_date),
      t.document_number,
      t.customer?.name || '-',
      t.items?.length?.toString() || '0',
      formatCurrency(t.subtotal),
      formatCurrency(t.tax_amount),
      formatCurrency(t.grand_total),
      formatCurrency(t.amount_paid),
      formatCurrency(t.grand_total - t.amount_paid),
      t.status.toUpperCase(),
    ]);

    (doc as jsPDF & { autoTable: (opts: Record<string, unknown>) => void }).autoTable({
      startY: 32,
      head: [['Date', 'Doc No', 'Customer', 'Items', 'Subtotal', 'Tax', 'Total', 'Paid', 'Balance', 'Status']],
      body,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] },
      columnStyles: {
        4: { halign: 'right' },
        5: { halign: 'right' },
        6: { halign: 'right' },
        7: { halign: 'right' },
        8: { halign: 'right' },
      },
      margin: { left: 14 },
      didDrawPage: (data: Record<string, unknown>) => {
        const footer = `Total: ${formatCurrency(summary.total)} | Paid: ${formatCurrency(summary.paid)} | Balance: ${formatCurrency(summary.balance)}`;
        doc.setFontSize(9);
        doc.text(footer, 14, (data as { pageHeight: number }).pageHeight - 10);
      },
    });

    doc.save(`sales-register-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const exportToExcel = () => {
    const wsData = [
      ['Date', 'Doc No', 'Customer', 'Items', 'Subtotal', 'Tax', 'Total', 'Paid', 'Balance', 'Status'],
      ...data.map((t) => [
        formatDate(t.document_date),
        t.document_number,
        t.customer?.name || '',
        t.items?.length || 0,
        t.subtotal,
        t.tax_amount,
        t.grand_total,
        t.amount_paid,
        t.grand_total - t.amount_paid,
        t.status.toUpperCase(),
      ]),
      [],
      ['', '', '', 'TOTALS:', summary.subtotal, summary.tax, summary.total, summary.paid, summary.balance, ''],
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [
      { wch: 12 }, { wch: 18 }, { wch: 25 }, { wch: 6 },
      { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 10 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sales Register');
    XLSX.writeFile(wb, `sales-register-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Doc No', 'Customer', 'Items', 'Subtotal', 'Tax', 'Total', 'Paid', 'Balance', 'Status'];
    const rows = data.map((t) => [
      formatDate(t.document_date),
      t.document_number,
      t.customer?.name || '',
      t.items?.length || 0,
      t.subtotal,
      t.tax_amount,
      t.grand_total,
      t.amount_paid,
      t.grand_total - t.amount_paid,
      t.status,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-register-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <ReportLayout
      title="Sales Register Report"
      description={`Showing ${data.length} sales transactions`}
      onExportPDF={exportToPDF}
      onExportExcel={exportToExcel}
      onExportCSV={exportToCSV}
      filters={
        <div className="flex flex-wrap gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Date From</label>
            <Input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
              className="w-[160px]"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Date To</label>
            <Input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
              className="w-[160px]"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Customer</label>
            <Select
              value={filters.customerId}
              onValueChange={(v) => setFilters((f) => ({ ...f, customerId: v }))}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Customers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Customers</SelectItem>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Status</label>
            <Select
              value={filters.status}
              onValueChange={(v) => setFilters((f) => ({ ...f, status: v }))}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Payment</label>
            <Select
              value={filters.paymentStatus}
              onValueChange={(v) => setFilters((f) => ({ ...f, paymentStatus: v }))}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Payments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Payments</SelectItem>
                <SelectItem value="paid">Fully Paid</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button variant="secondary" onClick={fetchData}>Apply Filters</Button>
          </div>
        </div>
      }
      summary={
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-right">
          <div>
            <p className="text-xs text-muted-foreground">Invoices</p>
            <p className="text-lg font-bold">{summary.count}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Subtotal</p>
            <p className="text-lg font-bold">{formatCurrency(summary.subtotal)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Tax</p>
            <p className="text-lg font-bold">{formatCurrency(summary.tax)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-lg font-bold text-primary">{formatCurrency(summary.total)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Balance</p>
            <p className={cn('text-lg font-bold', summary.balance > 0 ? 'text-red-500' : 'text-green-500')}>
              {formatCurrency(summary.balance)}
            </p>
          </div>
        </div>
      }
    >
      {loading ? (
        <div className="p-4 space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Doc No</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="text-right">Items</TableHead>
              <TableHead className="text-right">Subtotal</TableHead>
              <TableHead className="text-right">Tax</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                  No sales transactions found for the selected period
                </TableCell>
              </TableRow>
            ) : (
              data.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{formatDate(t.document_date)}</TableCell>
                  <TableCell className="font-mono text-sm">{t.document_number}</TableCell>
                  <TableCell>{t.customer?.name || '-'}</TableCell>
                  <TableCell className="text-right">{t.items?.length || 0}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(t.subtotal)}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(t.tax_amount)}</TableCell>
                  <TableCell className="text-right font-mono font-semibold">{formatCurrency(t.grand_total)}</TableCell>
                  <TableCell className="text-right font-mono text-green-600">{formatCurrency(t.amount_paid)}</TableCell>
                  <TableCell className={cn('text-right font-mono', (t.grand_total - t.amount_paid) > 0 ? 'text-red-500' : '')}>
                    {formatCurrency(t.grand_total - t.amount_paid)}
                  </TableCell>
                  <TableCell>
                    <Badge className={cn('text-xs', statusColors[t.status] || '')}>
                      {t.status.toUpperCase()}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
            {data.length > 0 && (
              <TableRow className="bg-muted/50 font-bold">
                <TableCell colSpan={4}>TOTAL</TableCell>
                <TableCell className="text-right font-mono">{formatCurrency(summary.subtotal)}</TableCell>
                <TableCell className="text-right font-mono">{formatCurrency(summary.tax)}</TableCell>
                <TableCell className="text-right font-mono">{formatCurrency(summary.total)}</TableCell>
                <TableCell className="text-right font-mono text-green-600">{formatCurrency(summary.paid)}</TableCell>
                <TableCell className="text-right font-mono text-red-500">{formatCurrency(summary.balance)}</TableCell>
                <TableCell />
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </ReportLayout>
  );
}
