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
    <div className={cn("space-y-4", className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-1 text-sm text-muted-foreground">
          <Home className="h-4 w-4" />
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={index}>
              <ChevronRight className="h-3.5 w-3.5" />
              {crumb.href || crumb.onClick ? (
                <button
                  onClick={crumb.onClick}
                  className="transition-colors hover:text-foreground"
                >
                  {crumb.label}
                </button>
              ) : (
                <span className={cn(index === breadcrumbs.length - 1 && "text-foreground font-medium")}>
                  {crumb.label}
                </span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {title}
          </h1>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

export { PageHeader, type PageHeaderProps, type Breadcrumb };
