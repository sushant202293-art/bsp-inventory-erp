import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3, ShoppingCart, Package, Users, Truck, CreditCard,
  Receipt, FileText, Search, TrendingUp, PieChart, DollarSign,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface ReportItem {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  category: string;
  path: string;
  color: string;
}

const reports: ReportItem[] = [
  {
    id: 'sales-register',
    title: 'Sales Register',
    description: 'Complete sales transaction register with date-wise listing and totals',
    icon: <BarChart3 className="h-6 w-6" />,
    category: 'Sales Reports',
    path: '/reports/sales',
    color: 'text-emerald-500',
  },
  {
    id: 'sales-summary',
    title: 'Sales Summary',
    description: 'Periodic sales summary with trends and comparisons',
    icon: <TrendingUp className="h-6 w-6" />,
    category: 'Sales Reports',
    path: '/reports/sales',
    color: 'text-emerald-400',
  },
  {
    id: 'purchase-register',
    title: 'Purchase Register',
    description: 'Complete purchase transaction register with supplier-wise listing',
    icon: <ShoppingCart className="h-6 w-6" />,
    category: 'Purchase Reports',
    path: '/reports/purchase',
    color: 'text-blue-500',
  },
  {
    id: 'purchase-summary',
    title: 'Purchase Summary',
    description: 'Periodic purchase summary with trends and comparisons',
    icon: <PieChart className="h-6 w-6" />,
    category: 'Purchase Reports',
    path: '/reports/purchase',
    color: 'text-blue-400',
  },
  {
    id: 'stock-summary',
    title: 'Stock Summary',
    description: 'Current stock levels with quantity and value for all products',
    icon: <Package className="h-6 w-6" />,
    category: 'Stock Reports',
    path: '/reports/stock',
    color: 'text-amber-500',
  },
  {
    id: 'stock-valuation',
    title: 'Stock Valuation',
    description: 'Stock valuation report with purchase and selling prices',
    icon: <DollarSign className="h-6 w-6" />,
    category: 'Stock Reports',
    path: '/reports/stock',
    color: 'text-amber-400',
  },
  {
    id: 'customer-outstanding',
    title: 'Customer Outstanding',
    description: 'Customer-wise outstanding amounts with aging analysis',
    icon: <Users className="h-6 w-6" />,
    category: 'Customer Reports',
    path: '/reports/customer',
    color: 'text-violet-500',
  },
  {
    id: 'supplier-outstanding',
    title: 'Supplier Outstanding',
    description: 'Supplier-wise outstanding amounts with aging analysis',
    icon: <Truck className="h-6 w-6" />,
    category: 'Supplier Reports',
    path: '/reports/supplier',
    color: 'text-rose-500',
  },
  {
    id: 'payment-received',
    title: 'Payments Received',
    description: 'All payments received from customers with details',
    icon: <CreditCard className="h-6 w-6" />,
    category: 'Payment Reports',
    path: '/reports/sales',
    color: 'text-teal-500',
  },
  {
    id: 'payment-made',
    title: 'Payments Made',
    description: 'All payments made to suppliers with details',
    icon: <Receipt className="h-6 w-6" />,
    category: 'Payment Reports',
    path: '/reports/purchase',
    color: 'text-orange-500',
  },
  {
    id: 'gst-report',
    title: 'GST Report',
    description: 'GST summary with CGST, SGST, IGST collected and input credit',
    icon: <FileText className="h-6 w-6" />,
    category: 'Tax Reports',
    path: '/reports/gst',
    color: 'text-cyan-500',
  },
];

const categories = [...new Set(reports.map((r) => r.category))];

export default function ReportsListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search) return reports;
    const q = search.toLowerCase();
    return reports.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q)
    );
  }, [search]);

  const grouped = useMemo(() => {
    const map = new Map<string, ReportItem[]>();
    for (const cat of categories) {
      const items = filtered.filter((r) => r.category === cat);
      if (items.length > 0) map.set(cat, items);
    }
    return map;
  }, [filtered]);

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-lg font-bold tracking-tight text-foreground">Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Generate and view detailed business reports
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search reports..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <Search className="mx-auto h-12 w-12 text-muted-foreground/40" />
          <p className="mt-2 text-sm text-muted-foreground">No reports found matching "{search}"</p>
        </div>
      )}

      {Array.from(grouped.entries()).map(([category, items]) => (
        <div key={category} className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">{category}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((report) => (
              <div key={report.id}>
                <Card
                  className={cn(
                    'group cursor-pointer p-3 transition-colors',
                    'border-border hover:border-primary/50'
                  )}
                  onClick={() => navigate(report.path)}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn('rounded-lg bg-muted p-2.5 transition-colors group-hover:bg-primary/10', report.color)}>
                      {report.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        {report.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {report.description}
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
