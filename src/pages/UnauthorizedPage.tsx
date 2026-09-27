import { motion } from 'framer-motion';
import { ShieldOff } from 'lucide-react';

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <ShieldOff className="mx-auto h-24 w-24 text-red-500/30" />
        <h1 className="mt-6 text-6xl font-bold text-red-500">403</h1>
        <p className="mt-4 text-xl text-muted-foreground">Unauthorized Access</p>
        <p className="mt-2 text-sm text-muted-foreground">You do not have permission to access this page.</p>
        <a href="/dashboard" className="mt-6 inline-block rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          Go to Dashboard
        </a>
      </motion.div>
    </div>
  );
}
