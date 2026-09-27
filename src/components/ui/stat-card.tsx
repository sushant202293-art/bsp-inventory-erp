import * as React from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "./card";
import { Skeleton } from "./skeleton";

interface StatCardProps {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  sparkline?: number[];
  variant?: "default" | "neon" | "gradient";
  loading?: boolean;
  className?: string;
}

function MiniSparkline({ data, className }: { data: number[]; className?: string }) {
  if (!data || data.length < 2) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const height = 40;
  const width = 120;

  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");

  const areaPoints = `0,${height} ${points} ${width},${height}`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={cn("overflow-visible", className)}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="sparkline-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity={0.3} />
          <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon
        points={areaPoints}
        fill="url(#sparkline-gradient)"
        className="text-primary"
      />
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-primary"
      />
    </svg>
  );
}

function StatCard({
  icon,
  title,
  value,
  change,
  changeLabel,
  sparkline,
  variant = "default",
  loading = false,
  className,
}: StatCardProps) {
  if (loading) {
    return (
      <Card className={cn("p-6", className)}>
        <div className="flex items-start justify-between">
          <div className="space-y-3 flex-1">
            <Skeleton className="h-4 w-[120px]" />
            <Skeleton className="h-8 w-[100px]" />
            <Skeleton className="h-4 w-[80px]" />
          </div>
          <Skeleton className="h-12 w-12 rounded-xl" />
        </div>
        <Skeleton className="mt-4 h-10 w-full" />
      </Card>
    );
  }

  const isPositive = change !== undefined && change >= 0;

  return (
    <Card
      className={cn(
        "group relative overflow-hidden p-6 transition-all duration-300 hover:shadow-elevated hover:-translate-y-0.5",
        variant === "neon" && "border-primary/30 shadow-neon-sm hover:shadow-neon",
        variant === "gradient" && "bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold tracking-tight text-foreground">{value}</p>
          {change !== undefined && (
            <div className="flex items-center gap-1.5">
              {isPositive ? (
                <TrendingUp className="h-4 w-4 text-success" />
              ) : (
                <TrendingDown className="h-4 w-4 text-danger" />
              )}
              <span
                className={cn(
                  "text-sm font-medium",
                  isPositive ? "text-success" : "text-danger"
                )}
              >
                {isPositive ? "+" : ""}
                {change}%
              </span>
              {changeLabel && (
                <span className="text-xs text-muted-foreground">{changeLabel}</span>
              )}
            </div>
          )}
        </div>
        <div
          className={cn(
            "rounded-xl p-3 transition-colors",
            variant === "default" && "bg-primary/10 text-primary",
            variant === "neon" && "bg-primary/15 text-primary shadow-neon-sm",
            variant === "gradient" && "bg-gradient-to-br from-primary to-accent text-white"
          )}
        >
          {icon}
        </div>
      </div>
      {sparkline && sparkline.length > 1 && (
        <div className="mt-4 h-10 text-primary/60">
          <MiniSparkline data={sparkline} className="h-full w-full" />
        </div>
      )}
    </Card>
  );
}

export { StatCard, type StatCardProps, MiniSparkline };
