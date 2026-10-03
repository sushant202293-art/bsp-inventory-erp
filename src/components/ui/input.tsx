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
            "flex h-8 w-full rounded border border-border bg-card px-2.5 text-[13px] text-foreground transition-colors duration-100 file:border-0 file:bg-transparent file:text-[13px] file:font-medium file:text-foreground placeholder:text-muted-foreground placeholder:opacity-100 focus-visible:outline-1 focus-visible:outline-offset-0 focus-visible:border-primary focus-visible:outline-primary disabled:cursor-not-allowed disabled:bg-sidebar disabled:opacity-60",
            error && "border-danger focus-visible:border-danger focus-visible:outline-danger",
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
