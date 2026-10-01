import type { ReactNode } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { CompanyProvider } from '@/contexts/CompanyContext';
import { PermissionProvider } from '@/contexts/PermissionContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { ToastProvider } from '@/components/ui/use-toast';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
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
    </ToastProvider>
  );
}
