import { useState, useEffect, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import TopHeader from '@/components/layout/TopHeader';
import { useTheme } from '@/contexts/ThemeContext';
import { useMediaQuery } from '@/hooks/useMediaQuery';

export default function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const stored = localStorage.getItem('bsp_sidebar_collapsed');
    return stored === 'true';
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme } = useTheme();
  const isMobile = useMediaQuery('(max-width: 1024px)');

  useEffect(() => {
    if (isMobile) {
      setSidebarCollapsed(false);
      setMobileMenuOpen(false);
    }
  }, [isMobile]);

  useEffect(() => {
    localStorage.setItem('bsp_sidebar_collapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  const toggleSidebar = useCallback(() => {
    if (isMobile) {
      setMobileMenuOpen((prev) => !prev);
    } else {
      setSidebarCollapsed((prev) => !prev);
    }
  }, [isMobile]);

  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false);
  }, []);

  const sidebarWidth = isMobile ? 0 : sidebarCollapsed ? 72 : 260;

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: 'var(--color-background)' }}
    >
      {isMobile && mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 transition-opacity lg:hidden"
          onClick={closeMobileMenu}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col transition-all duration-300 lg:relative lg:z-auto ${
          isMobile
            ? mobileMenuOpen
              ? 'translate-x-0'
              : '-translate-x-full'
            : ''
        }`}
        style={{
          width: isMobile ? 260 : sidebarWidth,
          minWidth: isMobile ? 260 : sidebarWidth,
          background: 'var(--color-sidebar)',
          borderRight: `1px solid var(--color-border)`,
        }}
      >
        <Sidebar
          collapsed={!isMobile && sidebarCollapsed}
          onToggle={toggleSidebar}
          onClose={closeMobileMenu}
          isMobile={isMobile}
        />
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header
          className="sticky top-0 z-30 flex h-16 shrink-0 items-center border-b"
          style={{
            background: 'var(--color-header)',
            borderColor: 'var(--color-border)',
          }}
        >
          <TopHeader
            onToggleSidebar={toggleSidebar}
            sidebarCollapsed={sidebarCollapsed}
          />
        </header>

        <main
          className="flex-1 overflow-y-auto p-4 md:p-6"
          style={{ background: 'var(--color-backgroundAlt)' }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
