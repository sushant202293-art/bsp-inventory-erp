import * as React from "react";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

interface Breadcrumb {
  label: string;
  href?: string;
  onClick?: () => void;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: Breadcrumb[];
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  children,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex flex-wrap items-center gap-1 text-[10px] text-muted-foreground">
          <Home className="h-3 w-3" />
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={index}>
              <ChevronRight className="h-3 w-3 opacity-60" />
              {crumb.href || crumb.onClick ? (
                <button
                  onClick={crumb.onClick}
                  className="transition-colors hover:text-foreground"
                >
                  {crumb.label}
                </button>
              ) : (
                <span className={cn(index === breadcrumbs.length - 1 && "text-foreground font-semibold")}>
                  {crumb.label}
                </span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}

      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-0.5">
          <h1 className="truncate text-sm font-bold leading-tight tracking-tight text-foreground">
            {title}
          </h1>
          {description && (
            <p className="truncate text-[11px] text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-1.5">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

export { PageHeader, type PageHeaderProps, type Breadcrumb };
