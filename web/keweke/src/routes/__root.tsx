import { ThemeProvider, useTheme } from "@jfa.dev/common/hooks/use-theme";
import { siteHead } from "@jfa.dev/common/site-head";
import { Toaster } from "@jfa.dev/common/ui";
import { HeadContent, Outlet, Scripts, createRootRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { CookieNotice } from "@/app/components/cookie-notice";
import { getLocale } from "@/app/i18n/runtime";
import { appPath } from "@/app/lib/site-paths";
import appCss from "@/styles/globals.css?url";

export const Route = createRootRoute({
  head: () =>
    siteHead({
      links: [{ rel: "stylesheet", href: appCss }],
    }),
  notFoundComponent: () => (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="text-center">
        <p className="text-sm font-medium text-muted-foreground">keweke</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          <fbt desc="Heading on the page shown when a shopping list address does not exist">
            List not found
          </fbt>
        </h1>
        <a
          href="./"
          className="mt-6 inline-flex text-sm font-medium text-primary underline underline-offset-4"
        >
          <fbt desc="Link from the missing-list page to start a new shopping list">
            Start a new list
          </fbt>
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
    <html lang={getLocale()} suppressHydrationWarning>
      <head>
        <script src={appPath("/theme-init.js")}></script>
        <HeadContent />
      </head>
      <body className="flex h-dvh min-h-0 flex-col overflow-hidden overscroll-none bg-background font-sans text-base text-foreground transition-colors duration-200">
        <ThemeProvider>
          {children}
          <CookieNotice />
          <ToastBridge />
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
