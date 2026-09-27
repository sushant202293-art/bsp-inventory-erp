import * as React from "react";
import { format, parse, isValid } from "date-fns";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "./input";

interface DatePickerProps {
  value?: Date | string | null;
  onChange?: (date: Date | null) => void;
  placeholder?: string;
  format?: string;
  disabled?: boolean;
  error?: boolean;
  errorMessage?: string;
  className?: string;
  min?: string;
  max?: string;
}

function DatePicker({
  value,
  onChange,
  placeholder = "DD-MM-YYYY",
  format: dateFormat = "dd-MM-yyyy",
  disabled = false,
  error,
  errorMessage,
  className,
  min,
  max,
}: DatePickerProps) {
  const [inputValue, setInputValue] = React.useState("");

  React.useEffect(() => {
    if (value) {
      const date = typeof value === "string" ? new Date(value) : value;
      if (isValid(date)) {
        setInputValue(format(date, dateFormat));
      }
    } else {
      setInputValue("");
    }
  }, [value, dateFormat]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setInputValue(raw);

    if (raw.length === 10) {
      const parsed = parse(raw, dateFormat, new Date());
      if (isValid(parsed)) {
        onChange?.(parsed);
      }
    } else if (raw === "") {
      onChange?.(null);
    }
  };

  const handleBlur = () => {
    if (inputValue) {
      const parsed = parse(inputValue, dateFormat, new Date());
      if (isValid(parsed)) {
        setInputValue(format(parsed, dateFormat));
        onChange?.(parsed);
      } else {
        if (value) {
          const date = typeof value === "string" ? new Date(value) : value;
          setInputValue(format(date, dateFormat));
        } else {
          setInputValue("");
        }
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      if (value) {
        const date = typeof value === "string" ? new Date(value) : value;
        setInputValue(format(date, dateFormat));
      } else {
        setInputValue("");
      }
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <Input
          type="text"
          value={inputValue}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          error={error}
          className="pr-10"
          maxLength={10}
          min={min}
          max={max}
        />
        <Calendar className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
      </div>
      {errorMessage && (
        <p className="mt-1 text-xs text-danger">{errorMessage}</p>
      )}
    </div>
  );
}

export { DatePicker, type DatePickerProps };
