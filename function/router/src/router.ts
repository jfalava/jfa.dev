import { handleMountedApp, type RouteConfig, type RoutesConfig, type WorkerFetcher } from "./vmfe";

import { Hono } from "hono";

type CountryBlocklistBinding = {
  get(key: string, type: "text"): Promise<string | null>;
};

export type Bindings = {
  LANDING: WorkerFetcher;
  OG_IMG_GEN: WorkerFetcher;
  HYPERSCALER_SERVICES: WorkerFetcher;
  KEWEKE: WorkerFetcher;
  BRANDING: WorkerFetcher;
  DOCS: WorkerFetcher;
  PLAYLIST: WorkerFetcher;
  ROUTES: string;
  ASSET_PREFIXES?: string;
  COUNTRY_BLOCKLIST?: CountryBlocklistBinding;
};

const app = new Hono<{ Bindings: Bindings }>();

const COUNTRY_BLOCKLIST_KEY = "blocked-countries";
const COUNTRY_BLOCKED_MESSAGE = "Access denied";
const COUNTRY_POLICY_UNAVAILABLE_MESSAGE = "Country access policy unavailable";
const COUNTRY_CODE_PATTERN = /^(?:[A-Z]{2}|T1)$/;

type JsonValue =
  | null
  | boolean
  | number
  | string
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };
type JsonObject = { readonly [key: string]: JsonValue };

type CountryCodeInput = JsonValue | undefined;

function isString(value: CountryCodeInput): value is string {
  return Object.prototype.toString.call(value) === "[object String]";
}

function isBoolean(value: JsonValue): value is boolean {
  return value === true || value === false;
}

function parseCountryCode(value: CountryCodeInput): string | undefined {
  if (!isString(value)) {
    return undefined;
  }

  const country = value.trim().toUpperCase();
  return COUNTRY_CODE_PATTERN.test(country) ? country : undefined;
}

function parseBlockedCountries(value: string | null): ReadonlySet<string> {
  if (value === null) {
    return new Set();
  }

  let parsed: JsonValue;
  try {
    // SAFETY: The parsed JSON is checked as an array and each country code is validated below.
    parsed = JSON.parse(value) as JsonValue;
  } catch (error) {
    throw new Error(
      `The ${COUNTRY_BLOCKLIST_KEY} KV value must be a JSON array of country codes: ${String(error)}`,
      { cause: error },
    );
  }

  if (!Array.isArray(parsed)) {
    throw new Error(`The ${COUNTRY_BLOCKLIST_KEY} KV value must be a JSON array of country codes`);
  }

  const countries = parsed.map((entry) => {
    const country = isString(entry) ? parseCountryCode(entry) : undefined;
    if (!country) {
      throw new Error(`The ${COUNTRY_BLOCKLIST_KEY} KV value contains an invalid country code`);
    }
    return country;
  });

  return new Set(countries);
}

export async function isCountryBlocked(
  request: Request,
  blocklist?: CountryBlocklistBinding,
): Promise<boolean> {
  const rawCountry = request.cf?.country;
  const country =
    Object.prototype.toString.call(rawCountry) === "[object String]"
      ? parseCountryCode(String(rawCountry))
      : undefined;
  if (!country || !blocklist) {
    return false;
  }

  const blockedCountries = parseBlockedCountries(
    await blocklist.get(COUNTRY_BLOCKLIST_KEY, "text"),
  );
  return blockedCountries.has(country);
}

