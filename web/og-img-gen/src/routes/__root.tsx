import type { QueryClient } from "@tanstack/react-query";
import { HeadContent, Scripts, createRootRouteWithContext } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { OgImageGenHeader } from "@/components/og-image-gen-header";
import { ViewportGuard } from "@/components/viewport-guard";
import { ThemeProvider } from "@/hooks/use-theme";
import { appPath } from "@/lib/site-paths";
import appCss from "@/styles.css?url";

interface MyRouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, viewport-fit=cover",
      },
      {
        name: "description",
        content: "Create OpenGraph images from scratch with a layer-based editor.",
      },
      { title: "OG Image Generator by JFA" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  notFoundComponent: () => (
    <div className="flex min-h-dvh items-center justify-center bg-background p-6 text-foreground">
      <div className="text-center">
        <p className="text-sm font-medium text-muted-foreground">OG IMAGE GEN</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Page not found</h1>
        <a
          href="./"
          className="mt-6 inline-flex text-sm font-medium text-primary underline underline-offset-4"
        >
          Return to the editor
        </a>
      </div>
    </div>
  ),
  shellComponent: RootDocument,
});

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script src={appPath("/theme-init.js")}></script>
        <HeadContent />
      </head>
      <body className="flex min-h-dvh flex-col overflow-hidden bg-background font-sans text-base text-foreground antialiased">
        <ThemeProvider>
          <ViewportGuard>
            <OgImageGenHeader />
            <main className="flex min-h-0 flex-1 flex-col">{children}</main>
          </ViewportGuard>
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  );
}
