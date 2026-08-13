import { describe, expect, test } from "bun:test";

import { handleMountedApp } from "./vmfe";

function createUpstream(
  fetch: (request: Request) => Promise<Response>,
): Fetcher {
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
    expect(forwardedRequest?.headers.get("x-forwarded-prefix")).toBe(
      "/hyperscaler-services",
    );
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

    expect(response.headers.get("location")).toBe(
      "https://jfa.dev/hyperscaler-services/login",
    );
    expect(response.headers.get("set-cookie")).toContain(
      "session=1; Path=/hyperscaler-services/; HttpOnly",
    );
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

    expect(await response.text()).toBe(
      ".a{src:url('/hyperscaler-services/assets/font.woff2)}",
    );
  });
});
