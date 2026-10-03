import { AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import type { ConfirmOptions } from '@/hooks/useConfirm';

interface ConfirmDialogProps {
  isOpen: boolean;
  options: ConfirmOptions & {
    onConfirm: () => void;
    onCancel: () => void;
  };
}

const variantConfig = {
  danger: {
    icon: AlertTriangle,
    iconBg: 'rgba(239, 68, 68, 0.1)',
    iconColor: 'rgb(var(--color-error))',
    buttonBg: 'rgb(var(--color-error))',
  },
  warning: {
    icon: AlertCircle,
    iconBg: 'rgba(245, 158, 11, 0.1)',
    iconColor: 'rgb(var(--color-warning))',
    buttonBg: 'rgb(var(--color-warning))',
  },
  info: {
    icon: Info,
    iconBg: 'rgba(59, 130, 246, 0.1)',
    iconColor: 'rgb(var(--color-info))',
    buttonBg: 'rgb(var(--color-info))',
  },
};

export default function ConfirmDialog({ isOpen, options }: ConfirmDialogProps) {
  const {
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'danger',
    onConfirm,
    onCancel,
  } = options;

  const config = variantConfig[variant];
  const Icon = config.icon;

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
          <div className="relative z-10 mx-4 w-full max-w-md rounded border p-4 shadow-lg" style={{ background: 'rgb(var(--color-card))', borderColor: 'rgb(var(--color-border))', }}>
            <button
              onClick={onCancel}
              className="absolute right-2 top-2 rounded p-1 transition-colors hover:bg-[rgb(var(--color-sidebar))]"
              style={{ color: 'rgb(var(--color-muted))' }}
              aria-label="Close"
            >
              <X size={16} />
            </button>

            <div className="flex items-start gap-3">
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm"
                style={{ background: config.iconBg }}
              >
                <Icon size={16} style={{ color: config.iconColor }} />
              </div>
              <div className="min-w-0 flex-1 pr-6">
                <h3
                  className="text-[15px] font-semibold"
                  style={{ color: 'rgb(var(--color-text))' }}
                >
                  {title}
                </h3>
                <p
                  className="mt-1 text-[13px] leading-relaxed"
                  style={{ color: 'rgb(var(--color-text-secondary))' }}
                >
                  {message}
                </p>
              </div>
            </div>

            <div className="mt-2 flex justify-end gap-2">
              <button
                onClick={onCancel}
                className="h-8 rounded border px-3 text-[13px] font-medium transition-colors hover:bg-[rgb(var(--color-sidebar))]"
                style={{
                  borderColor: 'rgb(var(--color-border))',
                  color: 'rgb(var(--color-text-secondary))',
                }}
              >
                {cancelText}
              </button>
              <button
                onClick={onConfirm}
                className="h-8 rounded px-3 text-[13px] font-medium text-white transition-opacity hover:opacity-90"
                style={{ background: config.buttonBg }}
              >
                {confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
