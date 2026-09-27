import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Package, TrendingUp, AlertTriangle, Search, Filter, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { formatCurrency } from '@/lib/utils';
import { stockService } from '@/services/stock.service';

export default function StockOverviewPage() {
  const [loading, setLoading] = useState(true);
  const [stock, setStock] = useState<any[]>([]);
  const [summary, setSummary] = useState({ total_products: 0, total_qty: 0, total_value: 0, low_stock: 0 });
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => { loadStock(); }, []);

  async function loadStock() {
    setLoading(true);
    try {
      const data = await stockService.getStockSummary({});
      setStock(data || []);
      const total_value = data.reduce((sum: number, s: any) => sum + (s.stock_value || 0), 0);
      const total_qty = data.reduce((sum: number, s: any) => sum + (s.current_stock || 0), 0);
      const low_stock = data.filter((s: any) => s.current_stock <= (s.low_stock_level || 0)).length;
      setSummary({ total_products: data.length, total_qty, total_value, low_stock });
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  const filtered = stock.filter((s: any) => {
    if (search && !s.name?.toLowerCase().includes(search.toLowerCase()) && !s.code?.toLowerCase().includes(search.toLowerCase())) return false;
    if (categoryFilter !== 'all' && s.category !== categoryFilter) return false;
    if (statusFilter === 'low' && s.current_stock > (s.low_stock_level || 0)) return false;
    if (statusFilter === 'out' && s.current_stock > 0) return false;
    return true;
  });

  if (loading) return <div className="flex h-96 items-center justify-center"><LoadingSpinner size="lg" text="Loading stock..." /></div>;

  const stats = [
    { label: 'Total Products', value: summary.total_products, icon: Package, color: 'from-blue-500 to-cyan-400' },
    { label: 'Total Stock Qty', value: summary.total_qty.toLocaleString(), icon: TrendingUp, color: 'from-green-500 to-emerald-400' },
    { label: 'Stock Value', value: formatCurrency(summary.total_value), icon: Package, color: 'from-purple-500 to-pink-400' },
    { label: 'Low Stock Items', value: summary.low_stock, icon: AlertTriangle, color: 'from-amber-500 to-orange-400' },
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Stock Overview</h1>
          <p className="text-sm text-muted-foreground">Current inventory status across all products</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card className="relative overflow-hidden">
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-5`} />
              <CardContent className="relative p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="mt-2 text-2xl font-bold">{stat.value}</p>
                  </div>
                  <div className={`rounded-lg bg-gradient-to-br ${stat.color} p-3 text-white`}>
                    <stat.icon className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Stock Details</CardTitle>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 w-64" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="low">Low Stock</SelectItem>
                  <SelectItem value="out">Out of Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="p-3 text-left font-medium">Code</th>
                  <th className="p-3 text-left font-medium">Product</th>
                  <th className="p-3 text-left font-medium">Category</th>
                  <th className="p-3 text-left font-medium">Brand</th>
                  <th className="p-3 text-right font-medium">Stock</th>
                  <th className="p-3 text-right font-medium">Avg Cost</th>
                  <th className="p-3 text-right font-medium">Value</th>
                  <th className="p-3 text-center font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item: any) => (
                  <tr key={item.id} className="border-b hover:bg-muted/50">
                    <td className="p-3 font-mono text-xs">{item.code}</td>
                    <td className="p-3 font-medium">{item.name}</td>
                    <td className="p-3 text-muted-foreground">{item.category || '-'}</td>
                    <td className="p-3 text-muted-foreground">{item.brand || '-'}</td>
                    <td className="p-3 text-right font-semibold">{item.current_stock}</td>
                    <td className="p-3 text-right">{formatCurrency(item.avg_cost || 0)}</td>
                    <td className="p-3 text-right font-semibold">{formatCurrency(item.stock_value || 0)}</td>
                    <td className="p-3 text-center">
                      <Badge variant={item.current_stock === 0 ? 'destructive' : item.current_stock <= (item.low_stock_level || 0) ? 'warning' : 'success'}>
                        {item.current_stock === 0 ? 'Out' : item.current_stock <= (item.low_stock_level || 0) ? 'Low' : 'In Stock'}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">No stock data found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
