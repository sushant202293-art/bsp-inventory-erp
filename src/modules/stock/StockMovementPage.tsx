import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { formatDate } from '@/lib/utils';
import { stockService } from '@/services/stock.service';
import type { StockMovement } from '@/types/database.types';
import { Search, ArrowDown, ArrowUp } from 'lucide-react';

export default function StockMovementPage() {
  const [loading, setLoading] = useState(true);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => { loadMovements(); }, []);

  async function loadMovements() {
    setLoading(true);
    try {
      const { movements: rows } = await stockService.getStockMovements(
        search ? { search } : {}
      );
      setMovements(rows);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  const filtered = movements.filter((m) => {
    if (typeFilter !== 'all' && m.type !== typeFilter) return false;
    return true;
  });

  if (loading) return <div className="flex h-96 items-center justify-center"><LoadingSpinner size="lg" text="Loading movements..." /></div>;

  const typeColors: Record<string, string> = {
    purchase: 'success', sales: 'destructive', adjustment_in: 'info', adjustment_out: 'warning',
    transfer_in: 'success', transfer_out: 'destructive', opening: 'secondary',
  };

  const isIn = (type: string) => ['purchase', 'stock_in', 'adjustment_in', 'transfer_in', 'opening', 'sales_return', 'purchase_return'].includes(type);

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-lg font-bold">Stock Movements</h1>
        <p className="text-sm text-muted-foreground">Track all inventory movements</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search by product..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Movement Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="purchase">Purchase</SelectItem>
                <SelectItem value="sales">Sales</SelectItem>
                <SelectItem value="adjustment_in">Adjustment In</SelectItem>
                <SelectItem value="adjustment_out">Adjustment Out</SelectItem>
                <SelectItem value="transfer_in">Transfer In</SelectItem>
                <SelectItem value="transfer_out">Transfer Out</SelectItem>
                <SelectItem value="opening">Opening</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b">
                  <th className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground text-left">Date</th>
                  <th className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground text-left">Product</th>
                  <th className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground text-left">Type</th>
                  <th className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground text-left">Reference</th>
                  <th className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground text-right">Qty In</th>
                  <th className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground text-right">Qty Out</th>
                  <th className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground text-right">Balance</th>
                  <th className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground text-right">Value</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m: any) => (
                  <tr key={m.id} className="border-b hover:bg-muted/50">
                    <td className="px-2.5 py-1.5">{formatDate(m.created_at)}</td>
                    <td className="px-2.5 py-1.5 font-medium">{m.product_name}</td>
                    <td className="px-2.5 py-1.5"><Badge variant={(typeColors[m.type] as any) || 'secondary'}>{m.type}</Badge></td>
                    <td className="px-2.5 py-1.5 text-muted-foreground">{m.reference_type || '-'}</td>
                    <td className="px-2.5 py-1.5 text-right">
                      {isIn(m.type) ? <span className="flex items-center justify-end gap-1 text-green-600"><ArrowDown className="h-3 w-3" />{Math.abs(m.quantity)}</span> : '-'}
                    </td>
                    <td className="px-2.5 py-1.5 text-right">
                      {!isIn(m.type) ? <span className="flex items-center justify-end gap-1 text-red-600"><ArrowUp className="h-3 w-3" />{Math.abs(m.quantity)}</span> : '-'}
                    </td>
                    <td className="px-2.5 py-1.5 text-right font-semibold">{m.balance_after}</td>
                    <td className="px-2.5 py-1.5 text-right">{m.total_value ? `₹${m.total_value.toLocaleString()}` : '-'}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={8} className="p-4 text-center text-muted-foreground">No movements found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
