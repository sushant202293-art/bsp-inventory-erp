import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertTriangle, Package, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import type { LowStockProduct } from '@/types/dashboard.types';

interface LowStockPanelProps {
  data: LowStockProduct[];
  loading?: boolean;
}

export default function LowStockPanel({ data, loading }: LowStockPanelProps) {
  const navigate = useNavigate();

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

  const critical = data.filter((d) => d.current_stock <= 0);
  const low = data.filter((d) => d.current_stock > 0);

  return (
    <Card className="border-danger/10">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-danger" />
            Low Stock Alerts
          </CardTitle>
          {data.length > 0 && (
            <Badge variant="destructive" className="text-xs">{data.length}</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {data.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            All products are well stocked
          </div>
        ) : (
          <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
            {critical.length > 0 && (
              <div className="px-6 py-2 bg-danger/5">
                <p className="text-xs font-semibold text-danger">Out of Stock ({critical.length})</p>
              </div>
            )}
            {critical.map((item, index) => (
              <motion.div
                key={item.product_id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
                className="flex items-center justify-between px-6 py-3 hover:bg-danger/5 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{item.product_name}</p>
                  <p className="text-xs text-muted-foreground">{item.product_code}</p>
                </div>
                <Badge variant="destructive" className="text-xs shrink-0 ml-2">0 stock</Badge>
              </motion.div>
            ))}
            {low.length > 0 && (
              <div className="px-6 py-2 bg-warning/5">
                <p className="text-xs font-semibold text-warning">Low Stock ({low.length})</p>
              </div>
            )}
            {low.map((item, index) => (
              <motion.div
                key={item.product_id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: (critical.length + index) * 0.03 }}
                className="flex items-center justify-between px-6 py-3 hover:bg-warning/5 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{item.product_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.product_code} | Min: {item.low_stock_level}
                  </p>
                </div>
                <Badge variant="warning" className="text-xs shrink-0 ml-2">{item.current_stock} left</Badge>
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
