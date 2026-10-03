import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn, formatCurrency } from '@/lib/utils';
import type { MonthlyTrend } from '@/types/dashboard.types';

interface SalesChartProps {
  data: MonthlyTrend[];
  loading?: boolean;
}

type ChartMode = 'value' | 'qty' | 'both';

export default function SalesChart({ data, loading }: SalesChartProps) {
  const chartData = useMemo(() => {
    return data.map((d) => ({
      ...d,
      label: d.month,
      amount: Math.round(d.amount),
      bills: d.count,
    }));
  }, [data]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-3">
          <div className="h-[350px] flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Loading chart...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/10">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Sales Analytics</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
            No sales data available
          </div>
        ) : (
          <div>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.3} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#888', fontSize: 11 }}
                  axisLine={{ stroke: '#333' }}
                />
                <YAxis
                  tick={{ fill: '#888', fontSize: 11 }}
                  axisLine={{ stroke: '#333' }}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e1e2e',
                    border: '1px solid #333',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                  formatter={(value: unknown) => [formatCurrency(Number(value ?? 0)), 'Sales Value']}
                  labelFormatter={(label) => `Period: ${label}`}
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fill="url(#salesGradient)"
                  dot={{ r: 3, fill: '#6366f1', strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
