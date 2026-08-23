import appCss from "@styles/globals.css?url";
import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router";
import { SidebarProvider } from "fumadocs-ui/components/sidebar/base";
import { RootProvider } from "fumadocs-ui/provider/tanstack";

import { DocsSiteHeader } from "@/components/site-header";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "DOCS by JFA",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),

  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="flex min-h-screen flex-col">
        <RootProvider>
          {/* The sidebar context is hoisted here so the shell-level header can
              toggle the docs sidebar mounted further down the tree. */}
          <SidebarProvider>
            <DocsSiteHeader />
            <div className="flex flex-1 flex-col">{children}</div>
          </SidebarProvider>
        </RootProvider>
        <Scripts />
      </body>
    </html>
  );
}
