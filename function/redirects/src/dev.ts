import app from "./redirects";

const port = Number(Bun.env.PORT ?? "8781");

Bun.serve({
  hostname: "0.0.0.0",
  port,
  fetch(request) {
    return app.fetch(request);
  },
});

console.warn(`[redirects] local adapter listening on http://localhost:${port}`);
