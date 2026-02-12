import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router";

import { NotFoundPage, RouteErrorBoundary } from "@/components/error-boundary";

import appCss from "../../styles/globals.css?url";

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
        title: "jorge fernando álava",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      {
        rel: "manifest",
        href: "/manifest.json",
      },
      {
        rel: "icon",
        href: "/favicon.ico",
        type: "image/x-icon",
      },
    ],
  }),

  shellComponent: RootDocument,
  notFoundComponent: NotFoundPage,
  errorComponent: RouteErrorBoundary,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
        <a href="https://github.com/jfalava" className="sr-only">
          GitHub
        </a>
      </body>
    </html>
  );
}
