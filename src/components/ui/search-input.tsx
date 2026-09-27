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
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={ref}
          type="text"
          value={internalValue}
          onChange={handleChange}
          placeholder={placeholder}
          className={cn(
            "flex h-10 w-full rounded-md border border-border bg-transparent pl-9 pr-9 py-2 text-sm text-foreground shadow-sm transition-all duration-200 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-danger focus-visible:ring-danger/30 focus-visible:border-danger",
            className
          )}
          {...props}
        />
        {internalValue && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        {errorMessage && (
          <p className="mt-1 text-xs text-danger">{errorMessage}</p>
        )}
      </div>
    );
  }
);
SearchInput.displayName = "SearchInput";

export { SearchInput, type SearchInputProps };
