import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Package, AlertTriangle, TrendingUp, DollarSign, ShoppingCart, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { formatCurrency, formatDate } from '@/lib/utils';
import { dashboardService } from '@/services/dashboard.service';
import type {
  SalesSummary,
  PurchaseSummary,
  StockSummary,
  LowStockProduct,
  FastMovingProduct,
  CustomerOutstanding,
  RecentTransaction,
} from '@/types/dashboard.types';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [salesSummary, setSalesSummary] = useState<SalesSummary | null>(null);
  const [purchaseSummary, setPurchaseSummary] = useState<PurchaseSummary | null>(null);
  const [stockSummary, setStockSummary] = useState<StockSummary | null>(null);
  const [lowStockItems, setLowStockItems] = useState<LowStockProduct[]>([]);
  const [fastMoving, setFastMoving] = useState<FastMovingProduct[]>([]);
  const [customerOutstanding, setCustomerOutstanding] = useState<CustomerOutstanding[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentTransaction[]>([]);
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'quarter' | 'year'>('month');

  useEffect(() => {
    loadDashboard();
  }, [dateRange]);

  async function loadDashboard() {
    setLoading(true);
    try {
      const now = new Date();
      let from = new Date();
      switch (dateRange) {
        case 'today': from = new Date(now.getFullYear(), now.getMonth(), now.getDate()); break;
        case 'week': from = new Date(now.setDate(now.getDate() - 7)); break;
        case 'month': from = new Date(now.getFullYear(), now.getMonth(), 1); break;
        case 'quarter': from = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1); break;
        case 'year': from = new Date(now.getFullYear(), 0, 1); break;
      }
      const fromStr = from.toISOString().split('T')[0];
      const toStr = new Date().toISOString().split('T')[0];

      const [sales, purchase, stock, lowStock, fast, outstanding, activity] = await Promise.allSettled([
        dashboardService.getSalesSummary(fromStr, toStr),
        dashboardService.getPurchaseSummary(fromStr, toStr),
        dashboardService.getStockSummaryDashboard(),
        dashboardService.getLowStockItems(),
        dashboardService.getFastMovingItems(fromStr, toStr, 10),
        dashboardService.getCustomerOutstandingDashboard(),
        dashboardService.getRecentActivity(10),
      ]);

      if (sales.status === 'fulfilled') setSalesSummary(sales.value);
      if (purchase.status === 'fulfilled') setPurchaseSummary(purchase.value);
      if (stock.status === 'fulfilled') setStockSummary(stock.value);
      if (lowStock.status === 'fulfilled') setLowStockItems(lowStock.value || []);
      if (fast.status === 'fulfilled') setFastMoving(fast.value || []);
      if (outstanding.status === 'fulfilled') setCustomerOutstanding(outstanding.value);
      if (activity.status === 'fulfilled') setRecentActivity(activity.value || []);
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  }

  const dateButtons = [
    { key: 'today' as const, label: 'Today' },
    { key: 'week' as const, label: 'Week' },
    { key: 'month' as const, label: 'Month' },
    { key: 'quarter' as const, label: 'Quarter' },
    { key: 'year' as const, label: 'Year' },
  ];

  if (loading) {
    return (
      <div className="flex py-16 items-center justify-center">
        <LoadingSpinner size="lg" text="Loading dashboard..." />
      </div>
    );
  }

  const totalReceivables = customerOutstanding.reduce(
    (sum, c) => sum + (c.outstanding_balance || 0),
    0
  );
  const overLimitCount = customerOutstanding.filter((c) => c.over_limit).length;

  const kpiCards = [
    {
      title: "Today's Sales",
      value: formatCurrency(salesSummary?.today_sales),
      sub: `${salesSummary?.total_invoices ?? 0} invoices`,
      icon: TrendingUp,
      link: '/reports/sales',
    },
    {
      title: 'Purchases',
      value: formatCurrency(purchaseSummary?.total_purchases),
      sub: `${purchaseSummary?.total_invoices ?? 0} invoices`,
      icon: ShoppingCart,
      link: '/reports/purchases',
    },
    {
      title: 'Stock Value',
      value: formatCurrency(stockSummary?.total_stock_value),
      sub: `${stockSummary?.total_stock_quantity ?? 0} units`,
      icon: Package,
      link: '/stock',
    },
    {
      title: 'Receivables',
      value: formatCurrency(totalReceivables),
      sub: `${overLimitCount} over limit`,
      icon: DollarSign,
      link: '/ledgers/customer',
    },
  ];

  return (
    <div className="space-y-2 pb-2">
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-sm font-bold leading-tight">Dashboard</h1>
          <p className="text-[11px] text-muted-foreground">Business overview and key metrics</p>
        </div>
        <div className="flex gap-0.5 rounded-sm border bg-muted/30 p-0.5">
          {dateButtons.map((btn) => (
            <button
              key={btn.key}
              onClick={() => setDateRange(btn.key)}
              className={`rounded-sm px-2 py-0.5 text-[11px] font-medium transition-colors ${
                dateRange === btn.key
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {kpiCards.map((card) => (
          <Link key={card.title} to={card.link}>
            <Card className="group rounded-sm transition-colors hover:border-primary/50">
              <CardContent className="p-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {card.title}
                    </p>
                    <p className="mt-1 truncate text-lg font-bold tabular-nums">{card.value}</p>
                    <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{card.sub}</p>
                  </div>
                  <card.icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:text-primary" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
        <Card className="rounded-sm">
          <CardHeader className="flex flex-row items-center gap-2 border-b px-2 py-1.5">
            <AlertTriangle className="h-3 w-3 text-amber-500" />
            <CardTitle className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Low Stock Alert
            </CardTitle>
            {lowStockItems.length > 0 && (
              <Badge variant="destructive" className="ml-auto text-[10px] px-1.5 py-0">{lowStockItems.length}</Badge>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {lowStockItems.length === 0 ? (
              <p className="px-2 py-2 text-[11px] text-muted-foreground">All products are well stocked.</p>
            ) : (
              <div className="max-h-56 overflow-y-auto">
                {lowStockItems.map((item) => (
                  <div
                    key={item.product_id}
                    className="flex items-center justify-between gap-2 border-b px-2 py-1.5 text-xs last:border-0 hover:bg-muted/20"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{item.product_name}</p>
                      <p className="truncate text-[10px] text-muted-foreground">
                        {item.product_code}
                        {item.category_name ? ` · ${item.category_name}` : ''}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <Badge variant={item.current_stock === 0 ? 'destructive' : 'warning'} className="text-[10px] px-1.5 py-0">
                        {item.current_stock} left
                      </Badge>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">Min: {item.low_stock_level}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-sm">
          <CardHeader className="flex flex-row items-center gap-2 border-b px-2 py-1.5">
            <TrendingUp className="h-3 w-3 text-green-500" />
            <CardTitle className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Fast Moving Items
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {fastMoving.length === 0 ? (
              <p className="px-2 py-2 text-[11px] text-muted-foreground">No sales data available for this period.</p>
            ) : (
              <div className="max-h-56 overflow-y-auto">
                {fastMoving.map((item, idx) => (
                  <div
                    key={item.product_id}
                    className="flex items-center gap-2 border-b px-2 py-1.5 text-xs last:border-0 hover:bg-muted/20"
                  >
                    <span className="w-4 shrink-0 text-center text-[10px] font-semibold text-muted-foreground tabular-nums">
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{item.product_name}</p>
                      <p className="truncate text-[10px] text-muted-foreground">{item.product_code}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-semibold tabular-nums">{item.total_quantity} sold</p>
                      <p className="text-[10px] text-muted-foreground tabular-nums">
                        {formatCurrency(item.total_revenue)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {recentActivity.length > 0 && (
        <Card className="rounded-sm">
          <CardHeader className="flex flex-row items-center gap-2 border-b px-2 py-1.5">
            <BarChart3 className="h-3 w-3 text-blue-500" />
            <CardTitle className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-64 overflow-y-auto">
              {recentActivity.map((act) => (
                <div
                  key={act.id}
                  className="flex items-center gap-2 border-b px-2 py-1.5 text-xs last:border-0 hover:bg-muted/20"
                >
                  <Badge variant={act.type === 'sale' ? 'success' : act.type === 'purchase' ? 'info' : 'secondary'} className="text-[10px] px-1.5 py-0">
                    {act.type}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">
                      {act.document_number}
                      {act.party_name ? ` · ${act.party_name}` : ''}
                    </p>
                    <p className="truncate text-[10px] text-muted-foreground">
                      {formatDate(act.document_date)}
                      {act.status ? ` · ${act.status}` : ''}
                    </p>
                  </div>
                  <p className="shrink-0 font-semibold tabular-nums">{formatCurrency(act.grand_total)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: '+ Sale', to: '/transactions/sales/new' },
          { label: '+ Purchase', to: '/transactions/purchases/new' },
          { label: '+ Quotation', to: '/quotations/new' },
          { label: '+ PO', to: '/purchase-orders/new' },
          { label: '+ Customer', to: '/customers/new' },
          { label: '+ Supplier', to: '/suppliers/new' },
        ].map((action) => (
          <Link key={action.to} to={action.to}>
            <Button variant="outline" className="h-7 w-full text-xs font-medium">
              {action.label}
            </Button>
          </Link>
        ))}
      </div>
    </div>
  );
}
