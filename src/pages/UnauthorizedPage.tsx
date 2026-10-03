import { ShieldOff } from 'lucide-react';

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <ShieldOff className="mx-auto h-24 w-24 text-red-500/30" />
        <h1 className="mt-3 text-6xl font-bold text-red-500">403</h1>
        <p className="mt-2 text-xl text-muted-foreground">Unauthorized Access</p>
        <p className="mt-2 text-sm text-muted-foreground">You do not have permission to access this page.</p>
        <a href="/dashboard" className="mt-3 inline-block rounded bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          Go to Dashboard
        </a>
      </div>
    </div>
  );
}
