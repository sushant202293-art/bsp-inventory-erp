import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Pencil, Trash2, ArrowLeft, Package, TrendingUp, TrendingDown,
  DollarSign, Box, AlertTriangle, Copy, Truck, Users, Receipt, FileClock,
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
import {
  getProduct, deleteProduct, getProductStock, getProductMovements, duplicateProduct,
  getProductTransactions, summarizeCounterparties,
  type ProductTransactionLine, type ProductCounterparty,
} from '@/services/product.service';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { ProductWithRelations, ProductStockWithWarehouse } from '@/types/product.types';
import type { StockMovement } from '@/types/database.types';

const DETAIL_TABS = [
  { value: 'overview', label: 'Overview' },
  { value: 'stock', label: 'Stock' },
  { value: 'transactions', label: 'Transactions' },
  { value: 'pricing', label: 'Pricing' },
  { value: 'suppliers', label: 'Suppliers' },
  { value: 'customers', label: 'Customers' },
  { value: 'history', label: 'History' },
] as const;

type DetailTab = (typeof DETAIL_TABS)[number]['value'];

function isDetailTab(value: string | null): value is DetailTab {
  return DETAIL_TABS.some((tab) => tab.value === value);
}

const DOCUMENT_TYPE_LABEL: Record<string, string> = {
  sale: 'Sales Invoice',
  purchase: 'Purchase Invoice',
  quotation: 'Quotation',
  purchase_order: 'Purchase Order',
  proforma_invoice: 'Proforma Invoice',
};

const DOCUMENT_STATUS_VARIANT: Record<
  string,
  'success' | 'warning' | 'destructive' | 'secondary'
> = {
  paid: 'success',
  approved: 'success',
  confirmed: 'success',
  partial: 'warning',
  draft: 'secondary',
  cancelled: 'destructive',
};

/**
 * Supplier/Customer rollup shared by both counterparty tabs. Rows come from
 * `summarizeCounterparties`, which collapses the product's transaction lines.
 */
