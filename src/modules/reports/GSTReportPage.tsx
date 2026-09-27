import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { reportService } from '@/services/report.service';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useCompany } from '@/contexts/CompanyContext';
import { Printer, Download } from 'lucide-react';

export default function GSTReportPage() {
  const { company } = useCompany();
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [to, setTo] = useState(new Date().toISOString().split('T')[0]);
  const [data, setData] = useState<any>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadReport(); }, [from, to]);

  async function loadReport() {
    setLoading(true);
    try {
      const result = await reportService.getGSTSummary({ date_from: from, date_to: to });
      setData(result);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  function handlePrint() {
    const content = printRef.current;
    if (!content) return;
    const w = window.open('', '_blank');
    w?.document.write(`<html><head><title>GST Report</title><style>body{font-family:sans-serif;padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f5f5f5}.text-right{text-align:right}.font-bold{font-weight:bold}.mb-2{margin-bottom:8px}.text-lg{font-size:18px}</style></head><body>${content.innerHTML}</body></html>`);
    w?.document.close();
    w?.print();
  }

  if (loading) return <div className="flex h-96 items-center justify-center"><LoadingSpinner size="lg" text="Loading report..." /></div>;

  const sales = data?.sales || { total: 0, cgst: 0, sgst: 0, igst: 0 };
  const purchases = data?.purchases || { total: 0, cgst: 0, sgst: 0, igst: 0 };
  const netPayable = {
    cgst: sales.cgst - purchases.cgst,
    sgst: sales.sgst - purchases.sgst,
    igst: sales.igst - purchases.igst,
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">GST Summary Report</h1><p className="text-sm text-muted-foreground">Tax collected vs tax paid</p></div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint}><Printer className="mr-2 h-4 w-4" /> Print</Button>
        </div>
      </div>

      <Card><CardContent className="p-4 flex gap-4">
        <div className="space-y-1"><Label>Date From</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div className="space-y-1"><Label>Date To</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
      </CardContent></Card>

      <div ref={printRef}>
        <Card className="print:shadow-none">
          <CardHeader><CardTitle className="text-lg">{company?.name || 'Company'} — GST Summary</CardTitle><p className="text-sm text-muted-foreground">Period: {formatDate(from)} to {formatDate(to)}</p></CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="mb-2 font-semibold">Sales (Output Tax)</h3>
              <table className="w-full text-sm">
                <thead><tr className="border-b"><th className="p-2 text-left">Description</th><th className="p-2 text-right">Amount</th></tr></thead>
                <tbody>
                  <tr className="border-b"><td className="p-2">Taxable Sales</td><td className="p-2 text-right">{formatCurrency(sales.total)}</td></tr>
                  <tr className="border-b"><td className="p-2">CGST Collected</td><td className="p-2 text-right">{formatCurrency(sales.cgst)}</td></tr>
                  <tr className="border-b"><td className="p-2">SGST Collected</td><td className="p-2 text-right">{formatCurrency(sales.sgst)}</td></tr>
                  <tr className="border-b"><td className="p-2">IGST Collected</td><td className="p-2 text-right">{formatCurrency(sales.igst)}</td></tr>
                  <tr className="font-bold"><td className="p-2">Total Output Tax</td><td className="p-2 text-right">{formatCurrency(sales.cgst + sales.sgst + sales.igst)}</td></tr>
                </tbody>
              </table>
            </div>

            <div>
              <h3 className="mb-2 font-semibold">Purchases (Input Tax)</h3>
              <table className="w-full text-sm">
                <thead><tr className="border-b"><th className="p-2 text-left">Description</th><th className="p-2 text-right">Amount</th></tr></thead>
                <tbody>
                  <tr className="border-b"><td className="p-2">Taxable Purchases</td><td className="p-2 text-right">{formatCurrency(purchases.total)}</td></tr>
                  <tr className="border-b"><td className="p-2">CGST Paid</td><td className="p-2 text-right">{formatCurrency(purchases.cgst)}</td></tr>
                  <tr className="border-b"><td className="p-2">SGST Paid</td><td className="p-2 text-right">{formatCurrency(purchases.sgst)}</td></tr>
                  <tr className="border-b"><td className="p-2">IGST Paid</td><td className="p-2 text-right">{formatCurrency(purchases.igst)}</td></tr>
                  <tr className="font-bold"><td className="p-2">Total Input Tax</td><td className="p-2 text-right">{formatCurrency(purchases.cgst + purchases.sgst + purchases.igst)}</td></tr>
                </tbody>
              </table>
            </div>

            <div>
              <h3 className="mb-2 font-semibold">Net Tax Payable</h3>
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b"><td className="p-2">Net CGST Payable</td><td className="p-2 text-right font-bold">{formatCurrency(netPayable.cgst)}</td></tr>
                  <tr className="border-b"><td className="p-2">Net SGST Payable</td><td className="p-2 text-right font-bold">{formatCurrency(netPayable.sgst)}</td></tr>
                  <tr className="border-b"><td className="p-2">Net IGST Payable</td><td className="p-2 text-right font-bold">{formatCurrency(netPayable.igst)}</td></tr>
                  <tr className="bg-muted"><td className="p-2 font-bold">Total Net Payable</td><td className="p-2 text-right font-bold text-lg">{formatCurrency(netPayable.cgst + netPayable.sgst + netPayable.igst)}</td></tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
