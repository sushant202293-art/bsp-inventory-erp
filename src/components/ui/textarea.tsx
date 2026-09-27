import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
  errorMessage?: string;
  autoResize?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, errorMessage, autoResize = false, onChange, ...props }, ref) => {
    const internalRef = React.useRef<HTMLTextAreaElement | null>(null);
    const combinedRef = React.useCallback(
      (node: HTMLTextAreaElement | null) => {
        internalRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      },
      [ref]
    );

    const handleChange: React.ChangeEventHandler<HTMLTextAreaElement> = React.useCallback(
      (e) => {
        if (autoResize && internalRef.current) {
          internalRef.current.style.height = "auto";
          internalRef.current.style.height = `${internalRef.current.scrollHeight}px`;
        }
        onChange?.(e);
      },
      [autoResize, onChange]
    );

    return (
      <div className="w-full">
        <textarea
          className={cn(
            "flex min-h-[80px] w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm text-foreground shadow-sm transition-all duration-200 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-danger focus-visible:ring-danger/30 focus-visible:border-danger",
            className
          )}
          ref={combinedRef}
          onChange={handleChange}
          {...props}
        />
        {errorMessage && (
          <p className="mt-1 text-xs text-danger">{errorMessage}</p>
        )}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
