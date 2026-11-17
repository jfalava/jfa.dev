import { describe, expect, test } from "bun:test";

import { createStarterListSnapshot } from "@jfa.dev/common/lists";

import { listShareMetaFromSnapshot } from "./share-meta";

describe("list share metadata", () => {
  test("counts items and completed items from a snapshot", () => {
    const snapshot = createStarterListSnapshot("01900000-0000-7000-8000-000000000001", {
      title: "Groceries",
      now: "2026-08-19T00:00:00.000Z",
    });

    expect(listShareMetaFromSnapshot(snapshot)).toEqual({
      title: "Groceries",
      itemCount: 3,
      completedCount: 1,
    });
  });
});
