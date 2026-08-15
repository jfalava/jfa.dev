import { describe, expect, test } from "bun:test";

import router, {
  COUNTRY_BLOCKLIST_KEY,
  buildAssetPrefixes,
  findMatchingRoute,
  parseRoutesConfig,
} from "./router";

const makeCountryBlocklist = (value: string | null) => ({
  get: async (key: string, _type: "text") => (key === COUNTRY_BLOCKLIST_KEY ? value : null),
});

const makeRequest = (url: string, country?: string): Request => {
  const request = new Request(url);
  if (country) {
    Object.defineProperty(request, "cf", { value: { country } });
  }
  return request;
};

describe("router configuration", () => {
  test("normalizes object route configuration", () => {
    expect(
      parseRoutesConfig(
        JSON.stringify({
          smoothTransitions: true,
          routes: [{ binding: "APP", path: "hyperscaler-services/", preload: true }],
        }),
      ),
    ).toEqual({
      smoothTransitions: true,
      routes: [{ binding: "APP", path: "/hyperscaler-services", preload: true }],
    });
  });

  test("rejects malformed route configuration", () => {
    expect(() => parseRoutesConfig("not-json")).toThrow("valid JSON");
    expect(() => parseRoutesConfig('{"routes":[{"binding":"APP"}]}')).toThrow(
      "invalid route definition",
    );
  });

  test("prefers static routes over dynamic routes of the same depth", () => {
    const match = findMatchingRoute("/og-img-gen/status", [
      { binding: "DYNAMIC", path: "/:service/status" },
      { binding: "OG_IMG_GEN", path: "/og-img-gen/status" },
    ]);

    expect(match).toEqual({
      route: { binding: "OG_IMG_GEN", path: "/og-img-gen/status" },
      mount: "/og-img-gen/status",
    });
  });

  test("does not use the root route as a catch-all", () => {
    const routes = [
      { binding: "LANDING", path: "/" },
      { binding: "OG_IMG_GEN", path: "/og-img-gen" },
      { binding: "HYPERSCALER_SERVICES", path: "/hyperscaler-services" },
    ];

    expect(findMatchingRoute("/", routes)).toEqual({
      route: routes[0],
      mount: "/",
    });
    expect(findMatchingRoute("/assets/index.js", routes, ["/assets/"])).toEqual({
      route: routes[0],
      mount: "/",
    });
    expect(findMatchingRoute("/wp-admin.php", routes, ["/assets/"])).toBeNull();
  });

  test("returns 418 for requests outside the configured route mounts", async () => {
    const response = await router.fetch(
      new Request("https://jfa.dev/wp-admin.php"),
      {
        ROUTES: JSON.stringify({
          routes: [
            { binding: "LANDING", path: "/" },
            { binding: "OG_IMG_GEN", path: "/og-img-gen" },
            { binding: "HYPERSCALER_SERVICES", path: "/hyperscaler-services" },
          ],
        }),
      },
    );

    expect(response.status).toBe(418);
    expect(await response.text()).toBe("I'm a teapot");
  });

  test("rejects a country present in the KV blocklist before forwarding", async () => {
    const response = await router.fetch(makeRequest("https://jfa.dev/", "cn"), {
      ROUTES: JSON.stringify({ routes: [{ binding: "LANDING", path: "/" }] }),
      LANDING: { fetch: async () => new Response("forwarded") },
      OG_IMG_GEN: { fetch: async () => new Response("forwarded") },
      HYPERSCALER_SERVICES: { fetch: async () => new Response("forwarded") },
      COUNTRY_BLOCKLIST: makeCountryBlocklist(JSON.stringify(["CN", "RU"])),
    });

    expect(response.status).toBe(403);
    expect(await response.text()).toBe("Access denied");
  });

  test("forwards a country that is not present in the KV blocklist", async () => {
    const response = await router.fetch(makeRequest("https://jfa.dev/", "ES"), {
      ROUTES: JSON.stringify({ routes: [{ binding: "LANDING", path: "/" }] }),
      LANDING: { fetch: async () => new Response("forwarded") },
      OG_IMG_GEN: { fetch: async () => new Response("forwarded") },
      HYPERSCALER_SERVICES: { fetch: async () => new Response("forwarded") },
      COUNTRY_BLOCKLIST: makeCountryBlocklist(JSON.stringify(["CN", "RU"])),
    });

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("forwarded");
  });

  test("allows requests without a country blocklist binding", async () => {
    const response = await router.fetch(makeRequest("https://jfa.dev/", "CN"), {
      ROUTES: JSON.stringify({ routes: [{ binding: "LANDING", path: "/" }] }),
      LANDING: { fetch: async () => new Response("forwarded") },
      OG_IMG_GEN: { fetch: async () => new Response("forwarded") },
      HYPERSCALER_SERVICES: { fetch: async () => new Response("forwarded") },
    });

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("forwarded");
  });

  test("forwards service bindings with non-plain object tags", async () => {
    const landing = new Proxy(
      {
        fetch: async () => new Response("forwarded"),
      },
      {
        has: () => false,
      },
    );
    Object.defineProperty(landing, Symbol.toStringTag, { value: "Service" });
    const response = await router.fetch(makeRequest("https://jfa.dev/"), {
      ROUTES: JSON.stringify({ routes: [{ binding: "LANDING", path: "/" }] }),
      LANDING: landing,
      OG_IMG_GEN: { fetch: async () => new Response("forwarded") },
      HYPERSCALER_SERVICES: { fetch: async () => new Response("forwarded") },
      KEWEKE: { fetch: async () => new Response("forwarded") },
    });

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("forwarded");
  });

  test("returns 503 for a malformed KV blocklist", async () => {
    const response = await router.fetch(makeRequest("https://jfa.dev/", "ES"), {
      ROUTES: JSON.stringify({ routes: [{ binding: "LANDING", path: "/" }] }),
      LANDING: { fetch: async () => new Response("forwarded") },
      OG_IMG_GEN: { fetch: async () => new Response("forwarded") },
      HYPERSCALER_SERVICES: { fetch: async () => new Response("forwarded") },
      COUNTRY_BLOCKLIST: makeCountryBlocklist('{"CN":true}'),
    });

    expect(response.status).toBe(503);
    expect(await response.text()).toBe("Country access policy unavailable");
  });

  test("supports exact-file and directory asset prefixes", () => {
    expect(buildAssetPrefixes('["icons/", "/manifest.json"]').slice(-2)).toEqual([
      "/icons/",
      "/manifest.json",
    ]);
  });
});
