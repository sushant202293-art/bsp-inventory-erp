import { motion } from 'framer-motion';
import { Package } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <Package className="mx-auto h-24 w-24 text-muted-foreground/30" />
        <h1 className="mt-6 text-6xl font-bold text-primary">404</h1>
        <p className="mt-4 text-xl text-muted-foreground">Page Not Found</p>
        <p className="mt-2 text-sm text-muted-foreground">The page you are looking for does not exist or has been moved.</p>
        <a href="/dashboard" className="mt-6 inline-block rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          Go to Dashboard
        </a>
      </motion.div>
    </div>
  );
}
