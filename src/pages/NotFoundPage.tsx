import { Package } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <Package className="mx-auto h-24 w-24 text-muted-foreground/30" />
        <h1 className="mt-3 text-6xl font-bold text-primary">404</h1>
        <p className="mt-2 text-xl text-muted-foreground">Page Not Found</p>
        <p className="mt-2 text-sm text-muted-foreground">The page you are looking for does not exist or has been moved.</p>
        <a href="/dashboard" className="mt-3 inline-block rounded bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          Go to Dashboard
        </a>
      </div>
    </div>
  );
}
