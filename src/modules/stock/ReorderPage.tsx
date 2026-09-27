import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { stockService } from '@/services/stock.service';
import { formatCurrency } from '@/lib/utils';
import { RefreshCw, Search, ShoppingCart } from 'lucide-react';

export default function ReorderPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => { loadReorder(); }, []);

  async function loadReorder() {
    setLoading(true);
    try {
      const data = await stockService.getReorderProducts();
      setItems(data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  const filtered = items.filter((item) => {
    if (search && !item.name?.toLowerCase().includes(search.toLowerCase()) && !item.code?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (loading) return <div className="flex h-96 items-center justify-center"><LoadingSpinner size="lg" text="Loading reorder data..." /></div>;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><RefreshCw className="h-6 w-6 text-blue-500" /> Reorder Requirements</h1>
          <p className="text-sm text-muted-foreground">{items.length} products require replenishment</p>
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
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="p-3 text-left font-medium">Product</th>
                  <th className="p-3 text-left font-medium">Code</th>
                  <th className="p-3 text-right font-medium">Current Stock</th>
                  <th className="p-3 text-right font-medium">Reorder Level</th>
                  <th className="p-3 text-right font-medium">Reorder Target</th>
                  <th className="p-3 text-right font-medium">Suggested Qty</th>
                  <th className="p-3 text-center font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item: any) => {
                  const suggested = Math.max(0, (item.reorder_level || 0) - item.current_stock);
                  return (
                    <tr key={item.id} className="border-b hover:bg-muted/50">
                      <td className="p-3 font-medium">{item.name}</td>
                      <td className="p-3 font-mono text-xs">{item.code}</td>
                      <td className="p-3 text-right font-semibold">{item.current_stock}</td>
                      <td className="p-3 text-right text-muted-foreground">{item.reorder_level}</td>
                      <td className="p-3 text-right text-muted-foreground">{item.reorder_level}</td>
                      <td className="p-3 text-right font-bold text-primary">{suggested}</td>
                      <td className="p-3 text-center">
                        <Link to={`/purchase-orders/new?product=${item.id}`}>
                          <Button size="sm"><ShoppingCart className="mr-1 h-3 w-3" /> Create PO</Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No reorder requirements found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
