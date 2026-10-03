import * as React from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  value?: string;
  onChange?: (value: string) => void;
  debounceMs?: number;
  onClear?: () => void;
  error?: boolean;
  errorMessage?: string;
}

const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  (
    {
      className,
      value: controlledValue,
      onChange,
      debounceMs = 300,
      onClear,
      placeholder = "Search...",
      error,
      errorMessage,
      ...props
    },
    ref
  ) => {
    const [internalValue, setInternalValue] = React.useState(controlledValue ?? "");
    const debounceTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    React.useEffect(() => {
      if (controlledValue !== undefined) {
        setInternalValue(controlledValue);
      }
    }, [controlledValue]);

    const handleChange = React.useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setInternalValue(newValue);

        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = setTimeout(() => {
          onChange?.(newValue);
        }, debounceMs);
      },
      [onChange, debounceMs]
    );

    const handleClear = React.useCallback(() => {
      setInternalValue("");
      onChange?.("");
      onClear?.();
    }, [onChange, onClear]);

    React.useEffect(() => {
      return () => {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
      };
    }, []);

    return (
      <div className="relative w-full">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={ref}
          type="text"
          value={internalValue}
          onChange={handleChange}
          placeholder={placeholder}
          className={cn(
            "flex h-8 w-full rounded border border-border bg-card pl-8 pr-8 text-[13px] text-foreground transition-colors duration-100 placeholder:text-muted-foreground focus-visible:outline-1 focus-visible:outline-offset-0 focus-visible:border-primary focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60",
            error && "border-danger focus-visible:border-danger focus-visible:outline-danger",
            className
          )}
          {...props}
        />
        {internalValue && (
          <button
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            type="button"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        {errorMessage && (
          <p className="mt-1 text-[11px] text-danger">{errorMessage}</p>
        )}
      </div>
    );
  }
);
SearchInput.displayName = "SearchInput";

export { SearchInput, type SearchInputProps };
