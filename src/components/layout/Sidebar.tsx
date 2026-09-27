import { useState, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LogOut,
  ChevronLeft,
  ChevronRight,
  X,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { menuConfig, type MenuItem } from '@/config/menu.config';
import { useAuth } from '@/contexts/AuthContext';
import { useCompanyView } from '@/contexts/CompanyContext';
import { usePermissions } from '@/contexts/PermissionContext';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  onClose: () => void;
  isMobile: boolean;
}

function NavItem({
  item,
  collapsed,
  isChild = false,
  hasPermission,
}: {
  item: MenuItem;
  collapsed: boolean;
  isChild?: boolean;
  hasPermission: (item: MenuItem) => boolean;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);

  const isActive = useMemo(() => {
    if (item.path === '/dashboard') {
      return location.pathname === item.path;
    }
    return location.pathname.startsWith(item.path);
  }, [location.pathname, item.path]);

  const hasChildren = item.children && item.children.length > 0;

  const handleClick = useCallback(() => {
    if (hasChildren) {
      if (collapsed) {
        navigate(item.path);
      } else {
        setExpanded((prev) => !prev);
      }
    } else {
      navigate(item.path);
    }
  }, [hasChildren, collapsed, navigate, item.path]);

  const isExpanded = expanded || (hasChildren && !collapsed && isActive);

  // Every hook must run before this early return, otherwise the hook order
  // changes whenever the permission set changes and React throws.
  if (!hasPermission(item)) return null;

  const Icon: LucideIcon = item.icon;

  return (
    <div>
      <button
        onClick={handleClick}
        className={cn(
          'group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
          collapsed && !isChild && 'justify-center px-2',
          isChild && 'ml-2 pl-8',
          isActive
            ? 'text-[var(--color-sidebarTextActive)]'
            : 'text-[var(--color-sidebarText)] hover:text-[var(--color-sidebarTextActive)]',
          isActive && 'bg-[var(--color-sidebarActive)]'
        )}
        title={collapsed ? item.label : undefined}
        aria-expanded={hasChildren ? isExpanded : undefined}
      >
        {isActive && (
          <motion.div
            layoutId="sidebar-active"
            className="absolute inset-0 rounded-lg bg-[var(--color-sidebarActive)]"
            initial={false}
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
          />
        )}
        <span className="relative z-10 flex items-center gap-3">
          <Icon
            size={20}
            className={cn(
              'shrink-0 transition-colors',
              isActive
                ? 'text-[var(--color-sidebarTextActive)]'
                : 'text-[var(--color-sidebarText)] group-hover:text-[var(--color-sidebarTextActive)]'
            )}
          />
          {!collapsed && (
            <span className="truncate">{item.label}</span>
          )}
        </span>
        {!collapsed && hasChildren && (
          <motion.span
            className="relative z-10 ml-auto"
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronRight size={14} />
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {hasChildren && !collapsed && isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="py-1">
              {item.children?.map((child) => (
                <NavItem
                  key={child.id}
                  item={child}
                  collapsed={collapsed}
                  isChild
                  hasPermission={hasPermission}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Sidebar({ collapsed, onToggle, onClose, isMobile }: SidebarProps) {
  const { profile, user, signOut } = useAuth();
  const company = useCompanyView();
  const { canAccess, permissions } = usePermissions();
  const navigate = useNavigate();

  const handleLogout = useCallback(() => {
    signOut();
    navigate('/login');
  }, [signOut, navigate]);

  // A parent with no visible children is hidden so the sidebar never shows
  // an expandable group that expands to nothing.
  const isSuperAdmin = profile?.role === 'owner' || profile?.role === 'admin';

  const hasPermission = useCallback(
    (item: MenuItem): boolean => {
      if (!item.module) return true;
      if (isSuperAdmin) return true;
      if (permissions.length === 0) return false;
      if (canAccess(item.module)) return true;
      return (item.children ?? []).some((child) =>
        child.module ? canAccess(child.module) : false
      );
    },
    [canAccess, isSuperAdmin, permissions.length]
  );

  const visibleSections = useMemo(
    () =>
      menuConfig
        .map((section) => ({
          ...section,
          items: section.items.filter(hasPermission),
        }))
        .filter((section) => section.items.length > 0),
    [hasPermission]
  );

  return (
    <div className="flex h-full flex-col">
      <div
        className={cn(
          'flex h-16 shrink-0 items-center border-b px-4',
          collapsed && 'justify-center px-2'
        )}
        style={{ borderColor: 'var(--color-border)' }}
      >
        {(!collapsed || isMobile) && (
          <div className="flex min-w-0 items-center gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white"
              style={{ background: 'var(--color-primary)' }}
            >
              {company.name ? company.name.charAt(0) : 'B'}
            </div>
            <div className="min-w-0">
              <h1
                className="truncate text-sm font-bold"
                style={{ color: 'var(--color-text)' }}
              >
                {company.name || 'BSP Inventory'}
              </h1>
              {company.tagline && (
                <p
                  className="truncate text-xs"
                  style={{ color: 'var(--color-textMuted)' }}
                >
                  {company.tagline}
                </p>
              )}
            </div>
          </div>
        )}
        {collapsed && !isMobile && (
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold text-white"
            style={{ background: 'var(--color-primary)' }}
          >
            {company.name ? company.name.charAt(0) : 'B'}
          </div>
        )}

        {isMobile && (
          <button
            onClick={onClose}
            className="absolute right-3 top-4 rounded-lg p-1.5 transition-colors hover:bg-[var(--color-sidebarHover)]"
            style={{ color: 'var(--color-sidebarText)' }}
          >
            <X size={18} />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {visibleSections.map((section, sectionIndex) => (
          <div key={sectionIndex} className={cn(sectionIndex > 0 && 'mt-6')}>
            {section.title && !collapsed && (
              <h3
                className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: 'var(--color-textMuted)' }}
              >
                {section.title}
              </h3>
            )}
            {section.title && collapsed && (
              <div
                className="mx-auto mb-2 h-px w-6"
                style={{ background: 'var(--color-border)' }}
              />
            )}
            <div className="space-y-1">
              {section.items.map((item) => (
                <NavItem
                  key={item.id}
                  item={item}
                  collapsed={collapsed}
                  hasPermission={hasPermission}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div
        className={cn(
          'shrink-0 border-t px-3 py-3',
          collapsed && 'px-2'
        )}
        style={{ borderColor: 'var(--color-border)' }}
      >
        {!collapsed && (
          <button
            onClick={onToggle}
            className="mb-2 flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs transition-colors hover:bg-[var(--color-sidebarHover)]"
            style={{ color: 'var(--color-sidebarText)' }}
          >
            <ChevronLeft size={16} />
            <span>Collapse</span>
          </button>
        )}
        {collapsed && !isMobile && (
          <button
            onClick={onToggle}
            className="mb-2 flex w-full items-center justify-center rounded-lg px-3 py-2 transition-colors hover:bg-[var(--color-sidebarHover)]"
            style={{ color: 'var(--color-sidebarText)' }}
            title="Expand sidebar"
          >
            <ChevronRight size={18} />
          </button>
        )}

        <button
          onClick={handleLogout}
          className={cn(
            'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
            collapsed && 'justify-center px-2',
            'text-[var(--color-sidebarText)] hover:text-red-400 hover:bg-red-500/10'
          )}
          title={collapsed ? 'signOut' : undefined}
        >
          <LogOut size={20} />
          {!collapsed && <span>signOut</span>}
        </button>
      </div>
    </div>
  );
}