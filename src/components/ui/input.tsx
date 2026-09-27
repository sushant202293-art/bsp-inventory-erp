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
            "flex h-10 w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm text-foreground shadow-sm transition-all duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-danger focus-visible:ring-danger/30 focus-visible:border-danger",
            className
          )}
          ref={ref}
          {...props}
        />
        {errorMessage && (
          <p className="mt-1 text-xs text-danger">{errorMessage}</p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
