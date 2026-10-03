import { useMemo } from 'react';
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
    message: 'Invoice INV-2026-09-001 created for Ã¢â€šÂ¹45,000',
    type: 'success',
    timestamp: '15 minutes ago',
    read: false,
    icon: 'shopping-cart',
    link: '/transactions/sales',
  },
  {
    id: '3',
    title: 'Payment Received',
    message: 'Payment of Ã¢â€šÂ¹25,000 received from Acme Corp',
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
  info: 'rgb(var(--color-info))',
  success: 'rgb(var(--color-success))',
  warning: 'rgb(var(--color-warning))',
  error: 'rgb(var(--color-error))',
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
    <>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={onClose} />
          <div className="absolute right-0 top-full z-50 mt-2 w-96 rounded border shadow-lg" style={{ background: 'rgb(var(--color-card))', borderColor: 'rgb(var(--color-border))', }}>
            <div
              className="flex items-center justify-between border-b px-3 py-2"
              style={{ borderColor: 'rgb(var(--color-border))' }}
            >
              <div className="flex items-center gap-2">
                <Bell size={15} style={{ color: 'rgb(var(--color-text))' }} />
                <h3
                  className="text-[13px] font-semibold"
                  style={{ color: 'rgb(var(--color-text))' }}
                >
                  Notifications
                </h3>
                {unreadCount > 0 && (
                  <span
                    className="flex h-4 min-w-[16px] items-center justify-center rounded-sm px-1 text-[10px] font-bold text-white"
                    style={{ background: 'rgb(var(--color-error))' }}
                  >
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  className="rounded p-1 transition-colors hover:bg-[rgb(var(--color-sidebar))]"
                  style={{ color: 'rgb(var(--color-primary))' }}
                  title="Mark all as read"
                >
                  <CheckCheck size={16} />
                </button>
                <button
                  onClick={onClose}
                  className="rounded p-1 transition-colors hover:bg-[rgb(var(--color-sidebar))]"
                  style={{ color: 'rgb(var(--color-muted))' }}
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
                    style={{ color: 'rgb(var(--color-muted))' }}
                    className="mb-3 opacity-50"
                  />
                  <p
                    className="text-sm font-medium"
                    style={{ color: 'rgb(var(--color-text-secondary))' }}
                  >
                    No notifications
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: 'rgb(var(--color-muted))' }}
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
                        'flex w-full items-start gap-3 border-b px-4 py-3 text-left transition-colors hover:bg-[rgb(var(--color-sidebar))]',
                        !notification.read && 'bg-[rgb(var(--color-sidebar))]/50'
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
                            style={{ color: 'rgb(var(--color-text))' }}
                          >
                            {notification.title}
                          </p>
                          {!notification.read && (
                            <span
                              className="h-2 w-2 shrink-0 rounded-full"
                              style={{ background: 'rgb(var(--color-primary))' }}
                            />
                          )}
                        </div>
                        <p
                          className="mt-0.5 line-clamp-2 text-xs"
                          style={{ color: 'rgb(var(--color-text-secondary))' }}
                        >
                          {notification.message}
                        </p>
                        <p
                          className="mt-1 text-[10px]"
                          style={{ color: 'rgb(var(--color-muted))' }}
                        >
                          {notification.timestamp}
                        </p>
                      </div>
                      {!notification.read && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                          className="mt-1 shrink-0 rounded p-1 transition-colors hover:bg-[rgb(var(--color-background))]"
                          title="Mark as read"
                          style={{ color: 'rgb(var(--color-muted))' }}
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
              style={{ borderColor: 'rgb(var(--color-border))' }}
            >
              <button
                onClick={() => {
                  navigate('/notifications');
                  onClose();
                }}
                className="w-full rounded-lg py-1.5 text-center text-sm font-medium transition-colors hover:bg-[rgb(var(--color-sidebar))]"
                style={{ color: 'rgb(var(--color-primary))' }}
              >
                View All Notifications
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
