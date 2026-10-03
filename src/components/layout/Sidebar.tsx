import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
import { useCompany, useCompanyView } from '@/contexts/CompanyContext';
import { usePermissions } from '@/contexts/PermissionContext';
import { isAdminRole } from '@/lib/permissions';

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
          'relative flex h-8 w-full items-center gap-2.5 text-[13px] transition-colors duration-100',
          collapsed && !isChild && 'justify-center px-0',
          isChild ? 'pl-8 pr-2' : 'pl-2.5 pr-2',
          isActive
            ? 'bg-[var(--color-sidebarActive)] font-semibold text-[var(--color-sidebarTextActive)]'
            : 'font-medium text-[var(--color-sidebarText)] hover:bg-[var(--color-sidebarHover)] hover:text-[var(--color-sidebarTextActive)]'
        )}
        title={collapsed ? item.label : undefined}
        aria-expanded={hasChildren ? isExpanded : undefined}
      >
        {isActive && (
          <span
            className="absolute left-0 top-0 h-full w-[3px]"
            style={{ background: 'rgb(var(--color-primary))' }}
          />
        )}
        <Icon size={16} className="shrink-0" />
        {!collapsed && <span className="truncate text-left">{item.label}</span>}
        {!collapsed && hasChildren && (
          <ChevronRight
            size={13}
            className={cn('ml-auto shrink-0 transition-transform duration-150', isExpanded && 'rotate-90')}
          />
        )}
      </button>

      <>
        {hasChildren && !collapsed && isExpanded && (
          <div className="overflow-hidden">
            <div className="py-0.5">
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
          </div>
        )}
      </>
    </div>
  );
}

/**
 * Square company logo for the sidebar brand area.
 *
 * The frame never changes size with the image: it fills with `object-cover`,
 * so square, landscape and portrait logos all fit (cropping rather than
 * distorting). Falls back to the company initial when no logo has been
 * uploaded, and to a skeleton while the company is still loading so the
 * wrong initial is never flashed.
 */
function CompanyLogo({ className }: { className?: string }) {
  const { company, loading } = useCompany();
  const [failed, setFailed] = useState(false);
  const logoUrl = company?.logo_url ?? null;
  const initial = company?.name?.trim()?.charAt(0).toUpperCase() || 'B';

  useEffect(() => {
    setFailed(false);
  }, [logoUrl]);

  const base =
    'flex shrink-0 items-center justify-center overflow-hidden rounded-sm text-xs font-bold text-white';

  if (loading) {
    return <div className={cn(base, 'bg-muted', className)} aria-hidden="true" />;
  }

  if (logoUrl && !failed) {
    return (
      <div
        className={cn(base, 'border border-border', className)}
        style={{ background: 'rgb(var(--color-muted))' }}
      >
        <img
          src={logoUrl}
          alt={`${company?.name || 'Company'} logo`}
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(base, className)}
      style={{ background: 'rgb(var(--color-primary))' }}
      aria-label={`${company?.name || 'Company'} logo`}
    >
      {initial}
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
  const isSuperAdmin = isAdminRole(profile?.role);

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
          'flex h-12 shrink-0 items-center gap-2 border-b px-3',
          collapsed && 'justify-center px-0'
        )}
        style={{ borderColor: 'rgb(var(--color-border))' }}
      >
        {(!collapsed || isMobile) && (
          <div className="flex min-w-0 items-center gap-2">
            <CompanyLogo className="h-7 w-7" />
            <div className="min-w-0">
              <h1
                className="truncate text-[13px] font-bold leading-tight"
                style={{ color: 'rgb(var(--color-text))' }}
              >
                {company.name || 'BSP Inventory'}
              </h1>
              {company.tagline && (
                <p
                  className="truncate text-[10px] leading-tight"
                  style={{ color: 'rgb(var(--color-muted))' }}
                >
                  {company.tagline}
                </p>
              )}
            </div>
          </div>
        )}
        {collapsed && !isMobile && <CompanyLogo className="h-7 w-7" />}

        {isMobile && (
          <button
            onClick={onClose}
            className="ml-auto rounded p-1 transition-colors hover:bg-[var(--color-sidebarHover)]"
            style={{ color: 'var(--color-sidebarText)' }}
            aria-label="Close menu"
          >
            <X size={16} />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2">
        {visibleSections.map((section, sectionIndex) => (
          <div key={sectionIndex} className={cn(sectionIndex > 0 && 'mt-3 border-t pt-3')}
            style={sectionIndex > 0 ? { borderColor: 'rgb(var(--color-border))' } : undefined}
          >
            {section.title && !collapsed && (
              <h3
                className="mb-1 px-2.5 text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: 'rgb(var(--color-muted))' }}
              >
                {section.title}
              </h3>
            )}
            {section.title && collapsed && (
              <div
                className="mx-auto mb-2 h-px w-5"
                style={{ background: 'rgb(var(--color-border))' }}
              />
            )}
            <div className="space-y-0.5">
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
        className={cn('shrink-0 border-t p-1.5', collapsed && 'px-1')}
        style={{ borderColor: 'rgb(var(--color-border))' }}
      >
        <button
          onClick={onToggle}
          className={cn(
            'hidden h-7 w-full items-center gap-2 rounded px-2 text-[11px] font-medium transition-colors hover:bg-[var(--color-sidebarHover)] lg:flex',
            collapsed && 'justify-center px-0'
          )}
          style={{ color: 'var(--color-sidebarText)' }}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          {!collapsed && <span>Collapse</span>}
        </button>

        <button
          onClick={handleLogout}
          className={cn(
            'flex h-8 w-full items-center gap-2.5 rounded px-2.5 text-[13px] font-medium transition-colors hover:bg-red-500/10 hover:text-red-500',
            collapsed && 'justify-center px-0'
          )}
          style={{ color: 'var(--color-sidebarText)' }}
          title={collapsed ? 'Log Out' : undefined}
        >
          <LogOut size={16} className="shrink-0" />
          {!collapsed && <span>Log Out</span>}
        </button>
      </div>
    </div>
  );
}
