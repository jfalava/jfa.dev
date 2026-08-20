import { describe, expect, test } from "bun:test";

import { shouldShowPublishNudge } from "./publish-nudge";

describe("shouldShowPublishNudge", () => {
  test("shows after the first item is added to the renamed first local list", () => {
    expect(
      shouldShowPublishNudge({
        backend: "local",
        isFirstList: true,
        itemCount: 1,
        title: "Weekend groceries",
      }),
    ).toBe(true);
  });

  test("shows on first meaningful interaction with the first list", () => {
    // either a custom title (even with no items) or at least one item (even with default title)
    expect(
      shouldShowPublishNudge({
        backend: "local",
        isFirstList: true,
        itemCount: 0,
        title: "Weekend groceries",
      }),
    ).toBe(true);

    expect(
      shouldShowPublishNudge({
        backend: "local",
        isFirstList: true,
        itemCount: 1,
        title: "New list",
      }),
    ).toBe(true);

    expect(
      shouldShowPublishNudge({
        backend: "local",
        isFirstList: true,
        itemCount: 5,
        title: "New list",
      }),
    ).toBe(true);

    expect(
      shouldShowPublishNudge({
        backend: "local",
        isFirstList: true,
        itemCount: 0,
        title: undefined,
      }),
    ).toBe(false);
  });

  test("requires first-local-list context", () => {
    const base = {
      backend: "local" as const,
      isFirstList: true,
      itemCount: 1,
      title: "Weekend groceries",
    };

    expect(shouldShowPublishNudge({ ...base, backend: "remote" })).toBe(false);
    expect(shouldShowPublishNudge({ ...base, backend: undefined })).toBe(false);
    expect(shouldShowPublishNudge({ ...base, isFirstList: false })).toBe(false);
    expect(
      shouldShowPublishNudge({
        backend: "local",
        isFirstList: true,
        itemCount: 0,
        title: "New list",
      }),
    ).toBe(false);
  });
});
