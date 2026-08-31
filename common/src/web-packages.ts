/** A route mounted inside a web package, with the title its header presents. */
export interface WebPackageRoute {
  /** Mount-relative path of the route. */
  path: string;
  /** Title presented by the route's header. */
  title: string;
}

/** A web package mounted by the router worker. */
export interface WebPackage {
  /** Public mount path of the package. */
  path: string;
  /** Display title of the package. */
  title: string;
  /** Routes mounted under the package with their header titles. */
  routes: WebPackageRoute[];
  /** Mount-relative route prefixes omitted from the shared sitemap. */
  sitemapExclude?: string[];
  /** Directory of content pages, relative to the package root. */
  sitemapContentDir?: string;
  /** Mount-relative paths disallowed by the shared robots.txt. */
  robotsDisallow?: string[];
}

/**
 * Registry of every web package mounted on jfa.dev, mirroring the route
 * definitions in `iac/src/config.ts`. Consumed by the shared `SiteHeader`
 * brand switcher; keep both in sync when adding or moving mounts.
 */
export const webPackages: WebPackage[] = [
  {
    path: "/",
    title: "Landing",
    routes: [{ path: "/", title: "Ego page" }],
  },
  {
    path: "/opengraph",
    title: "OpenGraph",
    routes: [{ path: "/", title: "OpenGraph Image Generator" }],
  },
  {
    path: "/hyperscaler-services",
    title: "Hyperscaler Services",
    routes: [{ path: "/", title: "A directory of similar cloud services" }],
  },
  {
    path: "/keweke",
    title: "KEWEKE",
    sitemapExclude: ["/admin"],
    robotsDisallow: ["/user"],
    routes: [
      { path: "/", title: "Yet another collaborative shopping list" },
      { path: "/:listId", title: "List · KEWEKE" },
      { path: "/admin", title: "Admin · KEWEKE" },
      { path: "/user", title: "User · KEWEKE" },
    ],
  },
  {
    path: "/docs",
    title: "DOCS",
    sitemapContentDir: "content/docs",
    routes: [{ path: "/", title: "The Knowledge Base" }],
  },
  {
    path: "/playlists",
    title: "PLAYLISTS",
    routes: [{ path: "/", title: "My music taste is better than yours" }],
  },
  {
    path: "/branding",
    title: "Branding",
    routes: [
      {
        path: "/",
        title: "Branding and Component showcase",
      },
    ],
  },
];
