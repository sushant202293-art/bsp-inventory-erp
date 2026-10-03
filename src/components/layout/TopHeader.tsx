import { useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Menu, Search, Bell, Sun, Moon, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import NotificationPanel from './NotificationPanel';
import ProfileDropdown from './ProfileDropdown';

interface TopHeaderProps {
  onToggleSidebar: () => void;
  sidebarCollapsed: boolean;
}

export default function TopHeader({ onToggleSidebar }: TopHeaderProps) {
  const { user, profile } = useAuth();
  const { setTheme, isDark } = useTheme();
  const location = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const toggleSearch = useCallback(() => {
    setSearchOpen((prev) => {
      if (prev) setSearchQuery('');
      return !prev;
    });
  }, []);

  return (
    <div className="flex h-full w-full items-center justify-between gap-3 px-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <button
          onClick={onToggleSidebar}
          className="rounded p-1.5 transition-colors hover:bg-sidebar"
          style={{ color: 'rgb(var(--color-text-secondary))' }}
          aria-label="Toggle sidebar"
        >
          <Menu size={18} />
        </button>

        <span
          className="hidden truncate text-[13px] font-semibold md:inline"
          style={{ color: 'rgb(var(--color-text))' }}
        >
          {getPageTitle(location.pathname)}
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        <div className="relative">
          {searchOpen ? (
            <div className="flex items-center">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search... (Ctrl+K)"
                autoFocus
                className="h-8 w-44 rounded border border-border bg-card px-2.5 text-[13px] outline-none transition-colors focus:border-primary sm:w-64"
                style={{ color: 'rgb(var(--color-text))' }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') toggleSearch();
                }}
              />
              <button
                onClick={toggleSearch}
                className="ml-1 rounded p-1 hover:bg-sidebar"
                style={{ color: 'rgb(var(--color-muted))' }}
                aria-label="Close search"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={toggleSearch}
              className="flex h-8 items-center gap-1.5 rounded border border-border px-2 text-[13px] transition-colors hover:bg-sidebar"
              style={{
                color: 'rgb(var(--color-muted))',
              }}
              title="Search (Ctrl+K)"
            >
              <Search size={14} />
              <span className="hidden lg:inline">Search</span>
            </button>
          )}
        </div>

        <button
          onClick={() => setTheme(isDark ? 'light-professional' : 'neon-blue')}
          className="rounded p-1.5 transition-colors hover:bg-sidebar"
          style={{ color: 'rgb(var(--color-text-secondary))' }}
          title={isDark ? 'Light Mode' : 'Dark Mode'}
          aria-label="Toggle theme"
        >
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        <div className="relative">
          <button
            onClick={() => {
              setNotificationOpen((prev) => !prev);
              setProfileOpen(false);
            }}
            className="relative rounded p-1.5 transition-colors hover:bg-sidebar"
            style={{ color: 'rgb(var(--color-text-secondary))' }}
            aria-label="Notifications"
          >
            <Bell size={16} />
            <span
              className="absolute right-0.5 top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full text-[9px] font-bold text-white"
              style={{ background: 'rgb(var(--color-error))' }}
            >
              3
            </span>
          </button>
          <NotificationPanel
            isOpen={notificationOpen}
            onClose={() => setNotificationOpen(false)}
          />
        </div>

        <div className="relative">
          <button
            onClick={() => {
              setProfileOpen((prev) => !prev);
              setNotificationOpen(false);
            }}
            className="flex h-8 items-center gap-1.5 rounded px-1.5 transition-colors hover:bg-sidebar"
          >
            <div
              className="flex h-6 w-6 items-center justify-center rounded-sm text-[11px] font-bold text-white"
              style={{ background: 'rgb(var(--color-primary))' }}
            >
              {(profile?.full_name ?? user?.email ?? 'User')?.charAt(0) || 'A'}
            </div>
            <span
              className="hidden max-w-[140px] truncate text-[13px] font-medium md:inline"
              style={{ color: 'rgb(var(--color-text))' }}
            >
              {(profile?.full_name ?? user?.email ?? 'User') || 'Admin'}
            </span>
          </button>
          <ProfileDropdown
            isOpen={profileOpen}
            onClose={() => setProfileOpen(false)}
          />
        </div>
      </div>
    </div>
  );
}

function getPageTitle(path: string): string {
  if (path === '/dashboard') return 'Dashboard';
  if (path.startsWith('/products')) return 'Products';
  if (path.startsWith('/customers')) return 'Customers';
  if (path.startsWith('/suppliers')) return 'Suppliers';
  if (path.startsWith('/transactions/sales')) return 'Sales Invoices';
  if (path.startsWith('/transactions/quotations')) return 'Quotations';
  if (path.startsWith('/transactions/purchase-orders')) return 'Purchase Orders';
  if (path.startsWith('/transactions/proforma-invoices')) return 'Proforma Invoices';
  if (path.startsWith('/transactions/purchases')) return 'Purchase Invoices';
  if (path.startsWith('/stock/overview')) return 'Stock Overview';
  if (path.startsWith('/stock/movements')) return 'Stock Movements';
  if (path.startsWith('/stock/adjustments')) return 'Stock Adjustments';
  if (path.startsWith('/stock/transfers')) return 'Stock Transfers';
  if (path.startsWith('/stock/low-stock')) return 'Low Stock Alerts';
  if (path.startsWith('/stock/reorder')) return 'Reorder Level';
  if (path.startsWith('/payments/received')) return 'Payments Received';
  if (path.startsWith('/payments/paid')) return 'Payments Made';
  if (path.startsWith('/ledgers/customers')) return 'Customer Ledger';
  if (path.startsWith('/ledgers/suppliers')) return 'Supplier Ledger';
  if (path.startsWith('/reports')) return 'Reports';
  if (path.startsWith('/admin/users')) return 'User Management';
  if (path.startsWith('/settings/themes')) return 'Theme Settings';
  if (path.startsWith('/settings/backup')) return 'Backup & Restore';
  if (path.startsWith('/settings')) return 'Settings';
  return 'BSP Inventory';
}
