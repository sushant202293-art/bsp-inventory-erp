import { motion, AnimatePresence } from 'framer-motion';
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
    iconColor: 'var(--color-error)',
    buttonBg: 'var(--color-error)',
  },
  warning: {
    icon: AlertCircle,
    iconBg: 'rgba(245, 158, 11, 0.1)',
    iconColor: 'var(--color-warning)',
    buttonBg: 'var(--color-warning)',
  },
  info: {
    icon: Info,
    iconBg: 'rgba(59, 130, 246, 0.1)',
    iconColor: 'var(--color-info)',
    buttonBg: 'var(--color-info)',
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
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onCancel}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="relative z-10 mx-4 w-full max-w-md rounded-2xl border p-6 shadow-2xl"
            style={{
              background: 'var(--color-card)',
              borderColor: 'var(--color-border)',
            }}
          >
            <button
              onClick={onCancel}
              className="absolute right-4 top-4 rounded-lg p-1 transition-colors hover:bg-[var(--color-backgroundAlt)]"
              style={{ color: 'var(--color-textMuted)' }}
            >
              <X size={18} />
            </button>

            <div className="flex items-start gap-4">
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
                style={{ background: config.iconBg }}
              >
                <Icon size={24} style={{ color: config.iconColor }} />
              </div>
              <div className="min-w-0 flex-1">
                <h3
                  className="text-lg font-semibold"
                  style={{ color: 'var(--color-text)' }}
                >
                  {title}
                </h3>
                <p
                  className="mt-2 text-sm leading-relaxed"
                  style={{ color: 'var(--color-textSecondary)' }}
                >
                  {message}
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={onCancel}
                className="rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-[var(--color-backgroundAlt)]"
                style={{
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-textSecondary)',
                }}
              >
                {cancelText}
              </button>
              <button
                onClick={onConfirm}
                className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
                style={{ background: config.buttonBg }}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
