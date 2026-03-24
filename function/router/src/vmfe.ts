/**
 * Vertical Microfrontend helpers.
 *
 * Core rewriting logic adapted from the Cloudflare VMFE router template:
 * https://github.com/cloudflare/templates/tree/main/microfrontend-template
 */

export type RouteConfig = {
  binding: string;
  path: string;
  preload?: boolean;
};

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
  return prefixes.some((p) => path.startsWith(p));
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
      if (href.startsWith("/") && !this.isScoped(href)) {
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
        if (url.startsWith("/") && !this.isScoped(url) && hasAssetPrefix(url, this.assetPrefixes)) {
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

    if (!val.startsWith("/")) {
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

  constructor(mounts: string[]) {
    this.json = JSON.stringify({ prefetch: [{ urls: mounts }] });
  }

  element(el: Element): void {
    if (this.injected) {
      return;
    }
    this.injected = true;
    el.append(`<script type="speculationrules">${this.json}</script>`, { html: true });
  }
}

class PreloadScriptInjector {
  private injected = false;
  private path: string;

  constructor(mount: string) {
    this.path = mount === "/" ? "/__mf-preload.js" : `${mount}/__mf-preload.js`;
  }

  element(el: Element): void {
    if (this.injected) {
      return;
    }
    this.injected = true;
    el.append(`<script src="${this.path}" defer></script>`, { html: true });
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
  const getSetCookie = (headers as unknown as { getSetCookie?: () => string[] }).getSetCookie;
  if (!getSetCookie) {
    return;
  }
  const cookies = getSetCookie.call(headers);
  if (!cookies || cookies.length === 0) {
    return;
  }
  headers.delete("Set-Cookie");
  for (const cookie of cookies) {
    if (/;\s*Path=\//i.test(cookie)) {
      const newPath = normalizedMount === "/" ? "/" : `${normalizedMount}/`;
      headers.append("Set-Cookie", cookie.replace(/;\s*Path=\//i, `; Path=${newPath}`));
    } else {
      headers.append("Set-Cookie", cookie);
    }
  }
}

/* ----------------------- preload script ----------------------- */

function preloadScriptResponse(mounts: string[]): Response {
  const json = JSON.stringify(mounts);
  const js =
    `(()=>{const routes=${json};` +
    `const run=()=>{for(const p of routes){fetch(p,{method:"GET",credentials:"same-origin",cache:"default"}).catch(()=>{});}};` +
    `if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",run,{once:true});}else{run();}` +
    `})();`;

  return new Response(js, {
    status: 200,
    headers: {
      "content-type": "application/javascript; charset=utf-8",
      "cache-control": "public, max-age=300",
    },
  });
}

/* ----------------------- browser detection ----------------------- */

function isChromium(ua: string): boolean {
  if (!ua) {
    return false;
  }
  const lower = ua.toLowerCase();
  const hasChrome =
    lower.includes("chrome") ||
    lower.includes("edg/") ||
    lower.includes("opr/") ||
    lower.includes("brave");
  const isFirefox = lower.includes("firefox");
  const isSafari = lower.includes("safari") && !lower.includes("chrome");
  return hasChrome && !isFirefox && !isSafari;
}

/* ----------------------- URL handling ----------------------- */

function buildForwardUrl(requestUrl: string, mount: string): URL {
  const normalizedMount = normalizePath(mount);
  const forwardUrl = new URL(requestUrl);

  if (normalizedMount !== "/") {
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
  request: Request;
  smoothTransitions?: boolean;
  preloadStaticMounts?: string[];
}

async function handleHtmlResponse(ctx: HtmlResponseContext): Promise<Response> {
  const {
    upstreamResp,
    headers,
    mount,
    assetPrefixes,
    request,
    smoothTransitions,
    preloadStaticMounts,
  } = ctx;
  const html = await upstreamResp.text();
  const headersOut = cloneHeadersForTransform(headers);
  rewriteSetCookie(headersOut, mount);

  const ua = request.headers.get("user-agent") || "";
  const chromium = isChromium(ua);

  const rewriter = new HTMLRewriter().on("*", new AssetAttributeRewriter(mount, assetPrefixes));

  if (smoothTransitions) {
    rewriter.on("head", new SmoothTransitionsInjector());
  }

  if (preloadStaticMounts?.length) {
    if (chromium) {
      rewriter.on("head", new SpeculationRulesInjector(preloadStaticMounts));
    } else {
      rewriter.on("body", new PreloadScriptInjector(mount));
    }
  }

  return rewriter.transform(
    new Response(html, {
      status: upstreamResp.status,
      statusText: upstreamResp.statusText,
      headers: headersOut,
    }),
  );
}

async function handleCssResponse(
  upstreamResp: Response,
  headers: Headers,
  mount: string,
  assetPrefixes: string[],
): Promise<Response> {
  const css = await upstreamResp.text();
  const headersOut = cloneHeadersForTransform(headers);
  rewriteSetCookie(headersOut, mount);

  const prefix = mount === "/" ? "" : mount;
  const pattern = assetPrefixes
    .map((p) => p.slice(1, -1))
    .map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  const regex = new RegExp(`url\\(\\s*(['"]?)(/(?:${pattern})/)`, "g");
  const rewritten = css.replace(regex, `url($1${prefix}$2`);

  return new Response(rewritten, {
    status: upstreamResp.status,
    statusText: upstreamResp.statusText,
    headers: headersOut,
  });
}

/* ----------------------- main handler ----------------------- */

export async function handleMountedApp(
  request: Request,
  upstream: Fetcher,
  mount: string,
  assetPrefixes: string[],
  options?: {
    smoothTransitions?: boolean;
    preloadStaticMounts?: string[];
  },
): Promise<Response> {
  const forwardUrl = buildForwardUrl(request.url, mount);

  if (options?.preloadStaticMounts?.length && forwardUrl.pathname === "/__mf-preload.js") {
    return preloadScriptResponse(options.preloadStaticMounts);
  }

  const upstreamResp = await upstream.fetch(new Request(forwardUrl.toString(), request));
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
      request,
      smoothTransitions: options?.smoothTransitions,
      preloadStaticMounts: options?.preloadStaticMounts,
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
