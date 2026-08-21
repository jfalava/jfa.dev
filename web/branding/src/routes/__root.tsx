import { SiteHeader, Toaster } from "@jfa.dev/common/ui";
import { HeadContent, Outlet, Scripts, createRootRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { ThemeToggle } from "@/components/theme-toggle";
import { ThemeProvider, useTheme } from "@/hooks/use-theme";
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
        content: "Single-page showcase of every component in the JFA design system",
      },
      { title: "Branding by JFA" },
    ],
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
          <SiteHeader
            title="branding"
            subtitle="component showcase"
            titleHref={appPath("/")}
            navLabel="Branding navigation"
          >
            <ThemeToggle />
          </SiteHeader>
          {children}
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
