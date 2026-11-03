import { describe, expect, test } from "bun:test";

import { handleMountedApp } from "./vmfe";

function createUpstream(fetch: (request: Request) => Promise<Response>): Fetcher {
  return {
    fetch,
    connect: () => {
      throw new Error("connect is not used in this test");
    },
  };
}

function matchesAny(patterns: string[], url: string): boolean {
  return patterns.some((pattern) => new URLPattern(pattern, "https://jfa.dev/").test(url));
}

describe("speculation rules", () => {
  test("prerenders links into other mounts on intent, for every browser", async () => {
    const upstream = createUpstream(
      async () =>
        new Response("<html><head></head><body></body></html>", {
          headers: { "content-type": "text/html" },
        }),
    );

    const response = await handleMountedApp(
      new Request("https://jfa.dev/docs/", { headers: { "user-agent": "Firefox/140.0" } }),
      upstream,
      "/docs",
      ["/assets/"],
      {
        preserveMount: true,
        preloadRoutes: [
          { binding: "LANDING", path: "/", preload: true },
          {
            binding: "KEWEKE",
            path: "/keweke",
            preload: true,
            preloadExclude: ["/keweke/:path+"],
          },
        ],
      },
    );
    const html = await response.text();
    const json = /<script type="speculationrules">(.*?)<\/script>/.exec(html)?.[1];
    type Rules = {
      prerender: {
        eagerness: string;
        where: { and: [{ href_matches: string[] }, { not: { href_matches: string[] } }] };
      }[];
    };
    // SAFETY: The router serializes this shape; the assertions below fail if it changes.
    const rules = JSON.parse(json ?? "{}") as Rules;
    const [rule] = rules.prerender;
    const [included, excluded] = rule?.where.and ?? [
      { href_matches: [] },
      { not: { href_matches: [] } },
    ];
    const prerenders = (url: string) =>
      matchesAny(included.href_matches, url) && !matchesAny(excluded.not.href_matches, url);

    expect(rule?.eagerness).toBe("moderate");
    expect(html).not.toContain("__mf-preload");
    expect(prerenders("https://jfa.dev/")).toBe(true);
    expect(prerenders("https://jfa.dev/keweke/")).toBe(true);
    // Keweke lists open a live WebSocket, and the current app navigates client-side.
    expect(prerenders("https://jfa.dev/keweke/list-1")).toBe(false);
    expect(prerenders("https://jfa.dev/docs/keweke")).toBe(false);
  });
});

