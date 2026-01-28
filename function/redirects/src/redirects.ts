import { Hono } from "hono";

import { redirects } from "./redirects-config";

const app = new Hono();

function htmlRedirect(destination: string): Response {
  const body = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>Redirecting…</title>
  <meta http-equiv="refresh" content="0; url=${destination}"/>
  <script>
    // As soon as this loads, tack on the hash and replace
    window.location.replace("${destination}" + window.location.hash);
  </script>
</head>
<body></body>
</html>`;
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-transform",
    },
  });
}

app.all("*", async (c) => {
  const url = new URL(c.req.url);
  const { hostname, pathname, search } = url;

  if (pathname.startsWith("/api/")) {
    return c.notFound();
  }

  const entry = redirects.find(
    (e) => hostname === e.in || (!!e.preserveSubdomain && hostname.endsWith(`.${e.in}`)),
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

  const destinationURL = `${targetHost}${pathname}${search}`;
  return htmlRedirect(destinationURL);
});

export default app;
