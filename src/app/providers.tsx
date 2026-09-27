import type { ReactNode } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { CompanyProvider } from '@/contexts/CompanyContext';
import { PermissionProvider } from '@/contexts/PermissionContext';
import { NotificationProvider } from '@/contexts/NotificationContext';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ThemeProvider>
        <CompanyProvider>
          <PermissionProvider>
            <NotificationProvider>
              {children}
            </NotificationProvider>
          </PermissionProvider>
        </CompanyProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
