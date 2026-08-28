import { siteHead } from "@jfa.dev/common/site-head";
import appCss from "@styles/globals.css?url";
import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router";

import { NotFoundPage, RouteErrorBoundary } from "@/components/error-boundary";
import { ThemeProvider } from "@/hooks/use-theme";
import { appPath } from "@/lib/site-paths";

export const Route = createRootRoute({
  head: () =>
    siteHead({
      links: [{ rel: "stylesheet", href: appCss }],
    }),

  shellComponent: RootDocument,
  notFoundComponent: NotFoundPage,
  errorComponent: RouteErrorBoundary,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script src={appPath("/theme-init.js")}></script>
        <HeadContent />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
        <Scripts />
      </body>
    </html>
  );
}
