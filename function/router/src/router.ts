import { handleMountedApp, type RouteConfig, type RoutesConfig } from "./vmfe";

import { Hono } from "hono";

type Bindings = {
  LANDING: Fetcher;
  OG_IMG_GEN: Fetcher;
  ROUTES: string;
  ASSET_PREFIXES?: string;
};

const app = new Hono<{ Bindings: Bindings }>();

function findMatchingRoute(
  pathname: string,
  routeDefs: RouteConfig[],
): { route: RouteConfig; mount: string } | null {
  let matched: { route: RouteConfig; mount: string } | null = null;

  for (const route of routeDefs) {
    if (route.path === "/") {
      if (!matched) {
        matched = { route, mount: "/" };
      }
    } else if (pathname === route.path || pathname.startsWith(`${route.path}/`)) {
      if (!matched || route.path.length > matched.mount.length) {
        matched = { route, mount: route.path };
      }
    }
  }

  return matched;
}

function getPreloadMounts(routeDefs: RouteConfig[], currentMount: string): string[] {
  return routeDefs
    .filter((r) => r.preload && !r.path.includes(":") && r.path !== currentMount)
    .map((r) => r.path);
}

function parseRoutesConfig(routesJson: string): RoutesConfig {
  const parsed = JSON.parse(routesJson) as unknown;
  return parsed as RoutesConfig;
}

app.all("*", async (c) => {
  const config = parseRoutesConfig(c.env.ROUTES);
  const routeDefs: RouteConfig[] = Array.isArray(config) ? config : config.routes;

  const pathname = new URL(c.req.url).pathname;
  const matched = findMatchingRoute(pathname, routeDefs);

  if (!matched) {
    return c.text("Not found", 404);
  }

  const binding = (c.env as Record<string, unknown>)[matched.route.binding] as Fetcher;
  if (!binding || typeof binding.fetch !== "function") {
    return c.text(`Service binding "${matched.route.binding}" not found`, 502);
  }

  const assetPrefixes = buildAssetPrefixes(c.env.ASSET_PREFIXES);
  const preloadMounts = getPreloadMounts(routeDefs, matched.mount);

  return handleMountedApp(c.req.raw, binding, matched.mount, assetPrefixes, {
    smoothTransitions: !Array.isArray(config) ? config.smoothTransitions : undefined,
    preloadStaticMounts: preloadMounts.length ? preloadMounts : undefined,
  });
});

function buildAssetPrefixes(envVar?: string): string[] {
  const defaults = ["/assets/", "/static/", "/build/", "/_astro/", "/_next/", "/fonts/"];

  if (!envVar) {
    return defaults;
  }

  try {
    const custom = JSON.parse(envVar) as unknown;
    if (Array.isArray(custom)) {
      const normalized = custom
        .filter((p): p is string => typeof p === "string" && p.trim() !== "")
        .map((p) => {
          let n = p.trim();
          if (!n.startsWith("/")) {
            n = "/" + n;
          }
          if (!n.endsWith("/")) {
            n = n + "/";
          }
          return n;
        });
      return [...new Set([...defaults, ...normalized])];
    }
  } catch {
    // fall through
  }

  return defaults;
}

export default app;
