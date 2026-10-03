import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Printer, Download, Search as SearchIcon, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { useToast } from '@/components/ui/use-toast';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { getCustomers, getCustomerLedger } from '@/services/customer.service';
import type { CustomerWithRelations, CustomerLedgerResponse, CustomerLedgerEntry } from '@/types/customer.types';

export default function CustomerLedgerPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const [customers, setCustomers] = useState<CustomerWithRelations[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState(searchParams.get('customer_id') || '');
  const [ledger, setLedger] = useState<CustomerLedgerResponse | null>(null);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    setLoadingCustomers(true);
    getCustomers({}, 1, 500)
      .then((res) => setCustomers(res.customers))
      .catch((error) => {
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to load customers',
          variant: 'destructive',
        });
      })
      .finally(() => setLoadingCustomers(false));
  }, [toast]);

  const fetchLedger = useCallback(async () => {
    if (!selectedCustomerId) {
      setLedger(null);
      return;
    }
    setLoadingLedger(true);
    try {
      const data = await getCustomerLedger(
        selectedCustomerId,
        dateFrom || undefined,
        dateTo || undefined
      );
      setLedger(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load ledger',
        variant: 'destructive',
      });
    } finally {
      setLoadingLedger(false);
    }
  }, [selectedCustomerId, dateFrom, dateTo, toast]);

  useEffect(() => {
    fetchLedger();
  }, [fetchLedger]);

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    if (!ledger || !selectedCustomer) return;

    const headers = ['Date', 'Description', 'Debit', 'Credit', 'Balance'];
    const rows = ledger.entries.map((entry) => [
      formatDate(entry.date),
      entry.description,
      entry.debit.toFixed(2),
      entry.credit.toFixed(2),
      entry.balance.toFixed(2),
    ]);

    const csv = [
      `Customer Ledger: ${selectedCustomer.name}`,
      `From: ${dateFrom || 'Start'} To: ${dateTo || 'End'}`,
      '',
      headers.join(','),
      ...rows.map((r) => r.join(',')),
      '',
      `Opening Balance: ${ledger.opening_balance.toFixed(2)}`,
      `Total Debit: ${ledger.total_debit.toFixed(2)}`,
      `Total Credit: ${ledger.total_credit.toFixed(2)}`,
      `Closing Balance: ${ledger.closing_balance.toFixed(2)}`,
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ledger-${selectedCustomer.name.replace(/\s+/g, '-')}-${formatDate(new Date(), 'YYYY-MM-DD')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Success', description: 'Ledger exported successfully', variant: 'success' });
  };

  return (
    <div className="space-y-3">
      <PageHeader
        title="Customer Ledger"
        description="View detailed account ledger for any customer"
        breadcrumbs={[
          { label: 'Dashboard', onClick: () => navigate('/dashboard') },
          { label: 'Customers', onClick: () => navigate('/customers') },
          { label: 'Ledger' },
        ]}
        actions={
          <Button variant="outline" onClick={() => navigate('/customers')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        }
      />

      <Card>
        <CardContent className="pt-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">Select Customer</label>
              <Select
                value={selectedCustomerId}
                onValueChange={setSelectedCustomerId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} {c.code ? `(${c.code})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">From Date</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">To Date</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              {ledger && (
                <>
                  <Button variant="outline" onClick={handlePrint}>
                    <Printer className="mr-2 h-4 w-4" />
                    Print
                  </Button>
                  <Button variant="outline" onClick={handleExport}>
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {!selectedCustomerId ? (
        <EmptyState
          icon={<SearchIcon className="h-8 w-8 text-muted-foreground/60" />}
          title="Select a customer"
          description="Choose a customer from the dropdown above to view their ledger."
        />
      ) : loadingLedger ? (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[88px] rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-[400px] rounded-xl" />
        </div>
      ) : ledger ? (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Card>
              <CardContent className="pt-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Opening Balance</p>
                <p className="text-xl font-bold mt-1">{formatCurrency(ledger.opening_balance)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Debit</p>
                <p className="text-xl font-bold mt-1 text-red-500">{formatCurrency(ledger.total_debit)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Credit</p>
                <p className="text-xl font-bold mt-1 text-green-500">{formatCurrency(ledger.total_credit)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Closing Balance</p>
                <p className={cn(
                  'text-xl font-bold mt-1',
                  ledger.closing_balance > 0 ? 'text-red-500' : ledger.closing_balance < 0 ? 'text-green-500' : ''
                )}>
                  {formatCurrency(ledger.closing_balance)}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>
                Ledger Entries
                {selectedCustomer && (
                  <span className="text-base font-normal text-muted-foreground ml-2">
                    - {selectedCustomer.name}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {ledger.entries.length === 0 ? (
                <EmptyState
                  title="No entries found"
                  description="No ledger entries found for the selected date range."
                />
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <table className="w-full text-[13px]">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground text-left">Date</th>
                        <th className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground text-left">Doc No</th>
                        <th className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground text-left">Description</th>
                        <th className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground text-right">Debit (₹)</th>
                        <th className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground text-right">Credit (₹)</th>
                        <th className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground text-right">Balance (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t bg-muted/50 font-medium">
                        <td className="px-2.5 py-1.5">{dateFrom ? formatDate(dateFrom) : '-'}</td>
                        <td className="px-2.5 py-1.5">-</td>
                        <td className="px-2.5 py-1.5">Opening Balance</td>
                        <td className="px-2.5 py-1.5 text-right">
                          {ledger.opening_balance > 0 ? formatCurrency(ledger.opening_balance) : '-'}
                        </td>
                        <td className="px-2.5 py-1.5 text-right">
                          {ledger.opening_balance < 0 ? formatCurrency(Math.abs(ledger.opening_balance)) : '-'}
                        </td>
                        <td className={cn(
                          'px-4 py-3 text-right',
                          ledger.opening_balance > 0 ? 'text-red-500' : ledger.opening_balance < 0 ? 'text-green-500' : ''
                        )}>
                          {formatCurrency(ledger.opening_balance)}
                        </td>
                      </tr>
                      {ledger.entries.map((entry: CustomerLedgerEntry) => (
                        <tr key={entry.id} className="border-t hover:bg-muted/30 transition-colors">
                          <td className="px-2.5 py-1.5">{formatDate(entry.date)}</td>
                          <td className="px-2.5 py-1.5 font-mono text-xs">{entry.reference_id?.slice(0, 8) || '-'}</td>
                          <td className="px-2.5 py-1.5">{entry.description}</td>
                          <td className="px-2.5 py-1.5 text-right">
                            {entry.debit > 0 ? (
                              <span className="text-red-500">{formatCurrency(entry.debit)}</span>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="px-2.5 py-1.5 text-right">
                            {entry.credit > 0 ? (
                              <span className="text-green-500">{formatCurrency(entry.credit)}</span>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className={cn(
                            'px-4 py-3 text-right font-medium',
                            entry.balance > 0 ? 'text-red-500' : entry.balance < 0 ? 'text-green-500' : ''
                          )}>
                            {formatCurrency(entry.balance)}
                          </td>
                        </tr>
                      ))}
                      <tr className="border-t bg-muted/50 font-medium">
                        <td className="px-2.5 py-1.5" colSpan={3}>Closing Balance</td>
                        <td className="px-2.5 py-1.5 text-right text-red-500">{formatCurrency(ledger.total_debit)}</td>
                        <td className="px-2.5 py-1.5 text-right text-green-500">{formatCurrency(ledger.total_credit)}</td>
                        <td className={cn(
                          'px-4 py-3 text-right',
                          ledger.closing_balance > 0 ? 'text-red-500' : ledger.closing_balance < 0 ? 'text-green-500' : ''
                        )}>
                          {formatCurrency(ledger.closing_balance)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
