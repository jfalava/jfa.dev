/// <reference types="bun" />

import { describe, expect, test } from "bun:test";

import {
  applyListMutation,
  createStarterListSnapshot,
  parseListSnapshot,
} from "./lists";

const LIST_ID = "019c5f7e-7b7b-7000-8000-000000000001";
const NOW = "2026-08-14T10:00:00.000Z";

describe("list contract", () => {
  test("creates a portable starter snapshot", () => {
    const snapshot = createStarterListSnapshot(LIST_ID, { now: NOW });

    expect(snapshot.id).toBe(LIST_ID);
    expect(snapshot.schemaVersion).toBe(1);
    expect(snapshot.revision).toBe(0);
    expect(snapshot.items).toHaveLength(3);
    expect(snapshot.items[2]?.checked).toBe(true);
    expect(parseListSnapshot(snapshot)).toEqual(snapshot);
  });

  test("applies a mutation and rejects stale revisions", () => {
    const snapshot = createStarterListSnapshot(LIST_ID, { now: NOW });
    const mutation = {
      id: "019c5f7e-7b7b-7000-8000-000000000002",
      baseRevision: 0,
      command: {
        type: "add-item" as const,
        item: {
          id: "milk",
          name: "Milk",
          quantity: 2,
          unit: "EA",
          category: "DAIRY",
        },
      },
    };

    const nextSnapshot = applyListMutation(snapshot, mutation, NOW);
    expect(nextSnapshot?.revision).toBe(1);
    expect(nextSnapshot?.items[nextSnapshot.items.length - 1]?.name).toBe(
      "Milk",
    );
    expect(
      applyListMutation(snapshot, { ...mutation, baseRevision: 1 }, NOW),
    ).toBeNull();
  });

  test("keeps positions contiguous when removing an item", () => {
    const snapshot = createStarterListSnapshot(LIST_ID, { now: NOW });
    const nextSnapshot = applyListMutation(
      snapshot,
      {
        id: "019c5f7e-7b7b-7000-8000-000000000003",
        baseRevision: 0,
        command: { type: "remove-item", itemId: "starter-tomatoes" },
      },
      NOW,
    );

    expect(nextSnapshot?.items.map((item) => item.position)).toEqual([0, 1]);
    expect(nextSnapshot?.items.map((item) => item.name)).toEqual([
      "Bread",
      "Coffee",
    ]);
  });
});
