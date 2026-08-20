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
      new Request("https://jfa.dev/og-img-gen/assets/app.css"),
      upstream,
      "/og-img-gen",
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
