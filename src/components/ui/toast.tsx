import * as React from "react";
import { X, CheckCircle2, AlertCircle, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast, type Toast as ToastType } from "./use-toast";

const variantStyles: Record<string, string> = {
  default: "border-border bg-card text-foreground",
  destructive: "border-danger/50 bg-danger/10 text-danger",
  success: "border-success/50 bg-success/10 text-success",
  warning: "border-warning/50 bg-warning/10 text-warning",
  info: "border-info/50 bg-info/10 text-info",
};

const variantIcons: Record<string, React.ReactNode> = {
  default: null,
  destructive: <AlertCircle className="h-5 w-5 text-danger" />,
  success: <CheckCircle2 className="h-5 w-5 text-success" />,
  warning: <AlertTriangle className="h-5 w-5 text-warning" />,
  info: <Info className="h-5 w-5 text-info" />,
};

function ToastItem({ toast }: { toast: ToastType }) {
  const { dismiss } = useToast();
  const variant = toast.variant ?? "default";

  return (
    <div
      className={cn(
        "pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded border p-3 shadow-lg transition-all animate-in slide-in-from-right-full",
        variantStyles[variant]
      )}
    >
      {variantIcons[variant]}
      <div className="flex-1">
        {toast.title && <p className="text-sm font-semibold">{toast.title}</p>}
        {toast.description && (
          <p className="mt-1 text-sm opacity-80">{toast.description}</p>
        )}
        {toast.action && (
          <button
            onClick={toast.action.onClick}
            className="mt-2 text-sm font-medium underline hover:opacity-80"
          >
            {toast.action.label}
          </button>
        )}
      </div>
      <button
        onClick={() => dismiss(toast.id)}
        className="shrink-0 rounded-md p-1 opacity-50 transition-opacity hover:opacity-100"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function Toaster() {
  const { toasts } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex max-h-screen w-full max-w-sm flex-col gap-2">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  );
}

export { Toaster, ToastItem };
