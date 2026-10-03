import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { getCustomerOutstanding } from '@/services/customer.service';
import { getTransactions } from '@/services/transaction.service';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { ReportLayout } from './ReportLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import type { CustomerAgeing } from '@/types/customer.types';
import type { TransactionWithRelations } from '@/types/transaction.types';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

export default function CustomerReportPage() {
  const [loading, setLoading] = useState(true);
  const [ageingData, setAgeingData] = useState<CustomerAgeing[]>([]);
  const [transactions, setTransactions] = useState<TransactionWithRelations[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const outstanding = await getCustomerOutstanding();
      const txnResult = await getTransactions('sale', {}, 1, 1000);

      const now = new Date();
      const ageingMap = new Map<string, CustomerAgeing>();

      for (const o of outstanding) {
        ageingMap.set(o.customer_id, {
          customer_id: o.customer_id,
          customer_name: o.customer_name,
          current: 0,
          days_30: 0,
          days_60: 0,
          days_90: 0,
          over_90: 0,
          total_outstanding: o.outstanding_balance,
        });
      }

      for (const txn of txnResult.transactions) {
        if (!txn.customer_id) continue;
        const entry = ageingMap.get(txn.customer_id);
        if (!entry) continue;
        const balance = txn.grand_total - txn.amount_paid;
        if (balance <= 0) continue;

        const daysSince = Math.floor((now.getTime() - new Date(txn.document_date).getTime()) / (1000 * 60 * 60 * 24));
        if (daysSince <= 0) entry.current += balance;
        else if (daysSince <= 30) entry.days_30 += balance;
        else if (daysSince <= 60) entry.days_60 += balance;
        else if (daysSince <= 90) entry.days_90 += balance;
        else entry.over_90 += balance;
      }

      setAgeingData(Array.from(ageingMap.values()).sort((a, b) => b.total_outstanding - a.total_outstanding));
      setTransactions(txnResult.transactions.filter((t) => t.customer_id && (t.grand_total - t.amount_paid) > 0));
    } catch {
      setAgeingData([]);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const summary = {
    totalCustomers: ageingData.length,
    totalOutstanding: ageingData.reduce((s, a) => s + a.total_outstanding, 0),
    current: ageingData.reduce((s, a) => s + a.current, 0),
    days30: ageingData.reduce((s, a) => s + a.days_30, 0),
    days60: ageingData.reduce((s, a) => s + a.days_60, 0),
    days90: ageingData.reduce((s, a) => s + a.days_90, 0),
    over90: ageingData.reduce((s, a) => s + a.over_90, 0),
  };

  const exportToPDF = () => {
    const doc = new jsPDF('landscape', 'mm', 'a4');
    doc.setFontSize(16);
    doc.text('Customer Outstanding & Aging Report', 14, 15);
    doc.setFontSize(10);
    doc.text(`As of: ${format(new Date(), 'dd-MM-yyyy')}`, 14, 22);

    const body = ageingData.map((a) => [
      a.customer_name,
      formatCurrency(a.current),
      formatCurrency(a.days_30),
      formatCurrency(a.days_60),
      formatCurrency(a.days_90),
      formatCurrency(a.over_90),
      formatCurrency(a.total_outstanding),
    ]);

    (doc as jsPDF & { autoTable: (opts: Record<string, unknown>) => void }).autoTable({
      startY: 26,
      head: [['Customer', 'Current', '1-30 Days', '31-60 Days', '61-90 Days', '90+ Days', 'Total Outstanding']],
      body,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] },
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right' } },
      margin: { left: 14 },
    });
    doc.save(`customer-outstanding-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const exportToExcel = () => {
    const wsData = [
      ['Customer', 'Current', '1-30 Days', '31-60 Days', '61-90 Days', '90+ Days', 'Total Outstanding'],
      ...ageingData.map((a) => [a.customer_name, a.current, a.days_30, a.days_60, a.days_90, a.over_90, a.total_outstanding]),
      ['TOTAL', summary.current, summary.days30, summary.days60, summary.days90, summary.over90, summary.totalOutstanding],
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [{ wch: 25 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 16 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Customer Aging');
    XLSX.writeFile(wb, `customer-outstanding-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const exportToCSV = () => {
    const headers = ['Customer', 'Current', '1-30 Days', '31-60 Days', '61-90 Days', '90+ Days', 'Total Outstanding'];
    const rows = ageingData.map((a) => [a.customer_name, a.current, a.days_30, a.days_60, a.days_90, a.over_90, a.total_outstanding]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `customer-outstanding-${format(new Date(), 'yyyy-MM-dd')}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <ReportLayout
      title="Customer Outstanding Report"
      description={`Aging analysis as of ${format(new Date(), 'dd-MM-yyyy')}`}
      onExportPDF={exportToPDF}
      onExportExcel={exportToExcel}
      onExportCSV={exportToCSV}
      summary={
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-right">
          <div><p className="text-xs text-muted-foreground">Customers</p><p className="text-lg font-bold">{summary.totalCustomers}</p></div>
          <div><p className="text-xs text-muted-foreground">Total Outstanding</p><p className="text-lg font-bold text-primary">{formatCurrency(summary.totalOutstanding)}</p></div>
          <div><p className="text-xs text-muted-foreground">Current</p><p className="text-lg font-bold text-green-500">{formatCurrency(summary.current)}</p></div>
          <div><p className="text-xs text-muted-foreground">Over 90 Days</p><p className="text-lg font-bold text-red-500">{formatCurrency(summary.over90)}</p></div>
        </div>
      }
    >
      {loading ? (
        <div className="p-4 space-y-3">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead className="text-right">Current</TableHead>
              <TableHead className="text-right">1-30 Days</TableHead>
              <TableHead className="text-right">31-60 Days</TableHead>
              <TableHead className="text-right">61-90 Days</TableHead>
              <TableHead className="text-right">90+ Days</TableHead>
              <TableHead className="text-right">Total Outstanding</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ageingData.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">No outstanding customers found</TableCell></TableRow>
            ) : (
              ageingData.map((a) => (
                <TableRow key={a.customer_id}>
                  <TableCell className="font-medium">{a.customer_name}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(a.current)}</TableCell>
                  <TableCell className={cn('text-right font-mono', a.days_30 > 0 && 'text-yellow-600')}>{formatCurrency(a.days_30)}</TableCell>
                  <TableCell className={cn('text-right font-mono', a.days_60 > 0 && 'text-orange-500')}>{formatCurrency(a.days_60)}</TableCell>
                  <TableCell className={cn('text-right font-mono', a.days_90 > 0 && 'text-red-500')}>{formatCurrency(a.days_90)}</TableCell>
                  <TableCell className={cn('text-right font-mono font-bold', a.over_90 > 0 && 'text-red-600')}>{formatCurrency(a.over_90)}</TableCell>
                  <TableCell className="text-right font-mono font-semibold">{formatCurrency(a.total_outstanding)}</TableCell>
                </TableRow>
              ))
            )}
            {ageingData.length > 0 && (
              <TableRow className="bg-muted/50 font-bold">
                <TableCell>TOTAL</TableCell>
                <TableCell className="text-right font-mono">{formatCurrency(summary.current)}</TableCell>
                <TableCell className="text-right font-mono">{formatCurrency(summary.days30)}</TableCell>
                <TableCell className="text-right font-mono">{formatCurrency(summary.days60)}</TableCell>
                <TableCell className="text-right font-mono">{formatCurrency(summary.days90)}</TableCell>
                <TableCell className="text-right font-mono text-red-500">{formatCurrency(summary.over90)}</TableCell>
                <TableCell className="text-right font-mono">{formatCurrency(summary.totalOutstanding)}</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </ReportLayout>
  );
}