function CounterpartyTable({
  icon,
  emptyTitle,
  emptyDescription,
  loading,
  rows,
  partyLabel,
}: {
  icon: React.ReactNode;
  emptyTitle: string;
  emptyDescription: string;
  loading: boolean;
  rows: ProductCounterparty[];
  partyLabel: string;
}) {
  if (loading) {
    return (
      <Card>
        <CardContent className="space-y-3 p-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="p-0">
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            {icon && <div className="mb-2">{icon}</div>}
            <p className="text-sm font-medium text-foreground">{emptyTitle}</p>
            <p className="mt-1 max-w-sm text-center text-xs">{emptyDescription}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{partyLabel}</TableHead>
                <TableHead className="text-right">Documents</TableHead>
                <TableHead className="text-right">Total Qty</TableHead>
                <TableHead className="text-right">Total Value</TableHead>
                <TableHead>Last Activity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell className="text-right font-mono">{row.documentCount}</TableCell>
                  <TableCell className="text-right font-mono">{row.totalQuantity}</TableCell>
                  <TableCell className="text-right">{formatCurrency(row.totalValue)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {row.lastTransactionDate ? formatDate(row.lastTransactionDate) : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ProductDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [product, setProduct] = useState<ProductWithRelations | null>(null);
  const [stocks, setStocks] = useState<ProductStockWithWarehouse[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const requestedTab = searchParams.get('tab');
  const activeTab: DetailTab = isDetailTab(requestedTab) ? requestedTab : 'overview';

  const [txLines, setTxLines] = useState<ProductTransactionLine[]>([]);
  const [txLoading, setTxLoading] = useState(false);

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

  /**
   * Transaction history is only needed by the Transactions, Suppliers,
   * Customers and History tabs, so it is fetched lazily rather than on every
   * visit to the detail screen.
   */
  const txRelevantTabs: DetailTab[] = ['transactions', 'suppliers', 'customers', 'history'];

  const loadTransactions = useCallback(async () => {
    if (!id) return;
    setTxLoading(true);
    try {
      setTxLines(await getProductTransactions(id));
    } catch {
      toast({ title: 'Error', description: 'Failed to load transaction history.', variant: 'destructive' });
    } finally {
      setTxLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    if (!id) return;
    if (txRelevantTabs.includes(activeTab)) {
      loadTransactions();
    }
    // `txRelevantTabs` is a stable literal, so depending on it is unnecessary.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, id, loadTransactions]);

  const handleTabChange = (value: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', value);
    setSearchParams(next, { replace: true });
  };

  const suppliers: ProductCounterparty[] = summarizeCounterparties(
    txLines.filter((line) => line.counterpartyKind === 'supplier')
  );
  const customers: ProductCounterparty[] = summarizeCounterparties(
    txLines.filter((line) => line.counterpartyKind === 'customer')
  );

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
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-3 lg:grid-cols-3">
          <Skeleton className="h-64 lg:col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!product) return null;

  const totalStock = stocks.reduce((sum, s) => sum + (s.current_stock || 0), 0);
  const totalValue = stocks.reduce((sum, s) => sum + (s.current_stock || 0) * (s.avg_cost || 0), 0);

  // Chronological audit trail: record lifecycle, stock ledger and documents.
  const activityEvents = [
    { label: 'Product created', date: product.created_at, icon: Package },
    { label: 'Product last updated', date: product.updated_at, icon: FileClock },
    ...movements.map((mov) => ({
      label: `Stock ${mov.type.replace(/_/g, ' ')} (${mov.quantity > 0 ? '+' : ''}${mov.quantity})`,
      date: mov.created_at,
      icon: TrendingUp,
    })),
    ...txLines.map((line) => ({
      label: `${DOCUMENT_TYPE_LABEL[line.type] || line.type} ${line.document_number}`,
      date: line.document_date,
      icon: Receipt,
    })),
  ]
    .filter((event) => Boolean(event.date))
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));

  return (
    <div className="space-y-3">
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

      <div className="grid gap-3 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-3">
          <Card>
            <CardContent className="p-3">
              <div className="flex flex-col sm:flex-row gap-3">
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

          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-3">
            <div className="overflow-x-auto pb-1">
              <TabsList className="inline-flex w-max min-w-full">
                {DETAIL_TABS.map((tab) => (
                  <TabsTrigger key={tab.value} value={tab.value}>
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <TabsContent value="overview" className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: 'Purchase Price', value: formatCurrency(product.purchase_price), icon: DollarSign, color: 'text-blue-500' },
                  { label: 'Selling Price', value: formatCurrency(product.selling_price), icon: DollarSign, color: 'text-green-500' },
                  { label: 'Low Stock Level', value: String(product.low_stock_level), icon: AlertTriangle, color: 'text-amber-500' },
                  { label: 'Reorder Level', value: String(product.reorder_level), icon: TrendingDown, color: 'text-purple-500' },
                ].map((stat) => (
                  <Card key={stat.label}>
                    <CardContent className="p-3">
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

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Stock Movements</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {movements.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <TrendingUp className="mb-2 h-8 w-8" />
                      <p className="text-sm">No stock movements recorded</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
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
                              <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                                {mov.notes || '-'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
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
                    <div className="overflow-x-auto">
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
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="transactions">
              <Card>
                <CardContent className="p-0">
                  {txLoading ? (
                    <div className="space-y-3 p-4">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-10 w-full" />
                      ))}
                    </div>
                  ) : txLines.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <Receipt className="mb-2 h-8 w-8" />
                      <p className="text-sm">No transactions reference this product yet</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Document</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Party</TableHead>
                            <TableHead className="text-right">Qty</TableHead>
                            <TableHead className="text-right">Rate</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {txLines.map((line) => (
                            <TableRow key={line.id}>
                              <TableCell className="font-mono text-xs">{line.document_number}</TableCell>
                              <TableCell className="text-sm">
                                {DOCUMENT_TYPE_LABEL[line.type] || line.type.replace(/_/g, ' ')}
                              </TableCell>
                              <TableCell className="text-sm">{formatDate(line.document_date)}</TableCell>
                              <TableCell className="text-sm">{line.counterpartyName || '-'}</TableCell>
                              <TableCell className="text-right font-mono">{line.quantity}</TableCell>
                              <TableCell className="text-right">{formatCurrency(line.rate)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(line.total_amount)}</TableCell>
                              <TableCell>
                                <Badge variant={DOCUMENT_STATUS_VARIANT[line.status] || 'secondary'}>
                                  {line.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="pricing">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Card>
                  <CardContent className="space-y-3 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Cost &amp; Revenue
                    </p>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Purchase Price</span>
                      <span className="font-medium">{formatCurrency(product.purchase_price)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Selling Price</span>
                      <span className="font-medium">{formatCurrency(product.selling_price)}</span>
                    </div>
                    <div className="flex justify-between border-t border-border pt-3 text-sm">
                      <span className="text-muted-foreground">Margin</span>
                      <span className={`font-medium ${product.selling_price < product.purchase_price ? 'text-red-600' : 'text-green-600'}`}>
                        {product.purchase_price > 0
                          ? `${(((product.selling_price - product.purchase_price) / product.purchase_price) * 100).toFixed(1)}%`
                          : '0%'}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="space-y-3 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Tax
                    </p>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">GST Rate</span>
                      <span className="font-medium">{product.gst_rate}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">GST on Sale Price</span>
                      <span className="font-medium">
                        {formatCurrency((product.selling_price * product.gst_rate) / 100)}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-border pt-3 text-sm">
                      <span className="text-muted-foreground">Price incl. GST</span>
                      <span className="font-medium">
                        {formatCurrency(product.selling_price + (product.selling_price * product.gst_rate) / 100)}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="space-y-3 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Stock Valuation
                    </p>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Units in Stock</span>
                      <span className="font-mono font-medium">{totalStock}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Warehouses</span>
                      <span className="font-medium">{stocks.length}</span>
                    </div>
                    <div className="flex justify-between border-t border-border pt-3 text-sm">
                      <span className="text-muted-foreground">Total Value</span>
                      <span className="font-medium">{formatCurrency(totalValue)}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/*
                MRP, discount and tax-inclusive/exclusive are intentionally absent:
                `products` has no column for them, and transactions compute their
                own discount and GST per line when a document is posted.
              */}
              <p className="mt-3 text-xs text-muted-foreground">
                Discounts and GST amounts are applied per line on each document rather than
                stored on the product.
              </p>
            </TabsContent>

            <TabsContent value="suppliers">
              <CounterpartyTable
                icon={<Truck className="h-8 w-8" />}
                emptyTitle="No suppliers yet"
                emptyDescription="This product has not appeared on any purchase document."
                loading={txLoading}
                rows={suppliers}
                partyLabel="Supplier"
              />
            </TabsContent>

            <TabsContent value="customers">
              <CounterpartyTable
                icon={<Users className="h-8 w-8" />}
                emptyTitle="No customers yet"
                emptyDescription="This product has not appeared on any sales document."
                loading={txLoading}
                rows={customers}
                partyLabel="Customer"
              />
            </TabsContent>

            <TabsContent value="history">
              <Card>
                <CardContent className="p-0">
                  {txLoading ? (
                    <div className="space-y-3 p-4">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-10 w-full" />
                      ))}
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {activityEvents.map((event, index) => (
                        <div key={`${event.label}-${index}`} className="flex items-center gap-3 px-4 py-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                            <event.icon className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium capitalize">{event.label}</p>
                          </div>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {formatDate(event.date)}
                          </span>
                        </div>
                      ))}
                      {activityEvents.length === 0 && (
                        <p className="px-4 py-4 text-center text-sm text-muted-foreground">
                          No activity recorded yet.
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Stock Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg border border-border bg-muted/30 p-4 text-center">
                <p className="text-xl font-bold text-foreground">{totalStock}</p>
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
        </div>
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
