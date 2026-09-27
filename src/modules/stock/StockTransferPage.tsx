import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { stockService, type WarehouseOption } from '@/services/stock.service';
import type { ProductWithRelations } from '@/types/product.types';
import { useNavigate } from 'react-router-dom';
import { ArrowRightLeft } from 'lucide-react';

export default function StockTransferPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState('');
  const [productId, setProductId] = useState('');
  const [fromWarehouse, setFromWarehouse] = useState('');
  const [toWarehouse, setToWarehouse] = useState('');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [productResults, setProductResults] = useState<ProductWithRelations[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);

  useEffect(() => {
    stockService.getWarehouses()
      .then(setWarehouses)
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
    if (!productId || !fromWarehouse || !toWarehouse || !quantity) {
      toast({ title: 'Validation Error', description: 'Please fill all required fields', variant: 'destructive' });
      return;
    }
    if (fromWarehouse === toWarehouse) {
      toast({ title: 'Error', description: 'Source and destination warehouses cannot be the same', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      await stockService.transferStock({
        product_id: productId,
        from_warehouse_id: fromWarehouse,
        to_warehouse_id: toWarehouse,
        quantity: Number(quantity),
        notes,
      });
      toast({ title: 'Transfer Complete', description: 'Stock has been transferred successfully' });
      navigate('/stock');
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Transfer failed', variant: 'destructive' });
    } finally { setLoading(false); }
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Stock Transfer</h1>
        <p className="text-sm text-muted-foreground">Transfer stock between warehouses</p>
      </div>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ArrowRightLeft className="h-5 w-5" /> Transfer Stock</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Product *</Label>
              <Input placeholder="Search product..." value={product} onChange={(e) => searchProducts(e.target.value)} />
              {productResults.length > 0 && (
                <div className="rounded-lg border bg-popover p-1 shadow-md max-h-48 overflow-y-auto">
                  {productResults.map((p) => (
                    <button key={p.id} type="button" className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-accent" onClick={() => { setProduct(p.name); setProductId(p.id); setProductResults([]); }}>
                      {p.name} ({p.code})
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>From Warehouse *</Label>
                <Select value={fromWarehouse} onValueChange={setFromWarehouse}>
                  <SelectTrigger><SelectValue placeholder="Source warehouse" /></SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>To Warehouse *</Label>
                <Select value={toWarehouse} onValueChange={setToWarehouse}>
                  <SelectTrigger><SelectValue placeholder="Destination warehouse" /></SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Quantity *</Label>
              <Input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="Quantity to transfer" />
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Transfer notes (optional)" rows={2} />
            </div>

            <div className="flex gap-3">
              <Button type="submit" disabled={loading}>{loading ? 'Transferring...' : 'Transfer Stock'}</Button>
              <Button type="button" variant="outline" onClick={() => navigate('/stock')}>Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}