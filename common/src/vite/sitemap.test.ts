/// <reference types="bun" />

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  buildMountedPaths,
  buildRobotsTxt,
  buildUrlset,
  collectContentPaths,
  collectRoutePaths,
  toMountPath,
} from "./sitemap-internal";

const TEMP_DIR = path.join(import.meta.dir, ".sitemap-test-fixture");

beforeAll(() => {
  rmSync(TEMP_DIR, { recursive: true, force: true });
  mkdirSync(path.join(TEMP_DIR, "src", "routes", "api"), { recursive: true });
  mkdirSync(path.join(TEMP_DIR, "content", "docs", "keweke", "lists"), {
    recursive: true,
  });

  writeFileSync(
    path.join(TEMP_DIR, "src", "routes", "__root.tsx"),
    `export const Route = createRootRoute({});`,
  );
  writeFileSync(
    path.join(TEMP_DIR, "src", "routes", "index.tsx"),
    `export const Route = createFileRoute("/")({});`,
  );
  writeFileSync(
    path.join(TEMP_DIR, "src", "routes", "about.tsx"),
    `export const Route = createFileRoute("/about")({});`,
  );
  writeFileSync(
    path.join(TEMP_DIR, "src", "routes", "$listId.tsx"),
    `export const Route = createFileRoute("/$listId")({});`,
  );
  writeFileSync(
    path.join(TEMP_DIR, "src", "routes", "$.tsx"),
    `export const Route = createFileRoute("/$")({});`,
  );
  writeFileSync(
    path.join(TEMP_DIR, "src", "routes", "api", "search.ts"),
    `export const Route = createFileRoute("/api/search")({});`,
  );
  writeFileSync(
    path.join(TEMP_DIR, "content", "docs", "keweke", "index.mdx"),
    "# Keweke",
  );
  writeFileSync(
    path.join(
      TEMP_DIR,
      "content",
      "docs",
      "keweke",
      "lists",
      "create-a-list.mdx",
    ),
    "# Create a list",
  );
});

afterAll(() => {
  rmSync(TEMP_DIR, { recursive: true, force: true });
});

describe("toMountPath", () => {
  test("normalizes vite base into a mount path with leading and trailing slashes", () => {
    expect(toMountPath("/keweke")).toBe("/keweke/");
    expect(toMountPath("keweke/")).toBe("/keweke/");
    expect(toMountPath("/")).toBe("/");
  });
});

describe("collectRoutePaths", () => {
  test("finds static routes and skips dynamic, splat, and API routes", () => {
    expect(collectRoutePaths(path.join(TEMP_DIR, "src", "routes"))).toEqual([
      "/",
      "/about",
    ]);
  });
});

describe("collectContentPaths", () => {
  test("maps MDX files to index-aware URL paths", () => {
    expect(collectContentPaths(path.join(TEMP_DIR, "content", "docs"))).toEqual(
      ["/keweke", "/keweke/lists/create-a-list"],
    );
  });
});

describe("buildUrlset", () => {
  test("builds absolute URLs from the origin and mount path", () => {
    const xml = buildUrlset("https://jfa.dev", "/keweke/", ["/", "/about"]);
    expect(xml).toContain("<loc>https://jfa.dev/keweke</loc>");
    expect(xml).toContain("<loc>https://jfa.dev/keweke/about</loc>");
    expect(xml).toContain(
      'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
    );
  });

  test("maps the root mount to the origin root", () => {
    const xml = buildUrlset("https://jfa.dev", "/", ["/", "/about"]);
    expect(xml).toContain("<loc>https://jfa.dev/</loc>");
    expect(xml).toContain("<loc>https://jfa.dev/about</loc>");
  });

  test("escapes XML special characters", () => {
    const xml = buildUrlset("https://jfa.dev", "/a&b/", ["/"]);
    expect(xml).toContain("<loc>https://jfa.dev/a&amp;b</loc>");
  });
});

describe("buildMountedPaths", () => {
  test("combines routes from every mounted worker", () => {
    const paths = buildMountedPaths([
      { mountPath: "/", routesDir: path.join(TEMP_DIR, "src", "routes") },
      {
        mountPath: "/docs",
        routesDir: path.join(TEMP_DIR, "src", "routes"),
        contentDir: path.join(TEMP_DIR, "content", "docs"),
        exclude: ["/about"],
      },
    ]);
    expect(paths).toEqual([
      "/",
      "/about",
      "/docs",
      "/docs/keweke",
      "/docs/keweke/lists/create-a-list",
    ]);
  });
});

describe("buildRobotsTxt", () => {
  test("allows all agents and points at the canonical sitemap", () => {
    const txt = buildRobotsTxt("https://jfa.dev");
    expect(txt).toContain("User-agent: *");
    expect(txt).toContain("Disallow:");
    expect(txt).toContain("Sitemap: https://jfa.dev/sitemap.xml");
  });

  test("emits one Disallow line per disallowed path", () => {
    const txt = buildRobotsTxt("https://jfa.dev", {
      disallow: ["/user", "/admin"],
    });
    expect(txt).toContain("Disallow: /user");
    expect(txt).toContain("Disallow: /admin");
  });
});
