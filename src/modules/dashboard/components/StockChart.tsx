import { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';

interface StockChartProps {
  data: { category: string; total_stock: number; total_value: number }[];
  loading?: boolean;
}

const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#ec4899', '#06b6d4', '#8b5cf6', '#f97316', '#14b8a6', '#84cc16'];

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-lg border border-border bg-card p-3 shadow-elevated">
        <p className="font-medium text-foreground">{data.category}</p>
        <p className="text-sm text-muted-foreground">Stock: {data.total_stock} units</p>
        <p className="text-sm text-primary font-semibold">{formatCurrency(data.total_value)}</p>
      </div>
    );
  }
  return null;
};

export default function StockChart({ data, loading }: StockChartProps) {
  const chartData = useMemo(() => {
    return data
      .filter((d) => d.total_value > 0)
      .sort((a, b) => b.total_value - a.total_value)
      .slice(0, 8);
  }, [data]);

  const totalValue = chartData.reduce((sum, d) => sum + d.total_value, 0);

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
    <Card className="border-success/10">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Stock Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
            No stock data available
          </div>
        ) : (
          <div>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={110}
                  paddingAngle={3}
                  dataKey="total_value"
                  nameKey="category"
                  stroke="none"
                >
                  {chartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  formatter={(value: string) => (
                    <span className="text-xs text-muted-foreground">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-2 text-center">
              <p className="text-sm text-muted-foreground">Total Stock Value</p>
              <p className="text-xl font-bold text-foreground">{formatCurrency(totalValue)}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
