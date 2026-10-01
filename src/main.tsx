import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Providers } from '@/app/providers';
import AppRoutes from '@/app/routes';
import { AppErrorBoundary } from '@/app/error-boundary';
import { ConfigRequired } from '@/app/ConfigRequired';
import { Toaster } from '@/components/ui/toast';
import { isSupabaseConfigured, supabaseConfigError } from '@/lib/supabase';
import '@/styles/globals.css';

const root = document.getElementById('root')!;

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <AppErrorBoundary>
      {isSupabaseConfigured ? (
        <BrowserRouter>
          <Providers>
            <AppRoutes />
            <Toaster />
          </Providers>
        </BrowserRouter>
      ) : (
        <ConfigRequired reason={supabaseConfigError} />
      )}
    </AppErrorBoundary>
  </React.StrictMode>
);
