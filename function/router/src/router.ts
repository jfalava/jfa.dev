import {
  handleMountedApp,
  type RouteConfig,
  type RoutesConfig,
  type WorkerFetcher,
} from "./vmfe";

import { Hono } from "hono";

export type Bindings = {
  LANDING: WorkerFetcher;
  OG_IMG_GEN: WorkerFetcher;
  HYPERSCALER_SERVICES: WorkerFetcher;
  ROUTES: string;
  ASSET_PREFIXES?: string;
};

const app = new Hono<{ Bindings: Bindings }>();

export function segmentsMatch(
  routeSegments: string[],
  pathnameSegments: string[],
): boolean {
  if (routeSegments.length > pathnameSegments.length) {
    return false;
  }
  for (let i = 0; i < routeSegments.length; i++) {
    const routeSeg = routeSegments[i];
    const pathSeg = pathnameSegments[i];
    if (routeSeg.startsWith(":")) {
      continue;
    }
    if (routeSeg !== pathSeg) {
      return false;
    }
  }
  return true;
}

export function findMatchingRoute(
  pathname: string,
  routeDefs: RouteConfig[],
): { route: RouteConfig; mount: string } | null {
  let matched: { route: RouteConfig; mount: string } | null = null;
  let matchedScore = 0;

  const pathnameSegments = pathname.split("/").filter(Boolean);

  for (const route of routeDefs) {
    if (route.path === "/") {
      if (!matched) {
        matched = { route, mount: "/" };
        matchedScore = 0;
      }
      continue;
    }

    const routeSegments = route.path.split("/").filter(Boolean);

    if (!segmentsMatch(routeSegments, pathnameSegments)) {
      continue;
    }

    const score = routeSegments.reduce(
      (total, segment) => total + (segment.startsWith(":") ? 1 : 2),
      0,
    );
    if (score > matchedScore) {
      const mountSegments = pathnameSegments.slice(0, routeSegments.length);
      const mount = "/" + mountSegments.join("/");
      matched = { route, mount };
      matchedScore = score;
    }
  }

  return matched;
}

function getPreloadMounts(routeDefs: RouteConfig[], currentMount: string): string[] {
  return routeDefs
    .filter((r) => r.preload && !r.path.includes(":") && r.path !== currentMount)
    .map((r) => r.path);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeRoutePath(path: string): string {
  const trimmed = path.trim();
  const withLeadingSlash = trimmed.startsWith("/")
    ? trimmed
    : `/${trimmed}`;
  return withLeadingSlash.length > 1
    ? withLeadingSlash.replace(/\/+$/, "")
    : withLeadingSlash;
}

function parseRoute(value: unknown): RouteConfig | null {
  if (!isRecord(value)) {
    return null;
  }

  const binding = typeof value.binding === "string" ? value.binding.trim() : "";
  const path = typeof value.path === "string" ? value.path.trim() : "";
  const preload = value.preload;
  const preserveMount = value.preserveMount;

  if (
    !binding ||
    !path ||
    (preload !== undefined && typeof preload !== "boolean") ||
    (preserveMount !== undefined && typeof preserveMount !== "boolean")
  ) {
    return null;
  }

  return {
    binding,
    path: normalizeRoutePath(path),
    ...(preload === undefined ? {} : { preload }),
    ...(preserveMount === undefined ? {} : { preserveMount }),
  };
}

export function parseRoutesConfig(routesJson: string): RoutesConfig {
  let parsed: unknown;

  try {
    parsed = JSON.parse(routesJson) as unknown;
  } catch {
    throw new Error("ROUTES must contain valid JSON");
  }

  if (Array.isArray(parsed)) {
    const routes = parsed.map(parseRoute);
    if (!routes.length || !routes.every((route): route is RouteConfig => route !== null)) {
      throw new Error("ROUTES contains an invalid route definition");
    }

    return routes;
  }

  if (!isRecord(parsed) || !Array.isArray(parsed.routes)) {
    throw new Error("ROUTES must be an array or an object with a routes array");
  }

  const routes = parsed.routes.map(parseRoute);
  if (!routes.length || !routes.every((route): route is RouteConfig => route !== null)) {
    throw new Error("ROUTES contains an invalid route definition");
  }

  if (
    parsed.smoothTransitions !== undefined &&
    typeof parsed.smoothTransitions !== "boolean"
  ) {
    throw new Error("ROUTES smoothTransitions must be a boolean");
  }

  return {
    routes,
    ...(parsed.smoothTransitions === undefined
      ? {}
      : { smoothTransitions: parsed.smoothTransitions }),
  };
}

function isFetcher(value: unknown): value is WorkerFetcher {
  return (
    typeof value === "object" &&
    value !== null &&
    "fetch" in value &&
    typeof value.fetch === "function"
  );
}

function getServiceBinding(env: Bindings, bindingName: string): WorkerFetcher | null {
  if (!(bindingName in env)) {
    return null;
  }

  const value = env[bindingName as keyof Bindings];
  return isFetcher(value) ? value : null;
}

app.all("*", async (c) => {
  let config: RoutesConfig;
  try {
    config = parseRoutesConfig(c.env.ROUTES);
  } catch (error) {
    console.error("Invalid router configuration", error);
    return c.json({ error: "Invalid router configuration" }, 500);
  }

  const routeDefs: RouteConfig[] = Array.isArray(config) ? config : config.routes;

  const pathname = new URL(c.req.url).pathname;
  const matched = findMatchingRoute(pathname, routeDefs);

  if (!matched) {
    return c.text("Not found", 404);
  }

  const binding = getServiceBinding(c.env, matched.route.binding);
  if (!binding || typeof binding.fetch !== "function") {
    return c.text(`Service binding "${matched.route.binding}" not found`, 502);
  }

  const assetPrefixes = buildAssetPrefixes(c.env.ASSET_PREFIXES);
  const preloadMounts = getPreloadMounts(routeDefs, matched.mount);

  return handleMountedApp(c.req.raw, binding, matched.mount, assetPrefixes, {
    smoothTransitions: !Array.isArray(config) ? config.smoothTransitions : undefined,
    preloadStaticMounts: preloadMounts.length ? preloadMounts : undefined,
    preserveMount: matched.route.preserveMount,
  });
});

export function buildAssetPrefixes(envVar?: string): string[] {
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
          return n;
        });
      return [...new Set([...defaults, ...normalized])];
    }
  } catch {
    // fall through
  }

  return defaults;
}

app.onError((error, c) => {
  console.error("Router request failed", error);
  return c.json({ error: "Internal server error" }, 500);
});

export default app;
