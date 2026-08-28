import { siteHead } from "@jfa.dev/common/site-head";
import { SiteHeader, Toaster } from "@jfa.dev/common/ui";
import { webPackages } from "@jfa.dev/common/web-packages";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HeadContent, Outlet, Scripts, createRootRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { ThemeToggle } from "@/components/theme-toggle";
import { ThemeProvider, useTheme } from "@/hooks/use-theme";
import { appPath } from "@/lib/site-paths";
import appCss from "@/styles/globals.css?url";

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
  component: RootComponent,
});

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script src={appPath("/theme-init.js")}></script>
        <HeadContent />
      </head>
      <body className="flex min-h-dvh flex-col bg-background font-sans text-base text-foreground">
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>
            <SiteHeader
              title="PLAYLIST"
              subtitle="20 tracks // now playing"
              titleHref={appPath("/")}
              packages={webPackages}
              activePackagePath="/playlist"
              navLabel="Playlist navigation"
              githubHref="https://github.com/jfalava/jfa.dev/tree/main/web/playlist"
            >
              <ThemeToggle />
            </SiteHeader>
            <div className="mx-auto flex min-h-0 w-full max-w-screen-2xl flex-1 flex-col overflow-hidden border-x border-border bg-background">
              {children}
            </div>
            <ToastBridge />
          </QueryClientProvider>
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  );
}

function ToastBridge() {
  const { theme } = useTheme();
  return <Toaster theme={theme} />;
}
