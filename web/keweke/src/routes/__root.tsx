import { HeadContent, Outlet, Scripts, createRootRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { ThemeProvider } from "@/hooks/use-theme";
import { appPath } from "@/lib/site-paths";
import appCss from "@/styles/globals.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, viewport-fit=cover",
      },
      {
        name: "description",
        content: "Simple collaborative shopping lists for friends.",
      },
      { title: "keweke" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  notFoundComponent: () => (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="text-center">
        <p className="text-sm font-medium text-muted-foreground">keweke</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">List not found</h1>
        <a
          href="./"
          className="mt-6 inline-flex text-sm font-medium text-primary underline underline-offset-4"
        >
          Start a new list
        </a>
      </div>
    </div>
  ),
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
      <body className="flex h-dvh min-h-0 flex-col overflow-hidden overscroll-none bg-background font-sans text-base text-foreground transition-colors duration-200">
        <ThemeProvider>{children}</ThemeProvider>
        <Scripts />
      </body>
    </html>
  );
}
