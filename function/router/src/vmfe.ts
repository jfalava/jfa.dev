/**
 * Vertical Microfrontend helpers.
 *
 * Core rewriting logic adapted from the Cloudflare VMFE router template:
 * https://github.com/cloudflare/templates/tree/main/microfrontend-template
 */

export type RouteConfig = {
  binding: string;
  path: string;
  /** Prerender same-origin links into this mount when a visitor shows intent. */
  preload?: boolean;
  /** URL patterns under this mount that must never prerender. */
  preloadExclude?: string[];
  preserveMount?: boolean;
};

export type WorkerFetcher = Pick<Fetcher, "fetch">;

export type RoutesConfig = RouteConfig[] | { smoothTransitions?: boolean; routes: RouteConfig[] };

/* ----------------------------- utilities ----------------------------- */

function normalizePath(path: string): string {
  let normalized = path;
  if (!normalized.startsWith("/")) {
    normalized = "/" + normalized;
  }
  if (normalized !== "/" && normalized.endsWith("/")) {
    normalized = normalized.slice(0, -1);
  }
  return normalized;
}

function hasAssetPrefix(path: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => {
    if (prefix.endsWith("/")) {
      return path.startsWith(prefix);
    }

    return path === prefix || path.startsWith(`${prefix}?`) || path.startsWith(`${prefix}#`);
  });
}

function isRootRelativeUrl(value: string): boolean {
  return value.startsWith("/") && !value.startsWith("//");
}

/* ---------------------- HTML rewriting ---------------------- */

const ASSET_ATTRIBUTES = [
  "href",
  "src",
  "poster",
  "content",
  "action",
  "cite",
  "formaction",
  "manifest",
  "ping",
  "archive",
  "code",
  "codebase",
  "data",
  "url",
  "srcset",
  "data-src",
  "data-href",
  "data-url",
  "data-srcset",
  "data-background",
  "data-image",
  "data-link",
  "data-poster",
  "data-video",
  "data-audio",
  "component-url",
  "astro-component-url",
  "sveltekit-url",
  "renderer-url",
  "background",
  "xlink:href",
];

class AssetAttributeRewriter {
  private mount: string;

  constructor(
    mount: string,
    private assetPrefixes: string[],
  ) {
    this.mount = normalizePath(mount);
  }

  private prepend(path: string): string {
    return this.mount === "/" ? path : this.mount + path;
  }

  private isScoped(path: string): boolean {
    if (this.mount === "/") {
      return true;
    }
    return path.startsWith(`${this.mount}/`);
  }

  private rewriteLinkIcon(el: Element): void {
    const rel = el.getAttribute("rel")?.toLowerCase();
    const href = el.getAttribute("href");
    if (rel && (rel.includes("icon") || rel.includes("shortcut")) && href) {
      if (isRootRelativeUrl(href) && !this.isScoped(href)) {
        el.setAttribute("href", this.prepend(href));
      }
    }
  }

  private parseSrcsetCandidates(val: string): string[] {
    const candidates: string[] = [];
    let current = "";
    let inQuote: "'" | '"' | null = null;
    let parenDepth = 0;

    for (const char of val) {
      if ((char === "'" || char === '"') && inQuote === null) {
        inQuote = char;
      } else if ((char === "'" || char === '"') && inQuote === char) {
        inQuote = null;
      } else if (char === "(" && inQuote === null) {
        parenDepth++;
      } else if (char === ")" && inQuote === null) {
        parenDepth--;
      } else if (char === "," && inQuote === null && parenDepth === 0) {
        candidates.push(current.trim());
        current = "";
        continue;
      }
      current += char;
    }

    if (current.trim()) {
      candidates.push(current.trim());
    }
    return candidates;
  }

  private rewriteSrcset(val: string): string {
    const candidates = this.parseSrcsetCandidates(val);

    return candidates
      .map((candidate) => {
        const parts = candidate.split(/\s+/);
        const url = parts[0];
        if (
          isRootRelativeUrl(url) &&
          !this.isScoped(url) &&
          hasAssetPrefix(url, this.assetPrefixes)
        ) {
          return this.prepend(url) + (parts[1] ? " " + parts[1] : "");
        }
        return candidate;
      })
      .join(", ");
  }

