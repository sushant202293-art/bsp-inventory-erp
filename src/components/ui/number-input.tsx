import * as React from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface NumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "type" | "size"> {
  value?: number;
  onChange?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  showControls?: boolean;
  prefix?: string;
  suffix?: string;
  format?: (value: number) => string;
  error?: boolean;
  errorMessage?: string;
  size?: "sm" | "default" | "lg";
}

const sizeClasses = {
  sm: "h-8 text-xs",
  default: "h-10 text-sm",
  lg: "h-12 text-base",
};

const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  (
    {
      className,
      value = 0,
      onChange,
      min,
      max,
      step = 1,
      showControls = true,
      prefix,
      suffix,
      format,
      error,
      errorMessage,
      disabled,
      size = "default",
      ...props
    },
    ref
  ) => {
    const [displayValue, setDisplayValue] = React.useState(format ? format(value) : String(value));

    React.useEffect(() => {
      setDisplayValue(format ? format(value) : String(value));
    }, [value, format]);

    const clampValue = (val: number) => {
      let clamped = val;
      if (min !== undefined) clamped = Math.max(min, clamped);
      if (max !== undefined) clamped = Math.min(max, clamped);
      return clamped;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/[^0-9.\-]/g, "");
      setDisplayValue(raw);

      const parsed = parseFloat(raw);
      if (!isNaN(parsed)) {
        onChange?.(clampValue(parsed));
      }
    };

    const handleBlur = () => {
      const parsed = parseFloat(displayValue);
      if (!isNaN(parsed)) {
        const clamped = clampValue(parsed);
        onChange?.(clamped);
        setDisplayValue(format ? format(clamped) : String(clamped));
      } else {
        setDisplayValue(format ? format(value) : String(value));
      }
    };

    const increment = () => {
      const newVal = clampValue(value + step);
      onChange?.(newVal);
    };

    const decrement = () => {
      const newVal = clampValue(value - step);
      onChange?.(newVal);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        increment();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        decrement();
      }
    };

    return (
      <div className={cn("relative", className)}>
        <div className="flex items-center">
          {prefix && (
            <span className="absolute left-3 text-sm text-muted-foreground pointer-events-none z-10">
              {prefix}
            </span>
          )}
          <input
            ref={ref}
            type="text"
            inputMode="decimal"
            value={displayValue}
            onChange={handleChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            className={cn(
              "flex w-full rounded-md border border-border bg-transparent text-foreground shadow-sm transition-all duration-200 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50",
              sizeClasses[size],
              showControls ? "rounded-r-none border-r-0" : "",
              prefix ? "pl-7" : "px-3",
              suffix ? "pr-7" : "",
              error && "border-danger focus-visible:ring-danger/30 focus-visible:border-danger",
              !showControls && "px-3"
            )}
            {...props}
          />
          {suffix && (
            <span
              className={cn(
                "absolute text-sm text-muted-foreground pointer-events-none z-10",
                showControls ? "right-10" : "right-3"
              )}
            >
              {suffix}
            </span>
          )}
          {showControls && (
            <div className="flex flex-col">
              <button
                type="button"
                onClick={increment}
                disabled={disabled || (max !== undefined && value >= max)}
                className={cn(
                  "flex items-center justify-center border border-border border-l-0 rounded-tr-md bg-muted hover:bg-muted/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
                  size === "sm" ? "h-4 w-7" : size === "lg" ? "h-6 w-8" : "h-5 w-7"
                )}
              >
                <Plus className={cn(size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3")} />
              </button>
              <button
                type="button"
                onClick={decrement}
                disabled={disabled || (min !== undefined && value <= min)}
                className={cn(
                  "flex items-center justify-center border border-border border-l-0 border-t-0 rounded-br-md bg-muted hover:bg-muted/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
                  size === "sm" ? "h-4 w-7" : size === "lg" ? "h-6 w-8" : "h-5 w-7"
                )}
              >
                <Minus className={cn(size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3")} />
              </button>
            </div>
          )}
        </div>
        {errorMessage && (
          <p className="mt-1 text-xs text-danger">{errorMessage}</p>
        )}
      </div>
    );
  }
);
NumberInput.displayName = "NumberInput";

export { NumberInput, type NumberInputProps };
