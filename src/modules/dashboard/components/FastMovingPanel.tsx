import { motion } from 'framer-motion';
import { Zap, Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import type { FastMovingProduct } from '@/types/dashboard.types';

interface FastMovingPanelProps {
  data: FastMovingProduct[];
  loading?: boolean;
}

export default function FastMovingPanel({ data, loading }: FastMovingPanelProps) {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="h-[300px] flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Loading...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-success/10">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Zap className="h-4 w-4 text-success" />
          Fast Moving Items
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {data.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            No fast moving items found
          </div>
        ) : (
          <div className="divide-y divide-border">
            {data.slice(0, 8).map((item, index) => (
              <motion.div
                key={item.product_id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center justify-between px-6 py-3 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-success/10 text-xs font-bold text-success">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{item.product_name}</p>
                    <p className="text-xs text-muted-foreground">{item.product_code}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold">{item.total_quantity} units</p>
                  <p className="text-xs text-muted-foreground">{formatCurrency(item.total_revenue)}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