  private rewriteAttribute(el: Element, attr: string): void {
    const val = el.getAttribute(attr);
    if (!val) {
      return;
    }

    if (attr === "srcset" || attr.endsWith("srcset")) {
      const rewritten = this.rewriteSrcset(val);
      if (rewritten !== val) {
        el.setAttribute(attr, rewritten);
      }
      return;
    }

    if (!isRootRelativeUrl(val)) {
      return;
    }
    if (this.isScoped(val)) {
      return;
    }
    if (!hasAssetPrefix(val, this.assetPrefixes)) {
      return;
    }

    el.setAttribute(attr, this.prepend(val));
  }

  element(el: Element): void {
    const tagName = el.tagName?.toLowerCase();

    if (tagName === "link") {
      this.rewriteLinkIcon(el);
    }

    for (const attr of ASSET_ATTRIBUTES) {
      this.rewriteAttribute(el, attr);
    }
  }
}

class SmoothTransitionsInjector {
  private injected = false;

  element(el: Element): void {
    if (this.injected) {
      return;
    }
    this.injected = true;

    const css = `@supports (view-transition-name: none) {
  ::view-transition-old(root),
  ::view-transition-new(root) {
    animation-duration: 0.3s;
    animation-timing-function: ease-in-out;
  }
  main { view-transition-name: main-content; }
  nav { view-transition-name: navigation; }
}`;

    el.append(`<style>${css}</style>`, { html: true });
  }
}

class SpeculationRulesInjector {
  private injected = false;
  private json: string;

  constructor(routes: RouteConfig[]) {
    // Each app navigates within itself client-side, so only links into other
    // mounts are full navigations worth prerendering. "moderate" starts on
    // hover or pointerdown, so a page view no longer fetches every app.
    const targets = routes.map((route) => (route.path === "/" ? "/" : `${route.path}/*`));
    const excludes = routes.flatMap((route) => route.preloadExclude ?? []);
    const where = excludes.length
      ? { and: [{ href_matches: targets }, { not: { href_matches: excludes } }] }
      : { href_matches: targets };
    this.json = JSON.stringify({ prerender: [{ where, eagerness: "moderate" }] });
  }

  element(el: Element): void {
    if (this.injected) {
      return;
    }
    this.injected = true;
    el.append(`<script type="speculationrules">${this.json}</script>`, { html: true });
  }
}

/* ----------------------- headers ----------------------- */

function cloneHeadersForTransform(original: Headers): Headers {
  const headers = new Headers(original);
  headers.delete("content-length");
  headers.delete("etag");
  headers.delete("content-encoding");
  return headers;
}

function isPathScoped(pathname: string, mount: string): boolean {
  if (mount === "/") {
    return true;
  }
  return pathname === mount || pathname.startsWith(`${mount}/`);
}

function mountedRelativePath(pathname: string, mount: string): string | null {
  const normalizedMount = normalizePath(mount);
  if (!isPathScoped(pathname, normalizedMount)) {
    return null;
  }

  if (normalizedMount === "/") {
    return pathname;
  }

  return pathname === normalizedMount ? "/" : pathname.slice(normalizedMount.length);
}

function isMountedAssetRequest(pathname: string, mount: string, assetPrefixes: string[]): boolean {
  const relativePath = mountedRelativePath(pathname, mount);
  return relativePath !== null && hasAssetPrefix(relativePath, assetPrefixes);
}

function rewriteLocation(location: string, mount: string, forwardUrl: URL): string {
  const normalizedMount = normalizePath(mount);
  try {
    const url = new URL(location, forwardUrl);
    if (url.origin === forwardUrl.origin && url.pathname.startsWith("/")) {
      if (isPathScoped(url.pathname, normalizedMount)) {
        // Already scoped, don't double-prefix
        return url.toString();
      }
      url.pathname = normalizedMount === "/" ? url.pathname : normalizedMount + url.pathname;
      return url.toString();
    }
  } catch {
    // ignore
  }
  return location;
}

