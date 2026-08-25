/* oxlint-disable react/no-danger -- inline theme script/style required to prevent FOUC before hydration */
import { ThemeProvider } from "@jfa.dev/common/hooks/use-theme";
import appCss from "@styles/globals.css?url";
import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router";
import { SidebarProvider } from "fumadocs-ui/components/sidebar/base";
import { RootProvider } from "fumadocs-ui/provider/tanstack";

import { DocsSiteHeader } from "@/components/site-header";

const themeInitScript = `(() => {
  const root = document.documentElement;
  const preferenceCookie = "jfa-theme";
  const readCookie = (name) => {
    const prefix = \`\${name}=\`;
    const cookie = document.cookie
      .split(";")
      .map((entry) => entry.trim())
      .find((entry) => entry.startsWith(prefix));
    if (!cookie) return null;
    try {
      return decodeURIComponent(cookie.slice(prefix.length));
    } catch (_e) {
      return null;
    }
  };
  const setTheme = (isDark) => {
    root.classList.toggle("dark", isDark);
    root.style.colorScheme = isDark ? "dark" : "light";
  };
  try {
    const theme = readCookie(preferenceCookie) ?? "system";
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setTheme(theme === "dark" || (theme === "system" && prefersDark));
  } catch (_e) {
    setTheme(window.matchMedia("(prefers-color-scheme: dark)").matches);
  }
})();`;

const criticalSidebarCss = `html.dark{color-scheme:dark}
html:not(.dark){color-scheme:light}
#nd-sidebar{background-color:oklch(1 0 0)}
@media (prefers-color-scheme: dark){
  #nd-sidebar{background-color:oklch(0.18 0 0)}
}
html.dark #nd-sidebar{background-color:oklch(0.18 0 0)!important}
html.dark #nd-sidebar{--color-fd-card:oklch(0.18 0 0);--color-fd-background:oklch(0.15 0 0);--color-fd-popover:oklch(0.18 0 0);--color-fd-muted:oklch(0.25 0 0);--color-fd-secondary:oklch(0.25 0 0);--color-fd-accent:oklch(0.25 0 0);--color-fd-border:oklch(1 0 0 / 12%)}
`;

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        title: "DOCS by JFA",
      },
    ],
  }),

  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <style dangerouslySetInnerHTML={{ __html: criticalSidebarCss }} />
        <link rel="stylesheet" href={appCss} />
        <HeadContent />
      </head>
      <body className="flex min-h-screen flex-col">
        <RootProvider theme={{ enabled: false }}>
          <ThemeProvider>
            {/* The sidebar context is hoisted here so the shell-level header can
                toggle the docs sidebar mounted further down the tree. */}
            <SidebarProvider>
              <DocsSiteHeader />
              <div className="flex flex-1 flex-col">{children}</div>
            </SidebarProvider>
          </ThemeProvider>
        </RootProvider>
        <Scripts />
      </body>
    </html>
  );
}
