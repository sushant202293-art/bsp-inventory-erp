import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { stockService } from '@/services/stock.service';
import { formatCurrency } from '@/lib/utils';
import { AlertTriangle, Search, ShoppingCart } from 'lucide-react';

export default function LowStockPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => { loadLowStock(); }, []);

  async function loadLowStock() {
    setLoading(true);
    try {
      const data = await stockService.getLowStockProducts();
      setItems(data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  const filtered = items.filter((item) => {
    if (search && !item.name?.toLowerCase().includes(search.toLowerCase()) && !item.code?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (loading) return <div className="flex h-96 items-center justify-center"><LoadingSpinner size="lg" text="Loading low stock..." /></div>;

  function getSeverity(stock: number, low: number, reorder: number) {
    if (stock === 0) return { label: 'Out of Stock', variant: 'destructive' as const };
    if (stock <= low * 0.5) return { label: 'Critical', variant: 'destructive' as const };
    if (stock <= low) return { label: 'Low', variant: 'warning' as const };
    return { label: 'Warning', variant: 'secondary' as const };
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" /> Low Stock Items</h1>
          <p className="text-sm text-muted-foreground">{items.length} products below reorder level</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 max-w-sm" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b">
                  <th className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground text-left">Product</th>
                  <th className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground text-left">Code</th>
                  <th className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground text-right">Current Stock</th>
                  <th className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground text-right">Low Level</th>
                  <th className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground text-right">Reorder Level</th>
                  <th className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground text-right">Suggested Qty</th>
                  <th className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground text-center">Status</th>
                  <th className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item: any) => {
                  const severity = getSeverity(item.current_stock, item.low_stock_level || 0, item.reorder_level || 0);
                  const suggested = Math.max(0, (item.reorder_level || 0) - item.current_stock);
                  return (
                    <tr key={item.id} className="border-b hover:bg-muted/50">
                      <td className="px-2.5 py-1.5 font-medium">{item.name}</td>
                      <td className="px-2.5 py-1.5 font-mono text-xs">{item.code}</td>
                      <td className="px-2.5 py-1.5 text-right font-semibold">{item.current_stock}</td>
                      <td className="px-2.5 py-1.5 text-right text-muted-foreground">{item.low_stock_level}</td>
                      <td className="px-2.5 py-1.5 text-right text-muted-foreground">{item.reorder_level}</td>
                      <td className="px-2.5 py-1.5 text-right font-semibold">{suggested}</td>
                      <td className="px-2.5 py-1.5 text-center"><Badge variant={severity.variant}>{severity.label}</Badge></td>
                      <td className="px-2.5 py-1.5 text-center">
                        <Link to={`/purchase-orders/new?product=${item.id}`}>
                          <Button size="sm" variant="outline"><ShoppingCart className="mr-1 h-3 w-3" /> Create PO</Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={8} className="p-4 text-center text-muted-foreground">No low stock items found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
