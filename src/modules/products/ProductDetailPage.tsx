import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Pencil, Trash2, ArrowLeft, Package, TrendingUp, TrendingDown,
  DollarSign, Box, AlertTriangle, Copy,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { getProduct, deleteProduct, getProductStock, getProductMovements, duplicateProduct } from '@/services/product.service';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { ProductWithRelations, ProductStockWithWarehouse } from '@/types/product.types';
import type { StockMovement } from '@/types/database.types';

export default function ProductDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();

  const [product, setProduct] = useState<ProductWithRelations | null>(null);
  const [stocks, setStocks] = useState<ProductStockWithWarehouse[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      try {
        const [prod, stockData, movementData] = await Promise.all([
          getProduct(id),
          getProductStock(id),
          getProductMovements(id),
        ]);
        setProduct(prod);
        setStocks(stockData);
        setMovements(movementData);
      } catch {
        toast({ title: 'Error', description: 'Failed to load product.', variant: 'destructive' });
        navigate('/products');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, toast, navigate]);

  const handleDelete = async () => {
    if (!id) return;
    setDeleteLoading(true);
    try {
      await deleteProduct(id);
      toast({ title: 'Product deleted', description: 'Product has been deleted.', variant: 'success' });
      navigate('/products');
    } catch {
      toast({ title: 'Error', description: 'Failed to delete product.', variant: 'destructive' });
    } finally {
      setDeleteLoading(false);
      setDeleteDialog(false);
    }
  };

  const handleDuplicate = async () => {
    if (!id) return;
    try {
      await duplicateProduct(id);
      toast({ title: 'Product duplicated', description: 'A copy has been created.', variant: 'success' });
      navigate('/products');
    } catch {
      toast({ title: 'Error', description: 'Failed to duplicate product.', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-64 lg:col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!product) return null;

  const totalStock = stocks.reduce((sum, s) => sum + (s.current_stock || 0), 0);
  const totalValue = stocks.reduce((sum, s) => sum + (s.current_stock || 0) * (s.avg_cost || 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title={product.name}
        description={`Product code: ${product.code}`}
        breadcrumbs={[
          { label: 'Dashboard', onClick: () => navigate('/dashboard') },
          { label: 'Products', onClick: () => navigate('/products') },
          { label: product.name },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate('/products')} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <Button variant="outline" onClick={handleDuplicate} className="gap-2">
              <Copy className="h-4 w-4" />
              Duplicate
            </Button>
            <Button onClick={() => navigate(`/products/${id}/edit`)} className="gap-2">
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
            <Button variant="destructive" onClick={() => setDeleteDialog(true)} className="gap-2">
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-2 space-y-6"
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row gap-6">
                <div className="h-40 w-40 shrink-0 overflow-hidden rounded-xl border border-border bg-muted">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Package className="h-12 w-12 text-muted-foreground/40" />
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-foreground">{product.name}</h2>
                      <p className="text-sm text-muted-foreground font-mono">{product.code}</p>
                    </div>
                    <Badge variant={product.is_active ? 'success' : 'destructive'}>
                      {product.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Category:</span>{' '}
                      <span className="font-medium">{(product.category as unknown as { name: string })?.name || '-'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Brand:</span>{' '}
                      <span className="font-medium">{(product.brand as unknown as { name: string })?.name || '-'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Unit:</span>{' '}
                      <span className="font-medium">{(product.unit as unknown as { short_name: string })?.short_name || '-'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">GST Rate:</span>{' '}
                      <span className="font-medium">{product.gst_rate}%</span>
                    </div>
                    {product.color && (
                      <div>
                        <span className="text-muted-foreground">Color:</span>{' '}
                        <span className="font-medium">{product.color}</span>
                      </div>
                    )}
                    {product.size && (
                      <div>
                        <span className="text-muted-foreground">Size:</span>{' '}
                        <span className="font-medium">{product.size}</span>
                      </div>
                    )}
                    {product.hsn_sac && (
                      <div>
                        <span className="text-muted-foreground">HSN/SAC:</span>{' '}
                        <span className="font-medium">{product.hsn_sac}</span>
                      </div>
                    )}
                    {product.barcode && (
                      <div>
                        <span className="text-muted-foreground">Barcode:</span>{' '}
                        <span className="font-mono text-xs">{product.barcode}</span>
                      </div>
                    )}
                  </div>
                  {product.description && (
                    <p className="text-sm text-muted-foreground">{product.description}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="stock">Stock History</TabsTrigger>
              <TabsTrigger value="movements">Movements</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: 'Purchase Price', value: formatCurrency(product.purchase_price), icon: DollarSign, color: 'text-blue-500' },
                  { label: 'Selling Price', value: formatCurrency(product.selling_price), icon: DollarSign, color: 'text-green-500' },
                  { label: 'Low Stock Level', value: String(product.low_stock_level), icon: AlertTriangle, color: 'text-amber-500' },
                  { label: 'Reorder Level', value: String(product.reorder_level), icon: TrendingDown, color: 'text-purple-500' },
                ].map((stat) => (
                  <Card key={stat.label}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`rounded-lg bg-muted p-2`}>
                          <stat.icon className={`h-4 w-4 ${stat.color}`} />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">{stat.label}</p>
                          <p className="text-lg font-bold">{stat.value}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="stock">
              <Card>
                <CardContent className="p-0">
                  {stocks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <Box className="h-8 w-8 mb-2" />
                      <p className="text-sm">No stock data available</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Warehouse</TableHead>
                          <TableHead className="text-right">Current Stock</TableHead>
                          <TableHead className="text-right">Avg Cost</TableHead>
                          <TableHead className="text-right">Value</TableHead>
                          <TableHead>Last Updated</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {stocks.map((stock) => (
                          <TableRow key={stock.id}>
                            <TableCell className="font-medium">
                              {(stock.warehouse as unknown as { name: string })?.name || 'Default'}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {stock.current_stock}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(stock.avg_cost)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(stock.current_stock * stock.avg_cost)}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatDate(stock.last_updated)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="movements">
              <Card>
                <CardContent className="p-0">
                  {movements.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <TrendingUp className="h-8 w-8 mb-2" />
                      <p className="text-sm">No stock movements recorded</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead className="text-right">Quantity</TableHead>
                          <TableHead className="text-right">Balance After</TableHead>
                          <TableHead>Notes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {movements.map((mov) => (
                          <TableRow key={mov.id}>
                            <TableCell className="text-sm">{formatDate(mov.created_at)}</TableCell>
                            <TableCell>
                              <Badge variant={
                                mov.type.includes('in') || mov.type === 'purchase' || mov.type === 'sales_return'
                                  ? 'success' : 'destructive'
                              }>
                                {mov.type.replace(/_/g, ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              <span className={mov.quantity > 0 ? 'text-green-600' : 'text-red-600'}>
                                {mov.quantity > 0 ? '+' : ''}{mov.quantity}
                              </span>
                            </TableCell>
                            <TableCell className="text-right font-mono">{mov.balance_after}</TableCell>
                            <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                              {mov.notes || '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6"
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Stock Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-border bg-muted/30 p-4 text-center">
                <p className="text-3xl font-bold text-foreground">{totalStock}</p>
                <p className="text-sm text-muted-foreground">Total Units in Stock</p>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Value</span>
                  <span className="font-medium">{formatCurrency(totalValue)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Warehouses</span>
                  <span className="font-medium">{stocks.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant={totalStock <= 0 ? 'destructive' : totalStock <= product.low_stock_level ? 'warning' : 'success'}>
                    {totalStock <= 0 ? 'Out of Stock' : totalStock <= product.low_stock_level ? 'Low Stock' : 'In Stock'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pricing Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Purchase Price</span>
                <span className="font-medium">{formatCurrency(product.purchase_price)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Selling Price</span>
                <span className="font-medium">{formatCurrency(product.selling_price)}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-3">
                <span className="text-muted-foreground">Margin</span>
                <span className="font-medium text-green-600">
                  {product.purchase_price > 0
                    ? `${(((product.selling_price - product.purchase_price) / product.purchase_price) * 100).toFixed(1)}%`
                    : '0%'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">GST Rate</span>
                <span className="font-medium">{product.gst_rate}%</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Product Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span className="font-medium">{formatDate(product.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Updated</span>
                <span className="font-medium">{formatDate(product.updated_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">ID</span>
                <span className="font-mono text-xs text-muted-foreground">{product.id.slice(0, 8)}...</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <ConfirmDialog
        open={deleteDialog}
        onOpenChange={setDeleteDialog}
        title="Delete Product"
        description={`Are you sure you want to delete "${product.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        loading={deleteLoading}
      />
    </div>
  );
}
