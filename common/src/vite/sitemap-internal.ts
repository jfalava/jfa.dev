import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

/**
 * Pure helpers for the sitemap Vite plugin, split out so they can be unit
 * tested without invoking the plugin itself.
 */

const ROUTE_FILE_EXTENSION = /\.(ts|tsx)$/;
const CONTENT_FILE_EXTENSION = /\.(md|mdx)$/;
const CREATE_FILE_ROUTE_PATTERN = /createFileRoute\(\s*(['"`])(.+?)\1/g;

/**
 * Normalizes a Vite base into an absolute mount path with leading and
 * trailing slashes, e.g. "/keweke/".
 */
export function toMountPath(base: string): string {
  const withLeadingSlash = base.startsWith("/") ? base : `/${base}`;
  return withLeadingSlash.endsWith("/") ? withLeadingSlash : `${withLeadingSlash}/`;
}

/**
 * Normalizes a route path into a mount-relative URL path with a leading
 * slash and no trailing slash (except for the root, which stays "/").
 */
export function toRelativePath(routePath: string): string | null {
  const withLeadingSlash = routePath.startsWith("/") ? routePath : `/${routePath}`;
  const withoutTrailingSlash =
    withLeadingSlash.length > 1 ? withLeadingSlash.replace(/\/+$/, "") : withLeadingSlash;
  return withoutTrailingSlash || "/";
}

/** Escapes XML special characters for use inside a <loc> element. */
export function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

/** Whether an excluded prefix matches the route path exactly or as a directory. */
export function isExcluded(routePath: string, exclude: string[]): boolean {
  return exclude.some((prefix) => routePath === prefix || routePath.startsWith(`${prefix}/`));
}

/** Whether a route should never appear in a sitemap. */
export function isImplicitlyExcluded(routePath: string): boolean {
  return routePath.includes("$") || routePath === "/api" || routePath.startsWith("/api/");
}

/** Recursively lists files under a directory. Returns an empty array when absent. */
export function listFiles(directory: string): string[] {
  if (!existsSync(directory)) {
    return [];
  }
  const entries = readdirSync(directory, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(entryPath) : [entryPath];
  });
}

/**
 * Extracts static route paths by scanning route files for
 * `createFileRoute("<path>")` literals.
 */
export function collectRoutePaths(routesDir: string): string[] {
  const paths = new Set<string>();
  for (const file of listFiles(routesDir)) {
    if (!ROUTE_FILE_EXTENSION.test(file)) {
      continue;
    }
    const source = readFileSync(file, "utf-8");
    for (const match of source.matchAll(CREATE_FILE_ROUTE_PATTERN)) {
      const routePath = toRelativePath(match[2]);
      if (routePath && !isImplicitlyExcluded(routePath)) {
        paths.add(routePath);
      }
    }
  }
  return [...paths];
}

/**
 * Maps MDX/MD content files to URL paths: `keweke/index.mdx` becomes
 * `/keweke`, `keweke/lists/create-a-list.mdx` becomes
 * `/keweke/lists/create-a-list`.
 */
export function collectContentPaths(contentDir: string): string[] {
  const paths = new Set<string>();
  for (const file of listFiles(contentDir)) {
    if (!CONTENT_FILE_EXTENSION.test(file)) {
      continue;
    }
    const segments = path.relative(contentDir, file).split(path.sep);
    const last = segments.at(-1);
    if (last) {
      segments[segments.length - 1] = last.replace(CONTENT_FILE_EXTENSION, "");
    }
    if (segments.at(-1) === "index") {
      segments.pop();
    }
    paths.add(segments.length ? `/${segments.join("/")}` : "/");
  }
  return [...paths].toSorted();
}

/** Builds the mount-relative path list for the sitemap, sorted for stability. */
export function buildPaths(
  routesDir: string,
  contentDir: string | undefined,
  exclude: string[],
  include: string[],
): string[] {
  const paths = new Set<string>();
  for (const routePath of collectRoutePaths(routesDir)) {
    if (!isExcluded(routePath, exclude)) {
      paths.add(routePath);
    }
  }
  if (contentDir) {
    for (const contentPath of collectContentPaths(contentDir)) {
      if (!isExcluded(contentPath, exclude)) {
        paths.add(contentPath);
      }
    }
  }
  for (const extraPath of include) {
    const normalized = toRelativePath(extraPath);
    if (normalized) {
      paths.add(normalized);
    }
  }
  return [...paths].toSorted();
}

/**
 * Resolves a mount-relative path into an absolute URL: the root of a mounted
 * app is its mount path itself (without a trailing slash), and the root of
 * the app mounted at `/` is the origin root.
 */
export function toAbsoluteUrl(origin: string, mountPrefix: string, relativePath: string): string {
  if (relativePath === "/") {
    return `${origin}${mountPrefix || "/"}`;
  }
  return `${origin}${mountPrefix}${relativePath}`;
}

/** Builds the `<urlset>` document for the app's own pages. */
export function buildUrlset(origin: string, mountPath: string, paths: string[]): string {
  const mountPrefix = mountPath === "/" ? "" : mountPath.replace(/\/+$/, "");
  const urls = paths.map(
    (relativePath) =>
      `  <url><loc>${escapeXml(toAbsoluteUrl(origin, mountPrefix, relativePath))}</loc></url>`,
  );
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls,
    `</urlset>`,
    ``,
  ].join("\n");
}

/** Builds the `<sitemapindex>` referencing every mounted worker's sitemap. */
export function buildSitemapIndex(origin: string, mountPath: string, siblings: string[]): string {
  const mounts = [mountPath, ...siblings.map(toMountPath)];
  const entries = [...new Set(mounts)].map(
    (mount) => `  <sitemap><loc>${escapeXml(`${origin}${mount}sitemap.xml`)}</loc></sitemap>`,
  );
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...entries,
    `</sitemapindex>`,
    ``,
  ].join("\n");
}

/** Builds the robots.txt pointing crawlers at the sitemap index. */
export function buildRobotsTxt(origin: string): string {
  return ["User-agent: *", "Allow: /", "", `Sitemap: ${origin}/sitemap_index.xml`, ""].join("\n");
}
