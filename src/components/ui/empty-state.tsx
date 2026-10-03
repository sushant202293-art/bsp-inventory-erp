import * as React from "react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: "default" | "outline" | "secondary" | "destructive" | "ghost" | "link" | "success" | "warning";
  };
  className?: string;
}

function EmptyState({
  icon,
  title = "No data found",
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-8 text-center",
        className
      )}
    >
      <div className="rounded-sm border border-border bg-sidebar p-2.5 mb-2.5">
        {icon || <Inbox className="h-5 w-5 text-muted-foreground/60" />}
      </div>
      <h3 className="text-xs font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-[11px] text-muted-foreground">{description}</p>
      )}
      {action && (
        <Button
          onClick={action.onClick}
          variant={action.variant || "default"}
          size="sm"
          className="mt-2.5"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}

export { EmptyState, type EmptyStateProps };
