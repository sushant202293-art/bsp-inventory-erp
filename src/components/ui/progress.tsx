import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "@/lib/utils";

interface ProgressProps
  extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  indicatorClassName?: string;
  showLabel?: boolean;
  value?: number;
}

const Progress = React.forwardRef<
  React.ComponentRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(({ className, value, indicatorClassName, showLabel = false, ...props }, ref) => (
  <div className="w-full">
    {showLabel && (
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Progress</span>
        <span className="text-xs font-medium text-foreground">{value ?? 0}%</span>
      </div>
    )}
    <ProgressPrimitive.Root
      ref={ref}
      className={cn(
        "relative h-3 w-full overflow-hidden rounded-full bg-muted",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className={cn(
          "h-full w-full flex-1 rounded-full bg-primary transition-all duration-500 ease-in-out",
          indicatorClassName
        )}
        style={{ transform: `translateX(-${100 - (value ?? 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  </div>
));
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
