import { describe, expect, test } from "bun:test";

import { kewekeDocs, kewekeDocsPath } from "./docs-paths";

describe("kewekeDocsPath", () => {
  test("returns the docs root without a trailing slash", () => {
    expect(kewekeDocsPath()).toBe("/docs/keweke");
    expect(kewekeDocsPath("/")).toBe("/docs/keweke");
  });

  test("normalizes leading and trailing slashes on nested paths", () => {
    expect(kewekeDocsPath("users")).toBe("/docs/keweke/users");
    expect(kewekeDocsPath("/users/")).toBe("/docs/keweke/users");
    expect(kewekeDocsPath("architecture/identity")).toBe("/docs/keweke/architecture/identity");
  });

  test("exposes the canonical paths used by the app UI", () => {
    expect(kewekeDocs.users).toBe("/docs/keweke/users");
    expect(kewekeDocs.identity).toBe("/docs/keweke/architecture/identity");
    expect(kewekeDocs.publishList).toBe("/docs/keweke/lists/publishing-a-list");
    expect(kewekeDocs.publishListDialog).toBe(
      "/docs/keweke/lists/publishing-a-list#the-dialog--what-you-are-making-public",
    );
    expect(kewekeDocs.workingWithListSpreadsheet).toBe(
      "/docs/keweke/lists/working-with-the-list#search-and-spreadsheet-mode",
    );
  });

  test("preserves hash anchors on nested paths", () => {
    expect(kewekeDocsPath("lists/publishing-a-list#the-dialog--what-you-are-making-public")).toBe(
      "/docs/keweke/lists/publishing-a-list#the-dialog--what-you-are-making-public",
    );
    expect(kewekeDocsPath("/lists/publishing-a-list/#frag")).toBe(
      "/docs/keweke/lists/publishing-a-list#frag",
    );
  });
});
