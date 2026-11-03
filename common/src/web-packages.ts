/** A web package mounted by the router worker. */
export interface WebPackage {
  /** Public mount path of the package. */
  path: string;
  /** Display title of the package. */
  title: string;
  /**
   * One plain sentence saying what the package is. The single source for the
   * header subtitle, the brand switcher row, the meta description and the
   * landing page's tool list, so every surface describes the app the same way.
   */
  tagline: string;
  /** Mount-relative route prefixes omitted from the shared sitemap. */
  sitemapExclude?: string[];
  /** Directory of content pages, relative to the package root. */
  sitemapContentDir?: string;
  /** Mount-relative paths disallowed by the shared robots.txt. */
  robotsDisallow?: string[];
  /**
   * Show the package-home shortcut in `SiteHeader`. Set for packages with
   * slug/id routes (deep links with no other escape hatch). Omit elsewhere
   * so the home icon only appears where it can do something useful.
   */
  showHomeLink?: boolean;
}

/**
 * Registry of every web package mounted on jfa.dev, mirroring the route
 * definitions in `iac/src/config.ts`. Consumed by the shared `SiteHeader`
 * brand switcher, each app's `siteMeta` description and the landing page;
 * keep both in sync when adding or moving mounts.
 */
export const webPackages: WebPackage[] = [
  {
    path: "/",
    title: "Landing",
    tagline: "Ego page",
  },
  {
    path: "/opengraph",
    title: "OpenGraph",
    tagline: "Design OpenGraph images and social banners in a layer editor",
  },
  {
    path: "/hyperscaler-services",
    title: "Hyperscaler Services",
    tagline: "Find the equivalent service on AWS, Azure, GCP, Oracle Cloud and Cloudflare",
  },
  {
    path: "/keweke",
    title: "KEWEKE",
    tagline: "Yet another collaborative shopping list",
    showHomeLink: true,
    sitemapExclude: ["/admin"],
    robotsDisallow: ["/user"],
  },
  {
    path: "/docs",
    title: "DOCS",
    tagline: "How the jfa.dev apps work",
    sitemapContentDir: "content/docs",
  },
  {
    path: "/playlists",
    title: "PLAYLISTS",
    tagline: "Apple Music playlists and what I'm playing on Last.fm",
  },
  {
    path: "/branding",
    title: "Branding",
    tagline: "The shared UI kit behind every jfa.dev app",
  },
];

/**
 * Returns the tagline of the package mounted at `path`.
 *
 * @param path - Mount path as listed in `webPackages`, such as `/keweke`.
 * @returns The package's tagline.
 */
export function packageTagline(path: string): string {
  const webPackage = webPackages.find((candidate) => candidate.path === path);
  if (!webPackage) {
    throw new Error(`No web package is mounted at ${path}`);
  }
  return webPackage.tagline;
}
