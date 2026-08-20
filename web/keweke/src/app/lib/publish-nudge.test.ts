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

  test("requires every onboarding condition", () => {
    const base = {
      backend: "local" as const,
      isFirstList: true,
      itemCount: 1,
      title: "Weekend groceries",
    };

    expect(shouldShowPublishNudge({ ...base, backend: "remote" })).toBe(false);
    expect(shouldShowPublishNudge({ ...base, isFirstList: false })).toBe(false);
    expect(shouldShowPublishNudge({ ...base, itemCount: 0 })).toBe(false);
    expect(shouldShowPublishNudge({ ...base, itemCount: 2 })).toBe(false);
    expect(shouldShowPublishNudge({ ...base, title: "New list" })).toBe(false);
  });
});
