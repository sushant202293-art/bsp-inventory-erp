import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Menu,
  Search,
  Bell,
  Sun,
  Moon,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import NotificationPanel from './NotificationPanel';
import ProfileDropdown from './ProfileDropdown';

interface TopHeaderProps {
  onToggleSidebar: () => void;
  sidebarCollapsed: boolean;
}

export default function TopHeader({ onToggleSidebar, sidebarCollapsed }: TopHeaderProps) {
  const { user, profile } = useAuth();
  const { theme, setTheme, isDark } = useTheme();
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const toggleSearch = useCallback(() => {
    setSearchOpen((prev) => !prev);
    if (searchOpen) setSearchQuery('');
  }, [searchOpen]);

  const closePanels = useCallback(() => {
    setNotificationOpen(false);
    setProfileOpen(false);
    setSearchOpen(false);
  }, []);

  return (
    <div className="flex h-full w-full items-center justify-between px-4">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="rounded-lg p-2 transition-colors hover:bg-[rgb(var(--color-sidebar))]"
          style={{ color: 'rgb(var(--color-text))' }}
          aria-label="Toggle sidebar"
        >
          <Menu size={20} />
        </button>

        <div className="hidden items-center gap-2 md:flex">
          <h2
            className="text-lg font-semibold"
            style={{ color: 'rgb(var(--color-text))' }}
          >
            {getPageTitle()}
          </h2>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative">
          {searchOpen ? (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 280, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="flex items-center"
            >
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search anything... (Ctrl+K)"
                autoFocus
                className="w-full rounded-lg border px-3 py-2 pr-10 text-sm outline-none transition-colors focus:ring-2"
                style={{
                  background: 'rgb(var(--color-input))',
                  borderColor: 'rgb(var(--color-border))',
                  color: 'rgb(var(--color-text))',
                  
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') toggleSearch();
                }}
              />
              <button
                onClick={toggleSearch}
                className="absolute right-2 rounded p-1 hover:bg-[rgb(var(--color-sidebar))]"
                style={{ color: 'rgb(var(--color-muted))' }}
              >
                Ãƒâ€”
              </button>
            </motion.div>
          ) : (
            <button
              onClick={toggleSearch}
              className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors hover:bg-[rgb(var(--color-sidebar))]"
              style={{
                borderColor: 'rgb(var(--color-border))',
                color: 'rgb(var(--color-muted))',
              }}
              title="Search (Ctrl+K)"
            >
              <Search size={16} />
              <span className="hidden lg:inline">Search...</span>
              <kbd className="hidden rounded border px-1.5 py-0.5 text-[10px] font-medium lg:inline"
                style={{
                  borderColor: 'rgb(var(--color-border))',
                  color: 'rgb(var(--color-muted))',
                }}
              >
                Ã¢Å’ËœK
              </kbd>
            </button>
          )}
        </div>

        <button
          onClick={() => setTheme(isDark ? 'light-professional' : 'neon-blue')}
          className="rounded-lg p-2 transition-colors hover:bg-[rgb(var(--color-sidebar))]"
          style={{ color: 'rgb(var(--color-text-secondary))' }}
          title={isDark ? 'Light Mode' : 'Dark Mode'}
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <div className="relative">
          <button
            onClick={() => {
              setNotificationOpen((prev) => !prev);
              setProfileOpen(false);
            }}
            className="relative rounded-lg p-2 transition-colors hover:bg-[rgb(var(--color-sidebar))]"
            style={{ color: 'rgb(var(--color-text-secondary))' }}
          >
            <Bell size={18} />
            <span
              className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-white"
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
            className="flex items-center gap-2 rounded-lg p-1.5 transition-colors hover:bg-[rgb(var(--color-sidebar))]"
          >
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
              style={{ background: 'rgb(var(--color-primary))' }}
            >
              {(profile?.full_name ?? user?.email ?? "User")?.charAt(0) || 'A'}
            </div>
            <div className="hidden text-left md:block">
              <p
                className="text-sm font-medium leading-tight"
                style={{ color: 'rgb(var(--color-text))' }}
              >
                {(profile?.full_name ?? user?.email ?? "User") || 'Admin'}
              </p>
              <p
                className="text-xs capitalize"
                style={{ color: 'rgb(var(--color-muted))' }}
              >
                {user?.role || 'admin'}
              </p>
            </div>
            <ChevronDown
              size={14}
              className="hidden md:block"
              style={{ color: 'rgb(var(--color-muted))' }}
            />
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

function getPageTitle(): string {
  const path = window.location.pathname;
  if (path === '/dashboard') return 'Dashboard';
  if (path.startsWith('/products')) return 'Products';
  if (path.startsWith('/customers')) return 'Customers';
  if (path.startsWith('/suppliers')) return 'Suppliers';
  if (path.startsWith('/transactions/sales')) return 'Sales Invoices';
  if (path.startsWith('/transactions/quotations')) return 'Quotations';
  if (path.startsWith('/transactions/purchase-orders')) return 'Purchase Orders';
  if (path.startsWith('/transactions/proforma-invoices')) return 'Proforma Invoices';
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
