import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import type { ProductWithRelations } from '@/types/product.types';
import { stockService, type WarehouseOption } from '@/services/stock.service';
import { useNavigate } from 'react-router-dom';
import { ArrowDownCircle, ArrowUpCircle } from 'lucide-react';

export default function StockAdjustmentPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState('');
  const [productId, setProductId] = useState('');
  const [type, setType] = useState<'adjustment_in' | 'adjustment_out'>('adjustment_in');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [productResults, setProductResults] = useState<ProductWithRelations[]>([]);

  useEffect(() => {
    stockService.getWarehouses()
      .then((rows) => {
        setWarehouses(rows);
        const preferred = rows.find((w) => w.is_default) ?? rows[0];
        if (preferred) setWarehouseId(preferred.id);
      })
      .catch((e) => console.error(e));
  }, []);

  async function searchProducts(q: string) {
    setProduct(q);
    if (q.length < 2) { setProductResults([]); return; }
    try {
      const { productService } = await import('@/services/product.service');
      const { products } = await productService.getProducts({ search: q, limit: 10 });
      setProductResults(products);
    } catch (e) { console.error(e); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!productId || !warehouseId || !quantity || !reason) {
      toast({ title: 'Validation Error', description: 'Please fill all required fields', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      await stockService.adjustStock({
        product_id: productId,
        warehouse_id: warehouseId,
        type,
        quantity: Number(quantity),
        notes: reason,
      });
      toast({ title: 'Stock Adjusted', description: 'Stock adjustment has been recorded successfully' });
      navigate('/stock');
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to adjust stock', variant: 'destructive' });
    } finally { setLoading(false); }
  }

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-lg font-bold">Stock Adjustment</h1>
        <p className="text-sm text-muted-foreground">Manually adjust product stock levels</p>
      </div>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Adjust Stock</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-2">
              <Label>Product *</Label>
              <Input placeholder="Search product..." value={product} onChange={(e) => searchProducts(e.target.value)} />
              {productResults.length > 0 && (
                <div className="rounded-lg border bg-popover p-1 shadow-md max-h-48 overflow-y-auto">
                  {productResults.map((p) => (
                    <button key={p.id} type="button" className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-primary/10" onClick={() => { setProduct(p.name); setProductId(p.id); setProductResults([]); }}>
                      {p.name} ({p.code})
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Warehouse *</Label>
              <Select value={warehouseId} onValueChange={setWarehouseId}>
                <SelectTrigger><SelectValue placeholder="Select warehouse" /></SelectTrigger>
                <SelectContent>
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}{w.is_default ? ' (default)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Adjustment Type *</Label>
              <div className="flex gap-2">
                <Button type="button" variant={type === 'adjustment_in' ? 'default' : 'outline'} onClick={() => setType('adjustment_in')} className="flex-1">
                  <ArrowDownCircle className="mr-2 h-4 w-4" /> Stock In
                </Button>
                <Button type="button" variant={type === 'adjustment_out' ? 'destructive' : 'outline'} onClick={() => setType('adjustment_out')} className="flex-1">
                  <ArrowUpCircle className="mr-2 h-4 w-4" /> Stock Out
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Quantity *</Label>
              <Input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="Enter quantity" />
            </div>

            <div className="space-y-2">
              <Label>Reason *</Label>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Enter reason for adjustment" rows={3} />
            </div>

            <div className="flex gap-3">
              <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save Adjustment'}</Button>
              <Button type="button" variant="outline" onClick={() => navigate('/stock')}>Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