describe("mounted app forwarding", () => {
  test("strips the mount and forwards the mount header", async () => {
    let forwardedRequest: Request | undefined;
    const upstream = createUpstream(async (request) => {
      forwardedRequest = request;
      return new Response("ok");
    });

    const response = await handleMountedApp(
      new Request("https://jfa.dev/hyperscaler-services/search?q=cloud"),
      upstream,
      "/hyperscaler-services",
      ["/assets/"],
    );

    expect(await response.text()).toBe("ok");
    expect(forwardedRequest?.url).toBe("https://jfa.dev/search?q=cloud");
    expect(forwardedRequest?.headers.get("x-forwarded-prefix")).toBe("/hyperscaler-services");
  });

  test("preserves the mount for apps built with a public base path", async () => {
    let forwardedRequest: Request | undefined;
    const upstream = createUpstream(async (request) => {
      forwardedRequest = request;
      return new Response("ok");
    });

    await handleMountedApp(
      new Request("https://jfa.dev/hyperscaler-services/search?q=cloud"),
      upstream,
      "/hyperscaler-services",
      ["/assets/"],
      { preserveMount: true },
    );

    expect(forwardedRequest?.url).toBe("https://jfa.dev/hyperscaler-services/search?q=cloud");
    expect(forwardedRequest?.headers.get("x-forwarded-prefix")).toBe("/hyperscaler-services");
  });

  test("passes WebSocket upgrade responses through without rebuilding them", async () => {
    // SAFETY: This test double only needs the Response status inspected by the forwarding path.
    const upgradeResponse = { status: 101 } as Response;
    const upstream = createUpstream(async () => upgradeResponse);

    const response = await handleMountedApp(
      new Request("https://jfa.dev/keweke/api/lists/list/live", {
        headers: { Upgrade: "websocket" },
      }),
      upstream,
      "/keweke",
      ["/assets/"],
      { preserveMount: true },
    );

    expect(response).toBe(upgradeResponse);
  });

  test("preserves the mount for known static assets", async () => {
    let forwardedRequest: Request | undefined;
    const upstream = createUpstream(async (request) => {
      forwardedRequest = request;
      return new Response("asset");
    });

    const response = await handleMountedApp(
      new Request("https://jfa.dev/hyperscaler-services/assets/app.css"),
      upstream,
      "/hyperscaler-services",
      ["/assets/", "/theme-init.js"],
    );

    expect(await response.text()).toBe("asset");
    expect(forwardedRequest?.url).toBe("https://jfa.dev/hyperscaler-services/assets/app.css");
  });

  test("strips the mount for root-built app assets when configured", async () => {
    let forwardedRequest: Request | undefined;
    const upstream = createUpstream(async (request) => {
      forwardedRequest = request;
      return new Response("asset");
    });

    const response = await handleMountedApp(
      new Request("https://jfa.dev/opengraph/assets/app.css"),
      upstream,
      "/opengraph",
      ["/assets/", "/theme-init.js"],
      { preserveMount: false },
    );

    expect(await response.text()).toBe("asset");
    expect(forwardedRequest?.url).toBe("https://jfa.dev/assets/app.css");
  });

  test("rewrites redirects and cookie paths", async () => {
    const upstream = createUpstream(
      async () =>
        new Response(null, {
          status: 302,
          headers: {
            location: "/login",
            "set-cookie": "session=1; Path=/; HttpOnly",
          },
        }),
    );

    const response = await handleMountedApp(
      new Request("https://jfa.dev/hyperscaler-services"),
      upstream,
      "/hyperscaler-services",
      ["/assets/"],
    );

    expect(response.headers.get("location")).toBe("https://jfa.dev/hyperscaler-services/login");
    expect(response.headers.get("set-cookie")).toContain(
      "session=1; Path=/hyperscaler-services/; HttpOnly",
    );
  });

  test("preserves root paths for shared preference cookies", async () => {
    const upstream = createUpstream(
      async () =>
        new Response(null, {
          headers: {
            "set-cookie": "jfa-theme=dark; Path=/; SameSite=Lax",
          },
        }),
    );

    const response = await handleMountedApp(
      new Request("https://jfa.dev/hyperscaler-services"),
      upstream,
      "/hyperscaler-services",
      ["/assets/"],
    );

    expect(response.headers.get("set-cookie")).toBe("jfa-theme=dark; Path=/; SameSite=Lax");
  });

  test("normalizes shared preference cookies emitted with a mounted path", async () => {
    const upstream = createUpstream(
      async () =>
        new Response(null, {
          headers: {
            "set-cookie": "jfa-language=es; Path=/keweke/; SameSite=Lax",
          },
        }),
    );

    const response = await handleMountedApp(
      new Request("https://jfa.dev/keweke"),
      upstream,
      "/keweke",
      ["/assets/"],
    );

    expect(response.headers.get("set-cookie")).toBe("jfa-language=es; Path=/; SameSite=Lax");
  });

  test("rewrites CSS asset URLs without buffering the response", async () => {
    const upstream = createUpstream(
      async () =>
        new Response(
          new ReadableStream<Uint8Array>({
            start(controller) {
              controller.enqueue(new TextEncoder().encode(".a{src:url('/ass"));
              controller.enqueue(new TextEncoder().encode("ets/font.woff2)}"));
              controller.close();
            },
          }),
          { headers: { "content-type": "text/css" } },
        ),
    );

    const response = await handleMountedApp(
      new Request("https://jfa.dev/hyperscaler-services/styles.css"),
      upstream,
      "/hyperscaler-services",
      ["/assets/"],
    );

    expect(await response.text()).toBe(".a{src:url('/hyperscaler-services/assets/font.woff2)}");
  });
});
