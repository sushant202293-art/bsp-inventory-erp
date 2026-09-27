import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search,
  Download,
  Printer,
  FileText,
  RefreshCw,
  BookOpen,
  ArrowDownCircle,
  ArrowUpCircle,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
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
import { useToast } from '@/components/ui/use-toast';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useCompanyView } from '@/contexts/CompanyContext';
import { getSuppliers, getSupplierLedger } from '@/services/supplier.service';
import type { SupplierWithRelations } from '@/types/supplier.types';
import type { SupplierLedgerResponse } from '@/types/supplier.types';

export default function SupplierLedgerPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const company = useCompanyView();
  const printRef = useRef<HTMLDivElement>(null);

  const [suppliers, setSuppliers] = useState<SupplierWithRelations[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);
  const [ledgerData, setLedgerData] = useState<SupplierLedgerResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [supplierSearch, setSupplierSearch] = useState('');

  const filteredSuppliers = suppliers.filter((s) =>
    s.name.toLowerCase().includes(supplierSearch.toLowerCase()) ||
    (s.code || '').toLowerCase().includes(supplierSearch.toLowerCase())
  );

  const fetchSuppliers = useCallback(async () => {
    try {
      const response = await getSuppliers({ is_active: true }, 1, 500);
      setSuppliers(response.suppliers);
    } catch {
      // silent
    }
  }, []);

  const fetchLedger = useCallback(async () => {
    if (!selectedSupplierId) return;
    try {
      setLoading(true);
      const from = dateFrom ? dateFrom.toISOString().split('T')[0] : undefined;
      const to = dateTo ? dateTo.toISOString().split('T')[0] : undefined;
      const data = await getSupplierLedger(selectedSupplierId, from, to);
      setLedgerData(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to fetch ledger',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [selectedSupplierId, dateFrom, dateTo, toast]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  useEffect(() => {
    fetchLedger();
  }, [fetchLedger]);

  const handleExportCSV = () => {
    if (!ledgerData) return;
    const headers = ['Date', 'Description', 'Debit', 'Credit', 'Balance'];
    const rows = ledgerData.entries.map((e) => [
      e.date,
      e.description || '',
      String(e.debit),
      String(e.credit),
      String(e.balance),
    ]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `supplier-ledger-${selectedSupplierId}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const supplier = suppliers.find((s) => s.id === selectedSupplierId);
    printWindow.document.write(`
      <html><head><title>Supplier Ledger - ${supplier?.name || ''}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { font-size: 18px; margin-bottom: 5px; }
        h2 { font-size: 14px; color: #666; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
        th { background: #f5f5f5; }
        .summary { display: flex; gap: 30px; margin-bottom: 20px; }
        .summary-item { font-size: 13px; }
        .summary-item strong { display: block; font-size: 16px; }
        @media print { body { padding: 0; } }
      </style></head><body>
      <h1>${company.name}</h1>
      <h2>Supplier Ledger: ${supplier?.name || ''}</h2>
      <div class="summary">
        <div class="summary-item"><strong>${formatCurrency(ledgerData?.opening_balance || 0)}</strong>Opening Balance</div>
        <div class="summary-item"><strong>${formatCurrency(ledgerData?.total_debit || 0)}</strong>Total Debit</div>
        <div class="summary-item"><strong>${formatCurrency(ledgerData?.total_credit || 0)}</strong>Total Credit</div>
        <div class="summary-item"><strong>${formatCurrency(ledgerData?.closing_balance || 0)}</strong>Closing Balance</div>
      </div>
      ${printContent.innerHTML}
      <script>window.onload=function(){window.print();window.close();}</script>
      </body></html>
    `);
    printWindow.document.close();
  };

  const handleExportExcel = () => {
    if (!ledgerData) return;
    const supplier = suppliers.find((s) => s.id === selectedSupplierId);
    const htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:spreadsheet">
      <head><meta charset="UTF-8"></head>
      <body>
        <table border="1">
          <tr><td colspan="5" style="font-weight:bold;font-size:16px">Supplier Ledger: ${supplier?.name || ''}</td></tr>
          <tr><td colspan="5">Opening Balance: ${formatCurrency(ledgerData?.opening_balance || 0)}</td></tr>
          <tr style="background:#f5f5f5"><th>Date</th><th>Description</th><th>Debit</th><th>Credit</th><th>Balance</th></tr>
          ${ledgerData.entries.map((e) => `<tr><td>${e.date}</td><td>${e.description || ''}</td><td>${e.debit}</td><td>${e.credit}</td><td>${e.balance}</td></tr>`).join('')}
          <tr style="background:#f5f5f5"><td colspan="2"><strong>Totals</strong></td><td><strong>${ledgerData.total_debit}</strong></td><td><strong>${ledgerData.total_credit}</strong></td><td><strong>${ledgerData.closing_balance}</strong></td></tr>
        </table>
      </body></html>
    `;
    const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `supplier-ledger-${supplier?.name || ''}-${new Date().toISOString().split('T')[0]}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Supplier Ledger"
        description="View supplier account statements and transaction history"
        breadcrumbs={[
          { label: 'Dashboard', onClick: () => navigate('/') },
          { label: 'Ledgers' },
          { label: 'Supplier' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            {ledgerData && (
              <>
                <Button variant="outline" onClick={handleExportCSV}>
                  <Download className="mr-2 h-4 w-4" />
                  CSV
                </Button>
                <Button variant="outline" onClick={handleExportExcel}>
                  <FileText className="mr-2 h-4 w-4" />
                  Excel
                </Button>
                <Button variant="outline" onClick={handlePrint}>
                  <Printer className="mr-2 h-4 w-4" />
                  Print
                </Button>
              </>
            )}
          </div>
        }
      />

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">Supplier</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search supplier..."
                  value={supplierSearch}
                  onChange={(e) => setSupplierSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {filteredSuppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} {s.code ? `(${s.code})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">From Date</label>
              <DatePicker value={dateFrom} onChange={(d) => setDateFrom(d)} placeholder="From" className="w-full sm:w-[150px]" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">To Date</label>
              <DatePicker value={dateTo} onChange={(d) => setDateTo(d)} placeholder="To" className="w-full sm:w-[150px]" />
            </div>
            <Button onClick={fetchLedger} disabled={!selectedSupplierId || loading}>
              <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
              Load Ledger
            </Button>
          </div>
        </CardContent>
      </Card>

      {!selectedSupplierId ? (
        <EmptyState
          icon={<BookOpen className="h-8 w-8 text-muted-foreground/60" />}
          title="Select a supplier"
          description="Choose a supplier from the dropdown above to view their ledger"
        />
      ) : ledgerData ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
              <Card className="border-info/20 bg-info/5">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Opening Balance</p>
                  <p className="text-lg font-bold">{formatCurrency(ledgerData.opening_balance)}</p>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="border-danger/20 bg-danger/5">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><ArrowUpCircle className="h-3 w-3" /> Total Debit</p>
                  <p className="text-lg font-bold text-danger">{formatCurrency(ledgerData.total_debit)}</p>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card className="border-success/20 bg-success/5">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><ArrowDownCircle className="h-3 w-3" /> Total Credit</p>
                  <p className="text-lg font-bold text-success">{formatCurrency(ledgerData.total_credit)}</p>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Closing Balance</p>
                  <p className="text-lg font-bold text-primary">{formatCurrency(ledgerData.closing_balance)}</p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <Card>
            <CardContent className="p-0">
              <div ref={printRef}>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Debit</TableHead>
                      <TableHead className="text-right">Credit</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ledgerData.entries.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                          No entries found for the selected period
                        </TableCell>
                      </TableRow>
                    ) : (
                      <>
                        {ledgerData.entries.map((entry, index) => (
                          <motion.tr
                            key={entry.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.02 }}
                            className="border-b border-border hover:bg-muted/30"
                          >
                            <TableCell>{formatDate(entry.date)}</TableCell>
                            <TableCell>{entry.description || '-'}</TableCell>
                            <TableCell className="text-right font-medium text-danger">
                              {entry.debit > 0 ? formatCurrency(entry.debit) : '-'}
                            </TableCell>
                            <TableCell className="text-right font-medium text-success">
                              {entry.credit > 0 ? formatCurrency(entry.credit) : '-'}
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {formatCurrency(entry.balance)}
                            </TableCell>
                          </motion.tr>
                        ))}
                        <TableRow className="bg-muted/50 font-semibold">
                          <TableCell colSpan={2}>Total</TableCell>
                          <TableCell className="text-right text-danger">{formatCurrency(ledgerData.total_debit)}</TableCell>
                          <TableCell className="text-right text-success">{formatCurrency(ledgerData.total_credit)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(ledgerData.closing_balance)}</TableCell>
                        </TableRow>
                      </>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <EmptyState
          icon={<BookOpen className="h-8 w-8 text-muted-foreground/60" />}
          title="No ledger data"
          description="Select a supplier and click Load Ledger to view their account statement"
        />
      )}
    </div>
  );
}
