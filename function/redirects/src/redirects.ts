import { Hono } from "hono";

import { redirects } from "./redirects-config";

const app = new Hono();

function toAbsoluteBaseUrl(value: string): string {
  if (/^https?:\/\//i.test(value)) {
    return value;
  }
  return `https://${value}`;
}

app.all("*", async (c) => {
  const url = new URL(c.req.url);
  const { hostname, pathname, search } = url;

  if (pathname.startsWith("/api/")) {
    return c.notFound();
  }

  const entry = redirects.find(
    (e) => hostname === e.in || (Boolean(e.preserveSubdomain) && hostname.endsWith(`.${e.in}`)),
  );

  if (!entry) {
    return c.text("Not found", 404);
  }

  // build the target host (with optional subdomain preservation)
  let targetHost = entry.out;
  if (entry.preserveSubdomain && hostname !== entry.in) {
    const sub = hostname.slice(0, hostname.length - `.${entry.in}`.length);
    targetHost = `${sub}.${entry.out}`;
  }

  const destinationBase = toAbsoluteBaseUrl(targetHost);
  const destinationURL = new URL(`${pathname}${search}`, destinationBase).toString();
  return Response.redirect(destinationURL, 308);
});

export default app;
