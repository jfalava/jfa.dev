import { describe, expect, test } from "bun:test";

import {
  buildAssetPrefixes,
  findMatchingRoute,
  parseRoutesConfig,
} from "./router";

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

  test("supports exact-file and directory asset prefixes", () => {
    expect(buildAssetPrefixes('["icons/", "/manifest.json"]').slice(-2)).toEqual([
      "/icons/",
      "/manifest.json",
    ]);
  });
});
