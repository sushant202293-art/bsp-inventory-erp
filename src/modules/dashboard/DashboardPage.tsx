import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
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
    { key: 'week' as const, label: 'This Week' },
    { key: 'month' as const, label: 'This Month' },
    { key: 'quarter' as const, label: 'This Quarter' },
    { key: 'year' as const, label: 'This Year' },
  ];

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <LoadingSpinner size="lg" text="Loading dashboard..." />
      </div>
    );
  }

  // getCustomerOutstandingDashboard returns a list, so the KPI totals are
  // derived here rather than read off a single object.
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
      color: 'from-blue-500 to-cyan-400',
      link: '/reports/sales',
    },
    {
      title: 'Purchases',
      value: formatCurrency(purchaseSummary?.total_purchases),
      sub: `${purchaseSummary?.total_invoices ?? 0} invoices`,
      icon: ShoppingCart,
      color: 'from-purple-500 to-pink-400',
      link: '/reports/purchases',
    },
    {
      title: 'Stock Value',
      value: formatCurrency(stockSummary?.total_stock_value),
      sub: `${stockSummary?.total_stock_quantity ?? 0} units`,
      icon: Package,
      color: 'from-green-500 to-emerald-400',
      link: '/stock',
    },
    {
      title: 'Receivables',
      value: formatCurrency(totalReceivables),
      sub: `${overLimitCount} over limit`,
      icon: DollarSign,
      color: 'from-amber-500 to-orange-400',
      link: '/ledgers/customer',
    },
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Welcome back. Here is your business overview.</p>
        </div>
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {dateButtons.map((btn) => (
            <button
              key={btn.key}
              onClick={() => setDateRange(btn.key)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                dateRange === btn.key
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((card, i) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Link to={card.link}>
              <Card className="group relative overflow-hidden transition-all hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5">
                <div className={`absolute inset-0 bg-gradient-to-br ${card.color} opacity-5 group-hover:opacity-10 transition-opacity`} />
                <CardContent className="relative p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                      <p className="mt-2 text-2xl font-bold">{card.value}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{card.sub}</p>
                    </div>
                    <div className={`rounded-lg bg-gradient-to-br ${card.color} p-3 text-white shadow-lg`}>
                      <card.icon className="h-5 w-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Low Stock Alert
              {lowStockItems.length > 0 && (
                <Badge variant="destructive">{lowStockItems.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lowStockItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">All products are well stocked.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {lowStockItems.map((item) => (
                  <div key={item.product_id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="text-sm font-medium">{item.product_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.product_code}
                        {item.category_name ? ` · ${item.category_name}` : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant={item.current_stock === 0 ? 'destructive' : 'warning'}>
                        {item.current_stock} left
                      </Badge>
                      <p className="mt-1 text-xs text-muted-foreground">Reorder: {item.low_stock_level}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              Fast Moving Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            {fastMoving.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sales data available for this period.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {fastMoving.map((item, idx) => (
                  <div key={item.product_id} className="flex items-center gap-3 rounded-lg border p-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.product_name}</p>
                      <p className="text-xs text-muted-foreground">{item.product_code}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{item.total_quantity} sold</p>
                      <p className="text-xs text-muted-foreground">{formatCurrency(item.total_revenue)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {recentActivity.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-500" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {recentActivity.map((act) => (
                <div key={act.id} className="flex items-center gap-3 rounded-lg border p-3">
                  <Badge variant={act.type === 'sale' ? 'success' : act.type === 'purchase' ? 'info' : 'secondary'}>
                    {act.type}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {act.document_number}
                      {act.party_name ? ` · ${act.party_name}` : ''}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(act.document_date)}
                      {act.status ? ` · ${act.status}` : ''}
                    </p>
                  </div>
                  <p className="text-sm font-semibold">{formatCurrency(act.grand_total)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: '+ New Sale', to: '/transactions/sales/new' },
          { label: '+ New PO', to: '/purchase-orders/new' },
          { label: '+ New Quotation', to: '/quotations/new' },
          { label: '+ New PI', to: '/proforma-invoices/new' },
          { label: '+ New Customer', to: '/customers/new' },
          { label: '+ New Supplier', to: '/suppliers/new' },
        ].map((action) => (
          <Link key={action.to} to={action.to}>
            <Button variant="outline" className="w-full h-12 text-sm font-medium hover:bg-primary hover:text-primary-foreground transition-colors">
              {action.label}
            </Button>
          </Link>
        ))}
      </div>
    </div>
  );
}
