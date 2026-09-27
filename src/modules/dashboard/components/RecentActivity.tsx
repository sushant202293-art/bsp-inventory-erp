import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Package, CreditCard, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { dashboardService } from '@/services/dashboard.service';

export default function RecentActivity() {
  const [activities, setActivities] = useState<any[]>([]);

  useEffect(() => {
    dashboardService.getRecentActivity(10).then(setActivities).catch(() => {});
  }, []);

  const iconMap: Record<string, any> = {
    sale: ShoppingCart,
    purchase: Package,
    payment: CreditCard,
  };

  const colorMap: Record<string, string> = {
    sale: 'success',
    purchase: 'info',
    payment: 'warning',
  };

  if (activities.length === 0) return null;

  return (
    <div className="space-y-2">
      {activities.map((act, idx) => {
        const Icon = iconMap[act.type] || Package;
        return (
          <div key={idx} className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{act.description}</p>
              <p className="text-xs text-muted-foreground">{formatDate(act.date)}</p>
            </div>
            <Badge variant={(colorMap[act.type] as any) || 'secondary'}>{act.type}</Badge>
            <p className="text-sm font-semibold whitespace-nowrap">{formatCurrency(act.amount)}</p>
            {act.link && (
              <Link to={act.link} className="text-primary hover:text-primary/80">
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        );
      })}
    </div>
  );
}
