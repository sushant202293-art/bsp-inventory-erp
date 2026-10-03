import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AppErrorBoundaryProps {
  children: React.ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class AppErrorBoundary extends React.Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  constructor(props: AppErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<AppErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });
    console.error('[AppErrorBoundary] Caught error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-4 shadow-lg">
            <div className="flex flex-col items-center text-center">
              <div className="mb-2 rounded-full bg-destructive/10 p-4">
                <AlertTriangle className="h-10 w-10 text-destructive" />
              </div>
              <h1 className="mb-2 text-xl font-semibold text-foreground">
                Application Error
              </h1>
              <p className="mb-2 text-sm text-muted-foreground">
                The application encountered an unexpected error and could not recover.
              </p>
              {this.state.error && (
                <div className="mb-2 w-full rounded-md bg-muted p-3 text-left">
                  <p className="mb-1 text-xs font-medium text-muted-foreground">Error Message:</p>
                  <p className="break-all font-mono text-xs text-destructive">
                    {this.state.error.message || 'Unknown error'}
                  </p>
                </div>
              )}
              <div className="flex gap-3">
                <Button onClick={this.handleReset} variant="outline" size="sm">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Again
                </Button>
                <Button onClick={this.handleReload} size="sm">
                  Reload Page
                </Button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
