import * as React from "react";

type ToastVariant = "default" | "destructive" | "success" | "warning" | "info";

interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextType {
  toasts: Toast[];
  toast: (props: Omit<Toast, "id">) => void;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

let toastCount = 0;

function genId() {
  toastCount = (toastCount + 1) % Number.MAX_SAFE_INTEGER;
  return toastCount.toString();
}

function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);


  const toast = React.useCallback(
    (props: Omit<Toast, "id">) => {
      const id = genId();
      const newToast = { ...props, id };
      setToasts((prev) => [...prev, newToast]);

      const duration = props.duration ?? 5000;
      if (duration > 0) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, duration);
      }
    },
    []
  );

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const dismissAll = React.useCallback(() => {
    setToasts([]);
  }, []);

  React.useEffect(() => {
    setToastHandler(toast);
  }, [toast]);

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss, dismissAll }}>
      {children}
    </ToastContext.Provider>
  );
}

function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

export type { Toast, ToastVariant, ToastContextType };
export { ToastProvider, useToast, genId };


let globalToast: ((props: Omit<Toast, 'id'>) => void) | null = null;

export function toast(props: Omit<Toast, 'id'>) {
  if (globalToast) {
    globalToast(props);
  } else if (typeof console !== 'undefined') {
    console.info('[toast]', props.title ?? '', props.description ?? '');
  }
}

export const setToastHandler = (fn: (props: Omit<Toast, 'id'>) => void) => {
  globalToast = fn;
};

