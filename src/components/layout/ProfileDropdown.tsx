import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LogOut,
  User,
  Settings,
  Palette,
  ChevronRight,
  Moon,
  Sun,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { themes } from '@/config/theme.config';

interface ProfileDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileDropdown({ isOpen, onClose }: ProfileDropdownProps) {
  const { profile, user, signOut } = useAuth();
  const { theme, setTheme, isDark } = useTheme();
  const navigate = useNavigate();

  const menuItems = useMemo(
    () => [
      {
        id: 'profile',
        label: 'My Profile',
        icon: User,
        action: () => {
          navigate('/settings/profile');
          onClose();
        },
      },
      {
        id: 'settings',
        label: 'Settings',
        icon: Settings,
        action: () => {
          navigate('/settings');
          onClose();
        },
      },
      {
        id: 'themes',
        label: 'Theme',
        icon: Palette,
        action: () => {
          navigate('/settings/themes');
          onClose();
        },
        submenu: themes.slice(0, 5).map((t) => ({
          id: t.id,
          label: t.name,
          color: t.colors.primary,
          active: theme.id === t.id,
          action: () => setTheme(t.id),
        })),
      },
      {
        id: 'dark-mode',
        label: isDark ? 'Light Mode' : 'Dark Mode',
        icon: isDark ? Sun : Moon,
        action: () => {
          setTheme(isDark ? 'light-professional' : 'neon-blue');
        },
      },
    ],
    [navigate, onClose, theme, setTheme, isDark]
  );

  const handleLogout = () => {
    signOut();
    navigate('/login');
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
            className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border shadow-xl"
            style={{
              background: 'rgb(var(--color-card))',
              borderColor: 'rgb(var(--color-border))',
            }}
          >
            <div
              className="border-b px-4 py-3"
              style={{ borderColor: 'rgb(var(--color-border))' }}
            >
              <p
                className="text-sm font-semibold"
                style={{ color: 'rgb(var(--color-text))' }}
              >
                {(profile?.full_name ?? user?.email ?? "User") || 'Admin User'}
              </p>
              <p
                className="text-xs"
                style={{ color: 'rgb(var(--color-muted))' }}
              >
                {user?.email || 'admin@bspinventory.com'}
              </p>
              <span
                className="mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium uppercase"
                style={{
                  background: 'rgb(var(--color-primary))20',
                  color: 'rgb(var(--color-primary))',
                }}
              >
                {user?.role || 'admin'}
              </span>
            </div>

            <div className="py-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={item.action}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-[rgb(var(--color-sidebar))]"
                    style={{ color: 'rgb(var(--color-text-secondary))' }}
                  >
                    <Icon size={16} />
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.submenu && (
                      <ChevronRight size={14} style={{ color: 'rgb(var(--color-muted))' }} />
                    )}
                  </button>
                );
              })}
            </div>

            <div
              className="border-t py-1"
              style={{ borderColor: 'rgb(var(--color-border))' }}
            >
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-red-500/10"
                style={{ color: 'rgb(var(--color-error))' }}
              >
                <LogOut size={16} />
                <span>Log Out</span>
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}