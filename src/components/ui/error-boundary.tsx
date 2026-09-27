import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-danger/10 p-4 mb-4">
            <AlertTriangle className="h-8 w-8 text-danger" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">
            Something went wrong
          </h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {this.state.error?.message || "An unexpected error occurred."}
          </p>
          <Button onClick={this.handleReset} variant="outline" className="mt-4">
            Try again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => setError(null), []);

  React.useEffect(() => {
    if (error) throw error;
  }, [error]);

  return { setError, resetError };
}

export { ErrorBoundary, useErrorHandler, type ErrorBoundaryProps };
