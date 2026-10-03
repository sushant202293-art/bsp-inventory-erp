import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Eye,
  Edit,
  Printer,
  ArrowRightLeft,
  XCircle,
  MoreHorizontal,
  FileText,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/use-toast';
import { useCompanyView } from '@/contexts/CompanyContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  getTransactions,
  cancelTransaction,
  convertTransaction,
  printTransaction,
} from '@/services/transaction.service';
import type { TransactionWithRelations } from '@/types/transaction.types';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { ColumnDef } from '@tanstack/react-table';

const statusColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info'> = {
  draft: 'secondary',
  confirmed: 'info',
  approved: 'success',
  cancelled: 'destructive',
  paid: 'success',
  partial: 'warning',
};

export default function ProformaInvoiceListPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const company = useCompanyView();
  const [invoices, setInvoices] = useState<TransactionWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const result = await getTransactions('proforma_invoice', {}, page, 50);
      setInvoices(result.transactions);
      setTotal(result.total);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load proforma invoices',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [page, toast]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleCancel = async () => {
    if (!cancelId) return;
    setCancelling(true);
    try {
      await cancelTransaction(cancelId);
      toast({ title: 'Success', description: 'Proforma Invoice cancelled successfully', variant: 'success' });
      setCancelId(null);
      fetchInvoices();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to cancel',
        variant: 'destructive',
      });
    } finally {
      setCancelling(false);
    }
  };

  const handleConvertToSale = async (id: string) => {
    try {
      await convertTransaction(id, 'sale');
      toast({ title: 'Success', description: 'Converted to Sales Invoice', variant: 'success' });
      fetchInvoices();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to convert',
        variant: 'destructive',
      });
    }
  };

  const handlePrint = async (id: string) => {
    try {
      const printData = await printTransaction(id);
      const printWindow = window.open('', '_blank');
      if (!printWindow) return;
      printWindow.document.write(generatePrintHTML(printData));
      printWindow.document.close();
      printWindow.print();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to generate print',
        variant: 'destructive',
      });
    }
  };

  const generatePrintHTML = (data: {
    company: { name: string; address: string; state: string; phone: string; email: string; gstin: string };
    transaction: TransactionWithRelations;
    items: { product_name: string; product_code: string | null; quantity: number; unit: string | null; rate: number; discount_amount: number; taxable_value: number; gst_rate: number; cgst_amount: number; sgst_amount: number; igst_amount: number; total_amount: number }[];
    amount_in_words: string;
  }) => {
    const txn = data.transaction;
    const items = data.items;
    const itemRows = items.map((item, idx) => `
      <tr>
        <td style="border:1px solid #ddd;padding:6px;text-align:center">${idx + 1}</td>
        <td style="border:1px solid #ddd;padding:6px">${item.product_code || '-'}</td>
        <td style="border:1px solid #ddd;padding:6px">${item.product_name}</td>
        <td style="border:1px solid #ddd;padding:6px;text-align:right">${item.quantity} ${item.unit || ''}</td>
        <td style="border:1px solid #ddd;padding:6px;text-align:right">${formatCurrency(item.rate)}</td>
        <td style="border:1px solid #ddd;padding:6px;text-align:right">${formatCurrency(item.taxable_value)}</td>
        <td style="border:1px solid #ddd;padding:6px;text-align:right">${item.gst_rate}%</td>
        <td style="border:1px solid #ddd;padding:6px;text-align:right;font-weight:bold">${formatCurrency(item.total_amount)}</td>
      </tr>
    `).join('');

    const validUntil = (txn as unknown as { valid_until?: string }).valid_until;

    return `<!DOCTYPE html><html><head><title>Proforma Invoice ${txn.document_number}</title>
      <style>body{font-family:Arial,sans-serif;margin:20px;font-size:12px}table{width:100%;border-collapse:collapse}h2,h3{margin:0}</style></head><body>
      <div style="text-align:center;border-bottom:2px solid #333;padding-bottom:10px;margin-bottom:20px">
        <h2>${data.company.name}</h2><p style="margin:2px 0">${data.company.address}</p>
        <p style="margin:2px 0">GSTIN: ${data.company.gstin} | Phone: ${data.company.phone}</p>
      </div>
      <h3 style="text-align:center;margin-bottom:15px">PROFORMA INVOICE</h3>
      <p><strong>PI No:</strong> ${txn.document_number} | <strong>Date:</strong> ${formatDate(txn.document_date)}${validUntil ? ` | <strong>Valid Until:</strong> ${formatDate(validUntil)}` : ''}</p>
      <p><strong>Customer:</strong> ${txn.customer?.name || '-'} | <strong>GSTIN:</strong> ${txn.customer?.gstin || '-'}</p>
      <table><thead><tr style="background:#f0f0f0"><th style="border:1px solid #ddd;padding:6px">Sl</th><th style="border:1px solid #ddd;padding:6px">Code</th><th style="border:1px solid #ddd;padding:6px">Item</th><th style="border:1px solid #ddd;padding:6px">Qty</th><th style="border:1px solid #ddd;padding:6px">Rate</th><th style="border:1px solid #ddd;padding:6px">Taxable</th><th style="border:1px solid #ddd;padding:6px">GST</th><th style="border:1px solid #ddd;padding:6px">Total</th></tr></thead><tbody>${itemRows}</tbody></table>
      <div style="display:flex;justify-content:space-between;margin-top:15px">
        <div style="max-width:60%"><strong>Amount in Words:</strong><br/>${data.amount_in_words}</div>
        <div><table><tr><td style="text-align:right"><strong>Subtotal:</strong></td><td style="text-align:right">${formatCurrency(txn.subtotal)}</td></tr>
        <tr><td style="text-align:right"><strong>Tax:</strong></td><td style="text-align:right">${formatCurrency(txn.tax_amount)}</td></tr>
        <tr><td style="text-align:right"><strong>Round Off:</strong></td><td style="text-align:right">${formatCurrency(txn.round_off)}</td></tr>
        <tr><td style="text-align:right"><strong>Grand Total:</strong></td><td style="text-align:right;font-size:14px;font-weight:bold">${formatCurrency(txn.grand_total)}</td></tr></table></div>
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:40px"><div></div><div style="text-align:center"><p>For ${company.name}</p><br/><br/><p>Authorized Signatory</p></div></div>
      <p style="margin-top:20px;font-size:10px;color:#666;text-align:center">This is a computer generated Proforma Invoice and does not require a signature.</p></body></html>`;
  };

  const columns: ColumnDef<TransactionWithRelations, unknown>[] = [
    {
      accessorKey: 'document_number',
      header: 'Doc No',
      cell: ({ row }) => (
        <span className="font-medium text-primary">{row.original.document_number}</span>
      ),
    },
    {
      accessorKey: 'document_date',
      header: 'Date',
      cell: ({ row }) => formatDate(row.original.document_date),
    },
    {
      accessorKey: 'customer',
      header: 'Customer',
      cell: ({ row }) => row.original.customer?.name || '-',
    },
    {
      id: 'items',
      header: 'Items',
      cell: ({ row }) => row.original.items?.length || 0,
    },
    {
      accessorKey: 'subtotal',
      header: 'Subtotal',
      cell: ({ row }) => formatCurrency(row.original.subtotal),
    },
    {
      accessorKey: 'tax_amount',
      header: 'Tax',
      cell: ({ row }) => formatCurrency(row.original.tax_amount),
    },
    {
      accessorKey: 'grand_total',
      header: 'Total',
      cell: ({ row }) => <span className="font-semibold">{formatCurrency(row.original.grand_total)}</span>,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={statusColors[row.original.status] || 'secondary'}>
          {row.original.status.charAt(0).toUpperCase() + row.original.status.slice(1)}
        </Badge>
      ),
    },
    {
      id: 'valid_until',
      header: 'Valid Until',
      cell: ({ row }) => {
        const validUntil = (row.original as unknown as { valid_until?: string }).valid_until;
        return validUntil ? formatDate(validUntil) : '-';
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const invoice = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate(`/proforma-invoices/${invoice.id}`)}>
                <Eye className="mr-2 h-4 w-4" />
                View
              </DropdownMenuItem>
              {invoice.status === 'draft' && (
                <DropdownMenuItem onClick={() => navigate(`/proforma-invoices/${invoice.id}/edit`)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => handlePrint(invoice.id)}>
                <Printer className="mr-2 h-4 w-4" />
                Print
              </DropdownMenuItem>
              {invoice.status === 'draft' && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleConvertToSale(invoice.id)}>
                    <ArrowRightLeft className="mr-2 h-4 w-4" />
                    Convert to Sales Invoice
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setCancelId(invoice.id)}
                    className="text-destructive"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Cancel
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const handleExportCSV = (data: TransactionWithRelations[]) => {
    const headers = ['Doc No,Date,Customer,Subtotal,Tax,Total,Status'];
    const rows = data.map(
      (inv) =>
        `${inv.document_number},${formatDate(inv.document_date)},${inv.customer?.name || ''},${inv.subtotal},${inv.tax_amount},${inv.grand_total},${inv.status}`
    );
    const blob = new Blob([headers.concat(rows).join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'proforma-invoices.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3">
      <PageHeader
        title="Proforma Invoices"
        description={`Manage all proforma invoices (${total} total)`}
        breadcrumbs={[
          { label: 'Home', onClick: () => navigate('/') },
          { label: 'Proforma Invoices' },
        ]}
        actions={
          <Button onClick={() => navigate('/proforma-invoices/new')}>
            <Plus className="mr-2 h-4 w-4" />
            New Proforma Invoice
          </Button>
        }
      />

      {!loading && invoices.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-8 w-8" />}
          title="No Proforma Invoices"
          description="Create your first proforma invoice to start sending preliminary bills to customers."
          action={{
            label: 'Create Proforma Invoice',
            onClick: () => navigate('/proforma-invoices/new'),
          }}
        />
      ) : (
        <DataTable
          columns={columns}
          data={invoices}
          searchKey="document_number"
          searchPlaceholder="Search by PI number..."
          loading={loading}
          emptyTitle="No proforma invoices found"
          emptyDescription="Try adjusting your search criteria."
          onExportCSV={handleExportCSV}
        />
      )}

      <ConfirmDialog
        open={!!cancelId}
        onOpenChange={() => setCancelId(null)}
        title="Cancel Proforma Invoice"
        description="Are you sure you want to cancel this proforma invoice? This action cannot be undone."
        confirmLabel="Cancel Invoice"
        variant="danger"
        onConfirm={handleCancel}
        loading={cancelling}
      />
    </div>
  );
}
