import { Link, type ErrorComponentProps, useRouter } from "@tanstack/react-router";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export function NotFoundPage() {
  const router = useRouter();

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <section className="w-full max-w-md rounded-lg border border-border bg-card p-8 text-center shadow-lg">
        <div className="mb-6">
          <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-destructive" />
          <h1 className="mb-2 text-2xl font-bold text-foreground">Page not found</h1>
          <p className="text-muted-foreground">
            The page you requested does not exist or has moved.
          </p>
        </div>

        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Link to="/">
            <Button>
              <Home className="mr-2 h-4 w-4" />
              Go Home
            </Button>
          </Link>
          <Button onClick={() => router.history.back()} variant="outline">
            Go Back
          </Button>
        </div>
      </section>
    </main>
  );
}

export function RouteErrorBoundary({ error, reset }: ErrorComponentProps) {
  const safeReset = typeof reset === "function" ? (reset as () => void) : undefined;

  useEffect(() => {
    console.error("Route Error:", error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <section className="w-full max-w-md rounded-lg border border-border bg-card p-8 text-center shadow-lg">
        <div className="mb-6">
          <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-destructive" />
          <h1 className="mb-2 text-2xl font-bold text-foreground">Something went wrong</h1>
          <p className="text-muted-foreground">
            An unexpected error occurred while loading this page.
          </p>
        </div>

        {error instanceof Error && (
          <div className="mb-6 rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-left">
            <p className="wrap-break-word font-mono text-sm text-destructive">{error.message}</p>
          </div>
        )}

        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Button onClick={() => safeReset?.()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
          <Link to="/">
            <Button variant="outline">
              <Home className="mr-2 h-4 w-4" />
              Go Home
            </Button>
          </Link>
        </div>
      </section>
    </main>
  );
}
