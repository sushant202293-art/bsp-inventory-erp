import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  Check,
  CheckCheck,
  Package,
  AlertTriangle,
  CreditCard,
  ShoppingCart,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: string;
  read: boolean;
  icon?: string;
  link?: string;
}

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    title: 'Low Stock Alert',
    message: 'Laptop Dell XPS 15 is below reorder level (5 units remaining)',
    type: 'warning',
    timestamp: '2 minutes ago',
    read: false,
    icon: 'alert-triangle',
    link: '/stock/low-stock',
  },
  {
    id: '2',
    title: 'New Sale Created',
    message: 'Invoice INV-2026-09-001 created for ₹45,000',
    type: 'success',
    timestamp: '15 minutes ago',
    read: false,
    icon: 'shopping-cart',
    link: '/transactions/sales',
  },
  {
    id: '3',
    title: 'Payment Received',
    message: 'Payment of ₹25,000 received from Acme Corp',
    type: 'info',
    timestamp: '1 hour ago',
    read: false,
    icon: 'credit-card',
    link: '/payments/received',
  },
  {
    id: '4',
    title: 'Stock Adjusted',
    message: '50 units added for Product: Wireless Mouse',
    type: 'info',
    timestamp: '2 hours ago',
    read: true,
    icon: 'package',
    link: '/stock/movements',
  },
  {
    id: '5',
    title: 'Order Overdue',
    message: 'Purchase Order PO-2026-09-003 is overdue by 3 days',
    type: 'error',
    timestamp: '3 hours ago',
    read: true,
    icon: 'alert-triangle',
    link: '/transactions/purchase-orders',
  },
];

const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  'alert-triangle': AlertTriangle,
  'shopping-cart': ShoppingCart,
  'credit-card': CreditCard,
  'package': Package,
};

const typeColors: Record<string, string> = {
  info: 'var(--color-info)',
  success: 'var(--color-success)',
  warning: 'var(--color-warning)',
  error: 'var(--color-error)',
};

export default function NotificationPanel({ isOpen, onClose }: NotificationPanelProps) {
  const navigate = useNavigate();

  const notifications = useMemo(() => MOCK_NOTIFICATIONS, []);
  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const handleNotificationClick = (notification: Notification) => {
    if (notification.link) {
      navigate(notification.link);
    }
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full z-50 mt-2 w-96 rounded-xl border shadow-xl"
            style={{
              background: 'var(--color-card)',
              borderColor: 'var(--color-border)',
            }}
          >
            <div
              className="flex items-center justify-between border-b px-4 py-3"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <div className="flex items-center gap-2">
                <Bell size={18} style={{ color: 'var(--color-text)' }} />
                <h3
                  className="font-semibold"
                  style={{ color: 'var(--color-text)' }}
                >
                  Notifications
                </h3>
                {unreadCount > 0 && (
                  <span
                    className="flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold text-white"
                    style={{ background: 'var(--color-error)' }}
                  >
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  className="rounded p-1 transition-colors hover:bg-[var(--color-backgroundAlt)]"
                  style={{ color: 'var(--color-primary)' }}
                  title="Mark all as read"
                >
                  <CheckCheck size={16} />
                </button>
                <button
                  onClick={onClose}
                  className="rounded p-1 transition-colors hover:bg-[var(--color-backgroundAlt)]"
                  style={{ color: 'var(--color-textMuted)' }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Bell
                    size={40}
                    style={{ color: 'var(--color-textMuted)' }}
                    className="mb-3 opacity-50"
                  />
                  <p
                    className="text-sm font-medium"
                    style={{ color: 'var(--color-textSecondary)' }}
                  >
                    No notifications
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: 'var(--color-textMuted)' }}
                  >
                    You're all caught up!
                  </p>
                </div>
              ) : (
                notifications.map((notification) => {
                  const Icon = iconMap[notification.icon || 'info'] || Bell;
                  return (
                    <button
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={cn(
                        'flex w-full items-start gap-3 border-b px-4 py-3 text-left transition-colors hover:bg-[var(--color-backgroundAlt)]',
                        !notification.read && 'bg-[var(--color-backgroundAlt)]/50'
                      )}
                      style={{ borderColor: 'var(--color-borderLight)' }}
                    >
                      <div
                        className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                        style={{
                          background: `${typeColors[notification.type]}20`,
                          color: typeColors[notification.type],
                        }}
                      >
                        <Icon size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p
                            className="truncate text-sm font-medium"
                            style={{ color: 'var(--color-text)' }}
                          >
                            {notification.title}
                          </p>
                          {!notification.read && (
                            <span
                              className="h-2 w-2 shrink-0 rounded-full"
                              style={{ background: 'var(--color-primary)' }}
                            />
                          )}
                        </div>
                        <p
                          className="mt-0.5 line-clamp-2 text-xs"
                          style={{ color: 'var(--color-textSecondary)' }}
                        >
                          {notification.message}
                        </p>
                        <p
                          className="mt-1 text-[10px]"
                          style={{ color: 'var(--color-textMuted)' }}
                        >
                          {notification.timestamp}
                        </p>
                      </div>
                      {!notification.read && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                          className="mt-1 shrink-0 rounded p-1 transition-colors hover:bg-[var(--color-background)]"
                          title="Mark as read"
                          style={{ color: 'var(--color-textMuted)' }}
                        >
                          <Check size={12} />
                        </button>
                      )}
                    </button>
                  );
                })
              )}
            </div>

            <div
              className="border-t px-4 py-2.5"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <button
                onClick={() => {
                  navigate('/notifications');
                  onClose();
                }}
                className="w-full rounded-lg py-1.5 text-center text-sm font-medium transition-colors hover:bg-[var(--color-backgroundAlt)]"
                style={{ color: 'var(--color-primary)' }}
              >
                View All Notifications
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
