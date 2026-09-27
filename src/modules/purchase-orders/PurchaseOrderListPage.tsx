import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Plus,
  Eye,
  Edit,
  Printer,
  ArrowRightLeft,
  XCircle,
  MoreHorizontal,
  Package,
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

export default function PurchaseOrderListPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const company = useCompanyView();
  const [orders, setOrders] = useState<TransactionWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const result = await getTransactions('purchase_order', {}, page, 50);
      setOrders(result.transactions);
      setTotal(result.total);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load purchase orders',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [page, toast]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleCancel = async () => {
    if (!cancelId) return;
    setCancelling(true);
    try {
      await cancelTransaction(cancelId);
      toast({ title: 'Success', description: 'Purchase Order cancelled successfully', variant: 'success' });
      setCancelId(null);
      fetchOrders();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to cancel order',
        variant: 'destructive',
      });
    } finally {
      setCancelling(false);
    }
  };

  const handleConvertToPurchase = async (id: string) => {
    try {
      await convertTransaction(id, 'purchase');
      toast({ title: 'Success', description: 'Purchase Order converted to Purchase Invoice', variant: 'success' });
      fetchOrders();
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
    tax_summary: { hsn_sac: string; taxable_value: number; cgst_rate: number; cgst_amount: number; sgst_rate: number; sgst_amount: number; igst_rate: number; igst_amount: number; total: number }[];
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
        <td style="border:1px solid #ddd;padding:6px;text-align:right">${formatCurrency(item.cgst_amount + item.sgst_amount + item.igst_amount)}</td>
        <td style="border:1px solid #ddd;padding:6px;text-align:right;font-weight:bold">${formatCurrency(item.total_amount)}</td>
      </tr>
    `).join('');

    return `<!DOCTYPE html><html><head><title>Purchase Order ${txn.document_number}</title>
      <style>body{font-family:Arial,sans-serif;margin:20px;font-size:12px}table{width:100%;border-collapse:collapse}h2,h3{margin:0}.print-footer{margin-top:30px;border-top:1px solid #ccc;padding-top:10px;font-size:10px;color:#666;text-align:center}</style></head><body>
      <div style="text-align:center;border-bottom:2px solid #333;padding-bottom:10px;margin-bottom:20px">
        <h2>${data.company.name}</h2><p style="margin:2px 0">${data.company.address}</p>
        <p style="margin:2px 0">GSTIN: ${data.company.gstin} | Phone: ${data.company.phone}</p>
      </div>
      <h3 style="text-align:center;margin-bottom:15px">PURCHASE ORDER</h3>
      <table style="margin-bottom:15px"><tr><td><strong>PO No:</strong> ${txn.document_number}</td><td><strong>Date:</strong> ${formatDate(txn.document_date)}</td></tr>
      <tr><td><strong>Supplier:</strong> ${txn.supplier?.name || '-'}</td><td><strong>Ref:</strong> ${txn.reference_number || '-'}</td></tr></table>
      <table><thead><tr style="background:#f0f0f0"><th style="border:1px solid #ddd;padding:6px">Sl</th><th style="border:1px solid #ddd;padding:6px">Code</th><th style="border:1px solid #ddd;padding:6px">Item</th><th style="border:1px solid #ddd;padding:6px">Qty</th><th style="border:1px solid #ddd;padding:6px">Rate</th><th style="border:1px solid #ddd;padding:6px">Taxable</th><th style="border:1px solid #ddd;padding:6px">GST</th><th style="border:1px solid #ddd;padding:6px">Tax Amt</th><th style="border:1px solid #ddd;padding:6px">Total</th></tr></thead><tbody>${itemRows}</tbody></table>
      <div style="display:flex;justify-content:space-between;margin-top:15px">
        <div style="max-width:60%"><strong>Amount in Words:</strong><br/>${data.amount_in_words}</div>
        <div><table><tr><td style="text-align:right"><strong>Subtotal:</strong></td><td style="text-align:right">${formatCurrency(txn.subtotal)}</td></tr>
        <tr><td style="text-align:right"><strong>Tax:</strong></td><td style="text-align:right">${formatCurrency(txn.tax_amount)}</td></tr>
        <tr><td style="text-align:right"><strong>Round Off:</strong></td><td style="text-align:right">${formatCurrency(txn.round_off)}</td></tr>
        <tr><td style="text-align:right"><strong>Grand Total:</strong></td><td style="text-align:right;font-size:14px;font-weight:bold">${formatCurrency(txn.grand_total)}</td></tr></table></div>
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:40px"><div></div><div style="text-align:center"><p>For ${company.name}</p><br/><br/><p>Authorized Signatory</p></div></div>
      <div class="print-footer">This is a computer generated Purchase Order and does not require a signature.</div></body></html>`;
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
      accessorKey: 'supplier',
      header: 'Supplier',
      cell: ({ row }) => row.original.supplier?.name || '-',
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
      id: 'expected_delivery',
      header: 'Delivery Date',
      cell: ({ row }) => {
        const delivery = (row.original as unknown as { expected_delivery_date?: string }).expected_delivery_date;
        return delivery ? formatDate(delivery) : '-';
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const order = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate(`/purchase-orders/${order.id}`)}>
                <Eye className="mr-2 h-4 w-4" />
                View
              </DropdownMenuItem>
              {order.status === 'draft' && (
                <DropdownMenuItem onClick={() => navigate(`/purchase-orders/${order.id}/edit`)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => handlePrint(order.id)}>
                <Printer className="mr-2 h-4 w-4" />
                Print
              </DropdownMenuItem>
              {order.status === 'draft' && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleConvertToPurchase(order.id)}>
                    <ArrowRightLeft className="mr-2 h-4 w-4" />
                    Convert to Purchase
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setCancelId(order.id)}
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
    const headers = ['Doc No,Date,Supplier,Subtotal,Tax,Total,Status'];
    const rows = data.map(
      (o) =>
        `${o.document_number},${formatDate(o.document_date)},${o.supplier?.name || ''},${o.subtotal},${o.tax_amount},${o.grand_total},${o.status}`
    );
    const blob = new Blob([headers.concat(rows).join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'purchase-orders.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <PageHeader
        title="Purchase Orders"
        description={`Manage all purchase orders (${total} total)`}
        breadcrumbs={[
          { label: 'Home', onClick: () => navigate('/') },
          { label: 'Purchase Orders' },
        ]}
        actions={
          <Button onClick={() => navigate('/purchase-orders/new')}>
            <Plus className="mr-2 h-4 w-4" />
            New Purchase Order
          </Button>
        }
      />

      {!loading && orders.length === 0 ? (
        <EmptyState
          icon={<Package className="h-8 w-8" />}
          title="No Purchase Orders"
          description="Create your first purchase order to start tracking purchases from suppliers."
          action={{
            label: 'Create Purchase Order',
            onClick: () => navigate('/purchase-orders/new'),
          }}
        />
      ) : (
        <DataTable
          columns={columns}
          data={orders}
          searchKey="document_number"
          searchPlaceholder="Search by PO number..."
          loading={loading}
          emptyTitle="No purchase orders found"
          emptyDescription="Try adjusting your search criteria."
          onExportCSV={handleExportCSV}
        />
      )}

      <ConfirmDialog
        open={!!cancelId}
        onOpenChange={() => setCancelId(null)}
        title="Cancel Purchase Order"
        description="Are you sure you want to cancel this purchase order? This action cannot be undone."
        confirmLabel="Cancel Order"
        variant="danger"
        onConfirm={handleCancel}
        loading={cancelling}
      />
    </motion.div>
  );
}
