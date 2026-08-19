import { describe, expect, test } from "bun:test";

import { createStarterListSnapshot } from "@jfa.dev/common/lists";

import { listShareDescription, listShareMetaFromSnapshot } from "./share-meta";

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

  test("describes an empty list", () => {
    expect(listShareDescription({ title: "Groceries", itemCount: 0, completedCount: 0 })).toBe(
      "No items yet — add your first item to this shared shopping list.",
    );
  });

  test("describes items and progress", () => {
    expect(listShareDescription({ title: "Groceries", itemCount: 3, completedCount: 1 })).toBe(
      "3 items · 1 done",
    );
  });

  test("uses singular wording for a single item", () => {
    expect(listShareDescription({ title: "Groceries", itemCount: 1, completedCount: 0 })).toBe(
      "1 item · 0 done",
    );
  });
});
