import { describe, expect, test } from "bun:test";

import { opengraphDocs, opengraphDocsPath } from "./docs-paths";

describe("opengraphDocsPath", () => {
  test("returns the docs root without a trailing slash", () => {
    expect(opengraphDocsPath()).toBe("/docs/opengraph");
    expect(opengraphDocsPath("/")).toBe("/docs/opengraph");
  });

  test("normalizes leading and trailing slashes on nested paths", () => {
    expect(opengraphDocsPath("canvas")).toBe("/docs/opengraph/canvas");
    expect(opengraphDocsPath("/projects/")).toBe("/docs/opengraph/projects");
    expect(opengraphDocsPath("shapes-images")).toBe("/docs/opengraph/shapes-images");
  });

  test("exposes the canonical paths used by the app UI", () => {
    expect(opengraphDocs.shortcuts).toBe("/docs/opengraph/shortcuts");
    expect(opengraphDocs.projects).toBe("/docs/opengraph/projects");
    expect(opengraphDocs.projectsArchive).toBe("/docs/opengraph/projects#ogproj-archives");
    expect(opengraphDocs.fonts).toBe("/docs/opengraph/fonts");
    expect(opengraphDocs.layers).toBe("/docs/opengraph/layers");
    expect(opengraphDocs.graphics).toBe("/docs/opengraph/shapes-images");
  });

  test("preserves hash anchors on nested paths", () => {
    expect(opengraphDocsPath("projects#ogproj-archives")).toBe(
      "/docs/opengraph/projects#ogproj-archives",
    );
    expect(opengraphDocsPath("/projects/#frag")).toBe("/docs/opengraph/projects#frag");
  });
});
