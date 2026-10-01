import { AlertTriangle, FileCode2, Terminal } from 'lucide-react';

/**
 * Rendered instead of the app when Supabase credentials are absent or still
 * hold the `.env.example` placeholders. Without this the app threw during
 * module evaluation and the browser showed a blank page with no explanation.
 */
export function ConfigRequired({ reason }: { reason: string | null }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-2xl rounded-lg border border-border bg-card p-8 shadow-lg">
        <div className="mb-6 flex items-start gap-4">
          <div className="rounded-full bg-destructive/10 p-3">
            <AlertTriangle className="h-7 w-7 text-destructive" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">
              Configuration required
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {reason ?? 'Supabase is not configured.'}
            </p>
          </div>
        </div>

        <p className="mb-4 text-sm text-muted-foreground">
          BSP Inventory ERP needs a Supabase project before it can load. Create
          a <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">.env</code>{' '}
          file in the project root:
        </p>

        <div className="mb-6 rounded-md border border-border bg-muted/50 p-4">
          <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <FileCode2 className="h-3.5 w-3.5" />
            .env
          </div>
          <pre className="overflow-x-auto font-mono text-xs leading-relaxed text-foreground">
            {`VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-ANON-OR-PUBLISHABLE-KEY`}
          </pre>
        </div>

        <p className="mb-2 text-sm text-muted-foreground">
          Find both values in your Supabase dashboard under{' '}
          <strong className="text-foreground">Project Settings → API</strong>. Then:
        </p>

        <div className="rounded-md border border-border bg-muted/50 p-4">
          <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Terminal className="h-3.5 w-3.5" />
            Terminal
          </div>
          <pre className="overflow-x-auto font-mono text-xs leading-relaxed text-foreground">
            {`cp .env.example .env    # then edit .env with your values
npm run dev`}
          </pre>
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          Vite only reads <code className="font-mono">.env</code> at startup, so
          restart the dev server after editing it. Never commit the anon key's
          service-role counterpart.
        </p>
      </div>
    </div>
  );
}

export default ConfigRequired;