function rewriteSetCookie(headers: Headers, mount: string): void {
  const normalizedMount = normalizePath(mount);
  const cookies = headers.getSetCookie();
  if (!cookies || cookies.length === 0) {
    return;
  }
  headers.delete("Set-Cookie");
  for (const cookie of cookies) {
    if (isSharedPreferenceCookie(cookie)) {
      headers.append("Set-Cookie", rootScopePreferenceCookie(cookie));
    } else if (/;\s*Path=\//i.test(cookie)) {
      const newPath = normalizedMount === "/" ? "/" : `${normalizedMount}/`;
      headers.append("Set-Cookie", cookie.replace(/;\s*Path=\//i, `; Path=${newPath}`));
    } else {
      headers.append("Set-Cookie", cookie);
    }
  }
}

function isSharedPreferenceCookie(cookie: string): boolean {
  return /^(?:jfa-language|jfa-theme|jfa-wrap-text)=/i.test(cookie.trim());
}

function rootScopePreferenceCookie(cookie: string): string {
  if (/;\s*Path=/i.test(cookie)) {
    return cookie.replace(/;\s*Path=[^;]*/i, "; Path=/");
  }

  return `${cookie}; Path=/`;
}

/* ----------------------- URL handling ----------------------- */

function buildForwardUrl(requestUrl: string, mount: string, preserveMount: boolean): URL {
  const normalizedMount = normalizePath(mount);
  const forwardUrl = new URL(requestUrl);

  if (!preserveMount && normalizedMount !== "/") {
    if (forwardUrl.pathname === normalizedMount) {
      forwardUrl.pathname = "/";
    } else if (forwardUrl.pathname.startsWith(`${normalizedMount}/`)) {
      forwardUrl.pathname = forwardUrl.pathname.slice(normalizedMount.length) || "/";
    }
  }

  return forwardUrl;
}

/* ----------------------- response handlers ----------------------- */

async function handleRedirectResponse(
  upstreamResp: Response,
  headers: Headers,
  mount: string,
  forwardUrl: URL,
): Promise<Response> {
  const loc = headers.get("location");
  if (loc) {
    headers.set("location", rewriteLocation(loc, mount, forwardUrl));
  }
  rewriteSetCookie(headers, mount);
  return new Response(null, { status: upstreamResp.status, headers });
}

interface HtmlResponseContext {
  upstreamResp: Response;
  headers: Headers;
  mount: string;
  assetPrefixes: string[];
  smoothTransitions?: boolean;
  preloadRoutes?: RouteConfig[];
}

function handleHtmlResponse(ctx: HtmlResponseContext): Response {
  const { upstreamResp, headers, mount, assetPrefixes, smoothTransitions, preloadRoutes } = ctx;
  const headersOut = cloneHeadersForTransform(headers);
  rewriteSetCookie(headersOut, mount);

  const rewriter = new HTMLRewriter().on("*", new AssetAttributeRewriter(mount, assetPrefixes));

  if (smoothTransitions) {
    rewriter.on("head", new SmoothTransitionsInjector());
  }

  if (preloadRoutes?.length) {
    rewriter.on("head", new SpeculationRulesInjector(preloadRoutes));
  }

  return rewriter.transform(
    new Response(upstreamResp.body, {
      status: upstreamResp.status,
      statusText: upstreamResp.statusText,
      headers: headersOut,
    }),
  );
}

function rewriteCssText(css: string, mount: string, assetPrefixes: string[]): string {
  const directoryPrefixes = assetPrefixes.filter(
    (prefix) => prefix.endsWith("/") && prefix !== "/",
  );

  if (!directoryPrefixes.length || mount === "/") {
    return css;
  }

  const prefixPattern = directoryPrefixes
    .map((prefix) => prefix.slice(1, -1).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  const urlPattern = new RegExp(`url\\(\\s*(['"]?)(/(?:${prefixPattern})/[^'"\\s)]+)`, "gi");

  return css.replace(urlPattern, (_match, quote: string, url: string) => {
    return `url(${quote}${mount}${url}`;
  });
}

function rewriteCssStream(
  body: ReadableStream<Uint8Array> | null,
  mount: string,
  assetPrefixes: string[],
): ReadableStream<Uint8Array> | null {
  if (!body || mount === "/") {
    return body;
  }

  const directoryPrefixLength = assetPrefixes
    .filter((prefix) => prefix.endsWith("/") && prefix !== "/")
    .reduce((longest, prefix) => Math.max(longest, prefix.length), 0);

  if (!directoryPrefixLength) {
    return body;
  }

  const carryLength = Math.max(256, directoryPrefixLength + mount.length + 64);
  let carry = "";

  return body
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(
      new TransformStream<string, string>({
        transform(chunk, controller) {
          const value = carry + chunk;
          if (value.length <= carryLength) {
            carry = value;
            return;
          }

          const splitAt = value.length - carryLength;
          controller.enqueue(rewriteCssText(value.slice(0, splitAt), mount, assetPrefixes));
          carry = value.slice(splitAt);
        },
        flush(controller) {
          if (carry) {
            controller.enqueue(rewriteCssText(carry, mount, assetPrefixes));
          }
        },
      }),
    )
    .pipeThrough(new TextEncoderStream());
}

function handleCssResponse(
  upstreamResp: Response,
  headers: Headers,
  mount: string,
  assetPrefixes: string[],
): Response {
  const headersOut = cloneHeadersForTransform(headers);
  rewriteSetCookie(headersOut, mount);
  const body = rewriteCssStream(upstreamResp.body, mount, assetPrefixes);

  return new Response(body, {
    status: upstreamResp.status,
    statusText: upstreamResp.statusText,
    headers: headersOut,
  });
}

/* ----------------------- main handler ----------------------- */

export async function handleMountedApp(
  request: Request,
  upstream: WorkerFetcher,
  mount: string,
  assetPrefixes: string[],
  options?: {
    smoothTransitions?: boolean;
    preloadRoutes?: RouteConfig[];
    preserveMount?: boolean;
  },
): Promise<Response> {
  const requestURL = new URL(request.url);
  const preserveMount =
    options?.preserveMount ?? isMountedAssetRequest(requestURL.pathname, mount, assetPrefixes);
  const forwardUrl = buildForwardUrl(request.url, mount, preserveMount);

  const upstreamRequest = new Request(forwardUrl.toString(), request);
  const normalizedMount = normalizePath(mount);
  if (normalizedMount === "/") {
    upstreamRequest.headers.delete("x-forwarded-prefix");
  } else {
    upstreamRequest.headers.set("x-forwarded-prefix", normalizedMount);
  }
  const upstreamResp = await upstream.fetch(upstreamRequest);
  if (upstreamResp.status === 101) {
    return upstreamResp;
  }
  const headers = new Headers(upstreamResp.headers);
  const contentType = headers.get("content-type") || "";

  // Redirects
  if (upstreamResp.status >= 300 && upstreamResp.status < 400) {
    return handleRedirectResponse(upstreamResp, headers, mount, forwardUrl);
  }

  // HTML
  if (contentType.includes("text/html")) {
    return handleHtmlResponse({
      upstreamResp,
      headers,
      mount,
      assetPrefixes,
      smoothTransitions: options?.smoothTransitions,
      preloadRoutes: options?.preloadRoutes,
    });
  }

  // CSS
  if (contentType.includes("text/css")) {
    return handleCssResponse(upstreamResp, headers, mount, assetPrefixes);
  }

  // Passthrough
  rewriteSetCookie(headers, mount);
  return new Response(upstreamResp.body, {
    status: upstreamResp.status,
    statusText: upstreamResp.statusText,
    headers,
  });
}
