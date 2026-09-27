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
    variant?: "default" | "outline" | "secondary" | "destructive" | "ghost" | "link" | "neon" | "gradient";
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
        "flex flex-col items-center justify-center py-12 text-center",
        className
      )}
    >
      <div className="rounded-full bg-muted p-4 mb-4">
        {icon || <Inbox className="h-8 w-8 text-muted-foreground/60" />}
      </div>
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      {action && (
        <Button
          onClick={action.onClick}
          variant={action.variant || "default"}
          className="mt-4"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}

export { EmptyState, type EmptyStateProps };
