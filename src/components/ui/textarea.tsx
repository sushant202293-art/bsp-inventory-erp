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
            "flex min-h-[64px] w-full rounded border border-border bg-card px-2.5 py-1.5 text-[13px] text-foreground transition-colors duration-100 placeholder:text-muted-foreground focus-visible:outline-1 focus-visible:outline-offset-0 focus-visible:border-primary focus-visible:outline-primary disabled:cursor-not-allowed disabled:bg-sidebar disabled:opacity-60",
            error && "border-danger focus-visible:border-danger focus-visible:outline-danger",
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
