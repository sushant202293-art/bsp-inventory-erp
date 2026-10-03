import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  errorMessage?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, errorMessage, ...props }, ref) => {
    return (
      <div className="w-full">
        <input
          type={type}
          className={cn(
            "flex h-7 w-full rounded-sm border border-border bg-card px-2 text-xs text-foreground transition-colors duration-100 file:border-0 file:bg-transparent file:text-xs file:font-medium file:text-foreground placeholder:text-muted-foreground placeholder:opacity-100 focus-visible:outline-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:bg-sidebar disabled:opacity-60",
            error && "border-danger focus-visible:border-danger focus-visible:ring-danger",
            className
          )}
          ref={ref}
          {...props}
        />
        {errorMessage && (
          <p className="mt-0.5 text-[11px] text-danger">{errorMessage}</p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
