import app from "./redirects";

type RuntimeEnv = Record<string, string | undefined>;

const runtimeEnv = (globalThis as unknown as {
  process: { env: RuntimeEnv };
}).process.env;

const port = Number(runtimeEnv.PORT ?? "8781");

Bun.serve({
  hostname: "0.0.0.0",
  port,
  fetch(request) {
    return app.fetch(request);
  },
});

console.warn(`[redirects] local adapter listening on http://localhost:${port}`);
