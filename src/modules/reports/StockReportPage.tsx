import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { getProducts } from '@/services/product.service';
import { formatCurrency, cn } from '@/lib/utils';
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
import type { ProductWithRelations } from '@/types/product.types';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface Filters {
  search: string;
  categoryId: string;
  brandId: string;
  stockStatus: string;
}

export default function StockReportPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ProductWithRelations[]>([]);
  const [filters, setFilters] = useState<Filters>({
    search: '',
    categoryId: '',
    brandId: '',
    stockStatus: '',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const filterOpts: Record<string, unknown> = {};
      if (filters.search) filterOpts.search = filters.search;
      if (filters.categoryId) filterOpts.category_id = filters.categoryId;
      if (filters.brandId) filterOpts.brand_id = filters.brandId;
      if (filters.stockStatus === 'out_of_stock') filterOpts.out_of_stock = true;
      else if (filters.stockStatus === 'low_stock') filterOpts.low_stock = true;

      const result = await getProducts(filterOpts, 1, 1000);
      let filtered = result.products;

      if (filters.stockStatus === 'in_stock') {
        filtered = filtered.filter((p) => (p.total_stock || 0) > (p.low_stock_level || 0));
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

  const summary = {
    totalProducts: data.length,
    totalQty: data.reduce((s, p) => s + (p.total_stock || 0), 0),
    totalValue: data.reduce((s, p) => s + (p.total_stock || 0) * p.purchase_price, 0),
    totalSellingValue: data.reduce((s, p) => s + (p.total_stock || 0) * p.selling_price, 0),
    lowStock: data.filter((p) => (p.total_stock || 0) > 0 && (p.total_stock || 0) <= (p.low_stock_level || 0)).length,
    outOfStock: data.filter((p) => (p.total_stock || 0) <= 0).length,
  };

  const getStockBadge = (product: ProductWithRelations) => {
    const qty = product.total_stock || 0;
    if (qty <= 0) return <Badge className="bg-red-100 text-red-800 text-xs">Out of Stock</Badge>;
    if (qty <= (product.low_stock_level || 0)) return <Badge className="bg-yellow-100 text-yellow-800 text-xs">Low Stock</Badge>;
    return <Badge className="bg-green-100 text-green-800 text-xs">In Stock</Badge>;
  };

  const exportToPDF = () => {
    const doc = new jsPDF('landscape', 'mm', 'a4');
    doc.setFontSize(16);
    doc.text('Stock Summary Report', 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated: ${format(new Date(), 'dd-MM-yyyy HH:mm')}`, 14, 22);

    const body = data.map((p) => [
      p.code,
      p.name,
      p.category?.name || '-',
      p.brand?.name || '-',
      (p.total_stock || 0).toString(),
      p.low_stock_level.toString(),
      formatCurrency(p.purchase_price),
      formatCurrency(p.selling_price),
      formatCurrency((p.total_stock || 0) * p.purchase_price),
      (p.total_stock || 0) <= 0 ? 'Out of Stock' : (p.total_stock || 0) <= (p.low_stock_level || 0) ? 'Low Stock' : 'In Stock',
    ]);

    (doc as jsPDF & { autoTable: (opts: Record<string, unknown>) => void }).autoTable({
      startY: 26,
      head: [['Code', 'Product', 'Category', 'Brand', 'Qty', 'Min', 'Purchase Price', 'Selling Price', 'Value', 'Status']],
      body,
      theme: 'grid',
      styles: { fontSize: 7 },
      headStyles: { fillColor: [59, 130, 246] },
      columnStyles: { 4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right' }, 7: { halign: 'right' }, 8: { halign: 'right' } },
      margin: { left: 14 },
      didDrawPage: (pageData: Record<string, unknown>) => {
        doc.setFontSize(9);
        doc.text(`Total Qty: ${summary.totalQty} | Total Value: ${formatCurrency(summary.totalValue)}`, 14, (pageData as { pageHeight: number }).pageHeight - 10);
      },
    });

    doc.save(`stock-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const exportToExcel = () => {
    const wsData = [
      ['Code', 'Product', 'Category', 'Brand', 'Qty', 'Min Level', 'Purchase Price', 'Selling Price', 'Stock Value', 'Status'],
      ...data.map((p) => [
        p.code, p.name, p.category?.name || '', p.brand?.name || '',
        p.total_stock || 0, p.low_stock_level, p.purchase_price, p.selling_price,
        (p.total_stock || 0) * p.purchase_price,
        (p.total_stock || 0) <= 0 ? 'Out of Stock' : (p.total_stock || 0) <= (p.low_stock_level || 0) ? 'Low Stock' : 'In Stock',
      ]),
      [],
      ['', '', '', 'TOTALS:', summary.totalQty, '', '', '', summary.totalValue, ''],
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [{ wch: 12 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 8 }, { wch: 8 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 12 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Stock Report');
    XLSX.writeFile(wb, `stock-report-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const exportToCSV = () => {
    const headers = ['Code', 'Product', 'Category', 'Brand', 'Qty', 'Min Level', 'Purchase Price', 'Selling Price', 'Stock Value', 'Status'];
    const rows = data.map((p) => [
      p.code, p.name, p.category?.name || '', p.brand?.name || '',
      p.total_stock || 0, p.low_stock_level, p.purchase_price, p.selling_price,
      (p.total_stock || 0) * p.purchase_price,
      (p.total_stock || 0) <= 0 ? 'Out of Stock' : (p.total_stock || 0) <= (p.low_stock_level || 0) ? 'Low Stock' : 'In Stock',
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `stock-report-${format(new Date(), 'yyyy-MM-dd')}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <ReportLayout
      title="Stock Summary Report"
      description={`Showing ${data.length} products`}
      onExportPDF={exportToPDF}
      onExportExcel={exportToExcel}
      onExportCSV={exportToCSV}
      filters={
        <div className="flex flex-wrap gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Search</label>
            <Input placeholder="Search products..." value={filters.search} onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))} className="w-[200px]" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Stock Status</label>
            <Select value={filters.stockStatus} onValueChange={(v) => setFilters((f) => ({ ...f, stockStatus: v }))}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Status</SelectItem>
                <SelectItem value="in_stock">In Stock</SelectItem>
                <SelectItem value="low_stock">Low Stock</SelectItem>
                <SelectItem value="out_of_stock">Out of Stock</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button variant="secondary" onClick={fetchData}>Apply</Button>
          </div>
        </div>
      }
      summary={
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-right">
          <div><p className="text-xs text-muted-foreground">Products</p><p className="text-lg font-bold">{summary.totalProducts}</p></div>
          <div><p className="text-xs text-muted-foreground">Total Qty</p><p className="text-lg font-bold">{summary.totalQty}</p></div>
          <div><p className="text-xs text-muted-foreground">Total Value</p><p className="text-lg font-bold text-primary">{formatCurrency(summary.totalValue)}</p></div>
          <div><p className="text-xs text-muted-foreground">Low / Out</p><p className="text-lg font-bold"><span className="text-yellow-500">{summary.lowStock}</span> / <span className="text-red-500">{summary.outOfStock}</span></p></div>
        </div>
      }
    >
      {loading ? (
        <div className="p-4 space-y-3">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Min Level</TableHead>
              <TableHead className="text-right">Purchase Price</TableHead>
              <TableHead className="text-right">Stock Value</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="h-24 text-center text-muted-foreground">No products found</TableCell></TableRow>
            ) : (
              data.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-sm">{p.code}</TableCell>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>{p.category?.name || '-'}</TableCell>
                  <TableCell>{p.brand?.name || '-'}</TableCell>
                  <TableCell className="text-right font-mono">{p.total_stock || 0}</TableCell>
                  <TableCell className="text-right font-mono">{p.low_stock_level}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(p.purchase_price)}</TableCell>
                  <TableCell className="text-right font-mono font-semibold">{formatCurrency((p.total_stock || 0) * p.purchase_price)}</TableCell>
                  <TableCell>{getStockBadge(p)}</TableCell>
                </TableRow>
              ))
            )}
            {data.length > 0 && (
              <TableRow className="bg-muted/50 font-bold">
                <TableCell colSpan={4}>TOTAL</TableCell>
                <TableCell className="text-right font-mono">{summary.totalQty}</TableCell>
                <TableCell />
                <TableCell />
                <TableCell className="text-right font-mono">{formatCurrency(summary.totalValue)}</TableCell>
                <TableCell />
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </ReportLayout>
  );
}
