import { Outlet } from 'react-router-dom';
import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

export default function AuthLayout({ children }: { children?: ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-[var(--color-background)] via-[var(--color-backgroundAlt)] to-[var(--color-primaryDark)]">
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -left-40 -top-40 h-80 w-80 rounded-full opacity-20"
          style={{ background: 'var(--color-primary)' }}
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 20, 0],
            y: [0, -20, 0],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full opacity-15"
          style={{ background: 'var(--color-secondary)' }}
          animate={{
            scale: [1.2, 1, 1.2],
            x: [0, -30, 0],
            y: [0, 30, 0],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-10"
          style={{ background: 'var(--color-accent)' }}
          animate={{
            scale: [1, 1.3, 1],
            rotate: [0, 180, 360],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
        />
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute h-2 w-2 rounded-full"
            style={{
              background: 'var(--color-primaryLight)',
              left: `${15 + i * 15}%`,
              top: `${20 + (i % 3) * 25}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.3, 0.8, 0.3],
            }}
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
        <div className="mb-8 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
            style={{ background: 'var(--color-primary)' }}
          >
            <span className="text-2xl font-bold text-white">B</span>
          </motion.div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
            BSP Inventory
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-textSecondary)' }}>
            Complete Inventory Management ERP
          </p>
        </div>

        <div
          className="rounded-2xl border p-8 shadow-xl backdrop-blur-sm"
          style={{
            background: 'var(--color-card)',
            borderColor: 'var(--color-border)',
            boxShadow: '0 25px 50px -12px var(--color-shadow)',
          }}
        >
          {children ?? <Outlet />}
        </div>

        <p className="mt-6 text-center text-xs" style={{ color: 'var(--color-textMuted)' }}>
          © {new Date().getFullYear()} BSP Inventory. All rights reserved.
        </p>
      </motion.div>
    </div>
  );
}