export function segmentsMatch(routeSegments: string[], pathnameSegments: string[]): boolean {
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
  rootAssetPrefixes: string[] = [],
): { route: RouteConfig; mount: string } | null {
  let matched: { route: RouteConfig; mount: string } | null = null;
  let matchedScore = 0;

  const pathnameSegments = pathname.split("/").filter(Boolean);

  for (const route of routeDefs) {
    if (route.path === "/") {
      const isRootDocument = pathname === "/";
      const isRootAsset = rootAssetPrefixes.some((prefix) =>
        prefix.endsWith("/") ? pathname.startsWith(prefix) : pathname === prefix,
      );
      if (!isRootDocument && !isRootAsset) {
        continue;
      }

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

function isRecord(value: JsonValue): value is JsonObject {
  return Object.prototype.toString.call(value) === "[object Object]";
}

function normalizeRoutePath(path: string): string {
  const trimmed = path.trim();
  const withLeadingSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withLeadingSlash.length > 1 ? withLeadingSlash.replace(/\/+$/, "") : withLeadingSlash;
}

function parseRoute(value: JsonValue): RouteConfig | null {
  if (!isRecord(value)) {
    return null;
  }

  const binding = isString(value.binding) ? value.binding.trim() : "";
  const path = isString(value.path) ? value.path.trim() : "";
  const preload = value.preload;
  const preserveMount = value.preserveMount;

  if (
    !binding ||
    !path ||
    (preload !== undefined && !isBoolean(preload)) ||
    (preserveMount !== undefined && !isBoolean(preserveMount))
  ) {
    return null;
  }

  const route: RouteConfig = {
    binding,
    path: normalizeRoutePath(path),
  };
  if (preload !== undefined) {
    route.preload = preload;
  }
  if (preserveMount !== undefined) {
    route.preserveMount = preserveMount;
  }
  return route;
}

export function parseRoutesConfig(routesJson: string): RoutesConfig {
  let parsed: JsonValue;

  try {
    // SAFETY: The parsed JSON is narrowed through the route and field validators below.
    parsed = JSON.parse(routesJson) as JsonValue;
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

  if (parsed.smoothTransitions !== undefined && !isBoolean(parsed.smoothTransitions)) {
    throw new Error("ROUTES smoothTransitions must be a boolean");
  }

  type RoutesObjectConfig = { smoothTransitions?: boolean; routes: RouteConfig[] };
  const config: RoutesObjectConfig = {
    routes,
  };
  if (parsed.smoothTransitions !== undefined) {
    config.smoothTransitions = parsed.smoothTransitions;
  }
  return config;
}

type FetcherCandidate = JsonValue | WorkerFetcher | CountryBlocklistBinding | undefined;

function isObject(value: FetcherCandidate): value is WorkerFetcher | CountryBlocklistBinding {
  return value !== null && value !== undefined && Object(value) === value;
}

function isFetcher(value: FetcherCandidate): value is WorkerFetcher {
  if (!isObject(value)) {
    return false;
  }

  // SAFETY: Cloudflare service bindings expose fetch through a host proxy whose
  // property shape is not guaranteed to support the `in` operator.
  const fetcher = (value as { fetch?: unknown }).fetch;
  return Object.prototype.toString.call(fetcher).endsWith("Function]");
}

function getServiceBinding(env: Bindings, bindingName: string): WorkerFetcher | null {
  if (!(bindingName in env)) {
    return null;
  }

  // SAFETY: bindingName comes from the validated route configuration and is checked against env before indexing.
  const value = env[bindingName as keyof Bindings];
  return isFetcher(value) ? value : null;
}

app.all("*", async (c) => {
  try {
    if (await isCountryBlocked(c.req.raw, c.env.COUNTRY_BLOCKLIST)) {
      return c.text(COUNTRY_BLOCKED_MESSAGE, 403);
    }
  } catch (error) {
    console.error("Unable to evaluate country blocklist", error);
    return c.text(COUNTRY_POLICY_UNAVAILABLE_MESSAGE, 503);
  }

  let config: RoutesConfig;
  try {
    config = parseRoutesConfig(c.env.ROUTES);
  } catch (error) {
    console.error("Invalid router configuration", error);
    return c.json({ error: "Invalid router configuration" }, 500);
  }

  const routeDefs: RouteConfig[] = Array.isArray(config) ? config : config.routes;

  const pathname = new URL(c.req.url).pathname;
  const assetPrefixes = buildAssetPrefixes(c.env.ASSET_PREFIXES);
  const matched = findMatchingRoute(pathname, routeDefs, assetPrefixes);

  if (!matched) {
    return c.text("I'm a teapot", 418);
  }

  const binding = getServiceBinding(c.env, matched.route.binding);
  if (!binding) {
    return c.text(`Service binding "${matched.route.binding}" not found`, 502);
  }

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
    // SAFETY: The parsed value is checked as an array and filtered to non-empty strings below.
    const custom = JSON.parse(envVar) as JsonValue;
    if (Array.isArray(custom)) {
      const normalized = custom
        .filter((p): p is string => isString(p) && p.trim() !== "")
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
