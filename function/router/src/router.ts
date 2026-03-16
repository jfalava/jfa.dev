import { handleMountedApp } from "./vmfe";
import type { RouteConfig, RoutesConfig } from "./vmfe";

import { Hono } from "hono";

type Bindings = {
  LANDING: Fetcher;
  OG_IMG_GEN: Fetcher;
  ROUTES: string;
  ASSET_PREFIXES?: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.all("*", async (c) => {
  const config: RoutesConfig = JSON.parse(c.env.ROUTES);
  const routeDefs: RouteConfig[] = Array.isArray(config) ? config : config.routes;

  const pathname = new URL(c.req.url).pathname;

  let matched: { route: RouteConfig; mount: string } | null = null;

  for (const route of routeDefs) {
    if (route.path === "/") {
      if (!matched) {
        matched = { route, mount: "/" };
      }
    } else if (pathname === route.path || pathname.startsWith(route.path + "/")) {
      if (!matched || route.path.length > matched.mount.length) {
        matched = { route, mount: route.path };
      }
    }
  }

  if (!matched) {
    return c.text("Not found", 404);
  }

  const binding = (c.env as Record<string, unknown>)[matched.route.binding] as Fetcher;
  if (!binding || typeof binding.fetch !== "function") {
    return c.text(`Service binding "${matched.route.binding}" not found`, 502);
  }

  const assetPrefixes = buildAssetPrefixes(c.env.ASSET_PREFIXES);

  const preloadMounts = routeDefs
    .filter((r) => r.preload && !r.path.includes(":") && r.path !== matched!.mount)
    .map((r) => r.path);

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
    const custom = JSON.parse(envVar);
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
