import { Outlet } from 'react-router-dom';
import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { children?: ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background">
      {/* Quiet worksheet grid: reads as graph paper, never competes with the form. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgb(var(--color-border)) 1px, transparent 1px), linear-gradient(to bottom, rgb(var(--color-border)) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
          opacity: 0.35,
        }}
      />

      <div className="relative z-10 mx-4 w-full max-w-md">
        <div className="mb-3 text-center">
          <div
            className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded border"
            style={{
              background: 'rgb(var(--color-primary))',
              color: 'rgb(var(--color-primary-foreground))',
            }}
          >
            <span className="text-base font-bold">B</span>
          </div>
          <h1 className="text-lg font-bold tracking-tight" style={{ color: 'rgb(var(--color-text))' }}>
            BSP Inventory
          </h1>
          <p className="mt-0.5 text-xs" style={{ color: 'rgb(var(--color-muted-foreground))' }}>
            Complete Inventory Management ERP
          </p>
        </div>

        <div className="rounded border border-border bg-card p-4 shadow-sm">{children ?? <Outlet />}</div>

        <p className="mt-3 text-center text-xs" style={{ color: 'rgb(var(--color-muted-foreground))' }}>
          &copy; {new Date().getFullYear()} BSP Inventory. All rights reserved.
        </p>
      </div>
    </div>
  );
}
