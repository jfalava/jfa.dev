import { siteHead } from "@jfa.dev/common/site-head";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
/// <reference types="vite/client" />
import type { ReactNode } from "react";

import { ThemeProvider } from "@/hooks/use-theme";
import { appPath } from "@/lib/site-paths";
import appCss from "@/styles/globals.css?url";

/**
 * Query client instance with default configuration.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
    },
  },
});

export const Route = createRootRoute({
  head: () =>
    siteHead({
      links: [{ rel: "stylesheet", href: appCss }],
    }),
  notFoundComponent: () => (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold text-foreground">404 - Page Not Found</h1>
        <p className="mb-8 text-muted-foreground">The page you're looking for doesn't exist.</p>
        <a
          href={appPath("/")}
          className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Go Home
        </a>
      </div>
    </div>
  ),
  component: RootComponent,
});

/**
 * Root component wrapper for the application.
 *
 * @returns Root component with document wrapper
 */
function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

/**
 * Document wrapper component with theme script and providers.
 * Includes theme initialization script to prevent flash of incorrect theme.
 *
 * @param props - Component props with children
 * @returns HTML document structure with providers
 */
function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script src={appPath("/theme-init.js")}></script>
        <HeadContent />
      </head>
      <body className="flex min-h-dvh flex-col bg-background font-sans text-base text-foreground transition-colors duration-200">
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  );
}
