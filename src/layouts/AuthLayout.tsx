import { Outlet } from 'react-router-dom';
import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

export default function AuthLayout({ children }: { children?: ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background">
      {/* Neon backdrop. Uses the brand tokens directly so the glow always
          tracks the active theme instead of a hard-coded hue. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -left-40 -top-40 h-96 w-96 rounded-full opacity-40 blur-3xl"
          style={{ background: 'rgb(var(--color-primary))' }}
          animate={{ scale: [1, 1.2, 1], x: [0, 20, 0], y: [0, -20, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -bottom-40 -right-40 h-[28rem] w-[28rem] rounded-full opacity-35 blur-3xl"
          style={{ background: 'rgb(var(--color-secondary))' }}
          animate={{ scale: [1.2, 1, 1.2], x: [0, -30, 0], y: [0, 30, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-25 blur-3xl"
          style={{ background: 'rgb(var(--color-accent))' }}
          animate={{ scale: [1, 1.3, 1], rotate: [0, 180, 360] }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgb(var(--color-primary)) 1px, transparent 1px), linear-gradient(to bottom, rgb(var(--color-primary)) 1px, transparent 1px)',
            backgroundSize: '44px 44px',
          }}
        />
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute h-2 w-2 rounded-full"
            style={{
              background: 'rgb(var(--color-accent))',
              boxShadow: '0 0 10px rgb(var(--color-accent))',
              left: `${12 + i * 16}%`,
              top: `${18 + (i % 3) * 26}%`,
            }}
            animate={{ y: [0, -30, 0], opacity: [0.35, 0.95, 0.35] }}
            transition={{
              duration: 3 + i * 0.5,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: i * 0.4,
            }}
          />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 mx-4 w-full max-w-md"
      >
        <div className="mb-6 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
            style={{
              background: 'rgb(var(--color-primary))',
              color: 'rgb(var(--color-primary-foreground))',
              boxShadow:
                '0 0 20px rgb(var(--color-primary) / 0.6), 0 0 40px rgb(var(--color-primary) / 0.35)',
            }}
          >
            <span className="text-2xl font-bold">B</span>
          </motion.div>
          <h1
            className="text-3xl font-bold tracking-tight"
            style={{
              color: 'rgb(var(--color-text))',
              textShadow: '0 0 18px rgb(var(--color-primary) / 0.45)',
            }}
          >
            BSP Inventory
          </h1>
          <p
            className="mt-1 text-sm font-medium"
            style={{ color: 'rgb(var(--color-muted-foreground))' }}
          >
            Complete Inventory Management ERP
          </p>
        </div>

        {/* Opaque card + neon rim. The card must stay opaque: the previous
            translucent surface let the moving neon blobs show through the
            form, which is what made the fields look unlit. */}
        <div
          className="rounded-2xl border-2 p-8"
          style={{
            background: 'rgb(var(--color-card))',
            borderColor: 'rgb(var(--color-primary) / 0.55)',
            boxShadow:
              '0 0 0 1px rgb(var(--color-primary) / 0.25), 0 0 30px rgb(var(--color-primary) / 0.25), 0 25px 50px -12px rgb(var(--color-shadow) / 0.6)',
          }}
        >
          {children ?? <Outlet />}
        </div>

        <p
          className="mt-6 text-center text-xs"
          style={{ color: 'rgb(var(--color-muted-foreground))' }}
        >
          &copy; {new Date().getFullYear()} BSP Inventory. All rights reserved.
        </p>
      </motion.div>
    </div>
  );
}
