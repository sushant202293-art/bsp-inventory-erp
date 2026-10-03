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
  sm: "h-7 text-xs",
  default: "h-8 text-[13px]",
  lg: "h-9 text-sm",
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
              "flex w-full rounded border border-border bg-card text-foreground transition-colors duration-100 placeholder:text-muted-foreground tabular-nums focus-visible:outline-1 focus-visible:outline-offset-0 focus-visible:border-primary focus-visible:outline-primary disabled:cursor-not-allowed disabled:bg-sidebar disabled:opacity-60",
              sizeClasses[size],
              showControls ? "rounded-r-none border-r-0" : "",
              prefix ? "pl-6" : "px-2.5",
              suffix ? "pr-6" : "",
              error && "border-danger focus-visible:border-danger focus-visible:outline-danger",
              !showControls && "px-2.5"
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
                  "flex items-center justify-center border border-border border-l-0 rounded-tr-sm bg-sidebar hover:bg-border transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
                  size === "sm" ? "h-3.5 w-6" : size === "lg" ? "h-[18px] w-7" : "h-4 w-6"
                )}
              >
                <Plus className={cn(size === "sm" ? "h-2 w-2" : "h-2.5 w-2.5")} />
              </button>
              <button
                type="button"
                onClick={decrement}
                disabled={disabled || (min !== undefined && value <= min)}
                className={cn(
                  "flex items-center justify-center border border-border border-l-0 border-t-0 rounded-br-sm bg-sidebar hover:bg-border transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
                  size === "sm" ? "h-3.5 w-6" : size === "lg" ? "h-[18px] w-7" : "h-4 w-6"
                )}
              >
                <Minus className={cn(size === "sm" ? "h-2 w-2" : "h-2.5 w-2.5")} />
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
