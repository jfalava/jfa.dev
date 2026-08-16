/// <reference types="bun" />

import { describe, expect, test } from "bun:test";

import {
  MAX_DELETED_ITEMS,
  applyListMutation,
  applyListMutationWithDiff,
  createStarterListSnapshot,
  parseListSnapshot,
  type AppliedListMutation,
  type ListMutation,
  type ListSnapshot,
} from "./lists";

const LIST_ID = "019c5f7e-7b7b-7000-8000-000000000001";
const NOW = "2026-08-14T10:00:00.000Z";

describe("list contract", () => {
  test("creates a portable starter snapshot", () => {
    const snapshot = createStarterListSnapshot(LIST_ID, { now: NOW });

    expect(snapshot.id).toBe(LIST_ID);
    expect(snapshot.schemaVersion).toBe(3);
    expect(snapshot.revision).toBe(0);
    expect(snapshot.alias).toBeNull();
    expect(snapshot.title).toBe("New list");
    expect(snapshot.deletedItems).toEqual([]);
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
          amount: "",
          category: "DAIRY",
        },
      },
    };

    const nextSnapshot = applyListMutation(snapshot, mutation, NOW);
    expect(nextSnapshot?.revision).toBe(1);
    expect(nextSnapshot?.items[nextSnapshot.items.length - 1]?.name).toBe("Milk");
    expect(applyListMutation(snapshot, { ...mutation, baseRevision: 1 }, NOW)).toBeNull();
  });

  test("keeps the local signer on created, edited, and deleted items", () => {
    const snapshot = createStarterListSnapshot(LIST_ID, { now: NOW });
    const creator = {
      id: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
      username: "Alex",
    };
    const editor = {
      id: "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
      username: "Sam",
    };
    const added = applyListMutation(
      snapshot,
      {
        id: "add-signed-item",
        baseRevision: 0,
        actor: creator,
        command: {
          type: "add-item",
          item: {
            id: "signed-milk",
            name: "Milk",
            quantity: 1,
            unit: "EA",
            amount: "",
            category: "DAIRY",
          },
        },
      },
      NOW,
    );

    expect(added?.items[added.items.length - 1]).toMatchObject({
      createdBy: creator,
      updatedBy: creator,
    });

    const edited = applyListMutation(
      added!,
      {
        id: "edit-signed-item",
        baseRevision: 1,
        actor: editor,
        command: {
          type: "update-item",
          itemId: "signed-milk",
          changes: { quantity: 2 },
        },
      },
      "2026-08-14T10:05:00.000Z",
    );
    expect(edited?.items[edited.items.length - 1]).toMatchObject({
      createdBy: creator,
      updatedBy: editor,
      quantity: 2,
    });

    const removed = applyListMutation(
      edited!,
      {
        id: "delete-signed-item",
        baseRevision: 2,
        actor: editor,
        command: { type: "remove-item", itemId: "signed-milk" },
      },
      "2026-08-14T10:10:00.000Z",
    );
    expect(removed?.deletedItems[0]).toMatchObject({
      createdBy: creator,
      updatedBy: editor,
      deletedBy: editor,
    });
  });

  test("normalizes snapshots from before local attribution existed", () => {
    const snapshot = createStarterListSnapshot(LIST_ID, { now: NOW });
    const legacy = {
      ...snapshot,
      items: snapshot.items.map(
        ({ createdBy: _createdBy, updatedBy: _updatedBy, ...item }) => item,
      ),
      deletedItems: [],
    };

    const parsed = parseListSnapshot(legacy);
    expect(parsed.items[0]?.createdBy).toBeNull();
    expect(parsed.items[0]?.updatedBy).toBeNull();
  });

  test("keeps an anonymous signer id on created items", () => {
    const snapshot = createStarterListSnapshot(LIST_ID, { now: NOW });
    const anonymous = {
      id: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
      username: null,
    };
    const nextSnapshot = applyListMutation(
      snapshot,
      {
        id: "add-anonymous-item",
        baseRevision: 0,
        actor: anonymous,
        command: {
          type: "add-item",
          item: {
            id: "anonymous-milk",
            name: "Milk",
            quantity: 1,
            unit: "EA",
            amount: "",
            category: "DAIRY",
          },
        },
      },
      NOW,
    );

    expect(nextSnapshot?.items[nextSnapshot.items.length - 1]).toMatchObject({
      createdBy: anonymous,
      updatedBy: anonymous,
    });
  });

  test("updates editable item fields", () => {
    const snapshot = createStarterListSnapshot(LIST_ID, { now: NOW });
    const nextSnapshot = applyListMutation(
      snapshot,
      {
        id: "019c5f7e-7b7b-7000-0000-000000000009",
        baseRevision: 0,
        command: {
          type: "update-item",
          itemId: "starter-bread",
          changes: {
            name: "Sourdough",
            quantity: 2,
            unit: "LOAF",
            amount: "500g",
            category: "BAKERY",
          },
        },
      },
      NOW,
    );

    expect(nextSnapshot?.items[0]).toMatchObject({
      id: "starter-bread",
      name: "Sourdough",
      quantity: 2,
      unit: "LOAF",
      amount: "500g",
      category: "BAKERY",
      updatedAt: NOW,
    });
    expect(nextSnapshot?.revision).toBe(1);
  });

  test("keeps sparse positions when removing an item", () => {
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

    expect(nextSnapshot?.items.map((item) => item.position)).toEqual([0, 2]);
    expect(nextSnapshot?.items.map((item) => item.name)).toEqual(["Bread", "Coffee"]);
    expect(nextSnapshot?.deletedItems[0]?.name).toBe("Tomatoes");
    expect(nextSnapshot?.deletedItems[0]?.position).toBe(1);
    expect(nextSnapshot?.deletedItems[0]?.archiveId).toBe("starter-tomatoes:1");
  });

  test("appends after a sparse remove using max position + 1", () => {
    const snapshot = createStarterListSnapshot(LIST_ID, { now: NOW });
    const removed = applyListMutation(
      snapshot,
      {
        id: "019c5f7e-7b7b-7000-8000-000000000013",
        baseRevision: 0,
        command: { type: "remove-item", itemId: "starter-tomatoes" },
      },
      NOW,
    )!;
    const nextSnapshot = applyListMutation(
      removed,
      {
        id: "019c5f7e-7b7b-7000-8000-000000000014",
        baseRevision: 1,
        command: {
          type: "add-item",
          item: {
            id: "added-milk",
            name: "Milk",
            quantity: 1,
            unit: "EA",
            amount: "",
            category: "DAIRY",
          },
        },
      },
      NOW,
    );

    expect(nextSnapshot?.items.map((item) => item.position)).toEqual([0, 2, 3]);
    expect(nextSnapshot?.items.at(-1)?.name).toBe("Milk");
  });

  test("restores at max position + 1 without renumbering survivors", () => {
    const snapshot = createStarterListSnapshot(LIST_ID, { now: NOW });
    const removed = applyListMutation(
      snapshot,
      {
        id: "019c5f7e-7b7b-7000-8000-000000000015",
        baseRevision: 0,
        command: { type: "remove-item", itemId: "starter-bread" },
      },
      NOW,
    )!;
    const restored = applyListMutation(
      removed,
      {
        id: "019c5f7e-7b7b-7000-8000-000000000016",
        baseRevision: 1,
        command: { type: "restore-item", archiveId: removed.deletedItems[0]!.archiveId },
      },
      NOW,
    );

    expect(restored?.items.map((item) => ({ id: item.id, position: item.position }))).toEqual([
      { id: "starter-tomatoes", position: 1 },
      { id: "starter-coffee", position: 2 },
      { id: "starter-bread", position: 3 },
    ]);
  });

  test("renames lists, restores deleted items, and permanently purges history", () => {
    const snapshot = createStarterListSnapshot(LIST_ID, { now: NOW });
    const renamed = applyListMutation(
      snapshot,
      {
        id: "019c5f7e-7b7b-7000-8000-000000000004",
        baseRevision: 0,
        command: { type: "rename-list", title: "Saturday market" },
      },
      NOW,
    );
    const removed = applyListMutation(
      renamed!,
      {
        id: "019c5f7e-7b7b-7000-8000-000000000005",
        baseRevision: 1,
        command: { type: "remove-item", itemId: "starter-bread" },
      },
      NOW,
    );

    expect(removed?.title).toBe("Saturday market");
    expect(removed?.deletedItems).toHaveLength(1);

    const archiveId = removed?.deletedItems[0]?.archiveId ?? "";
    const restored = applyListMutation(
      removed!,
      {
        id: "019c5f7e-7b7b-7000-0000-000000000006",
        baseRevision: 2,
        command: { type: "restore-item", archiveId },
      },
      NOW,
    );
    expect(restored?.items.map((item) => item.name)).toEqual(["Tomatoes", "Coffee", "Bread"]);
    expect(restored?.deletedItems).toEqual([]);

    const removedAgain = applyListMutation(
      restored!,
      {
        id: "019c5f7e-7b7b-7000-0000-000000000007",
        baseRevision: 3,
        command: { type: "remove-item", itemId: "starter-bread" },
      },
      NOW,
    );
    const purged = applyListMutation(
      removedAgain!,
      {
        id: "019c5f7e-7b7b-7000-0000-000000000008",
        baseRevision: 4,
        command: {
          type: "purge-deleted-item",
          archiveId: removedAgain?.deletedItems[0]?.archiveId ?? "",
        },
      },
      NOW,
    );
    expect(purged?.deletedItems).toEqual([]);
  });

  test("preserves a generated alias when a list is renamed", () => {
    const snapshot = {
      ...createStarterListSnapshot(LIST_ID, { now: NOW }),
      alias: "weekend-groceries-abcde",
    };
    const renamed = applyListMutation(
      snapshot,
      {
        id: "019c5f7e-7b7b-7000-0000-000000000009",
        baseRevision: 0,
        command: { type: "rename-list", title: "Saturday market" },
      },
      NOW,
    );

    expect(renamed?.title).toBe("Saturday market");
    expect(renamed?.alias).toBe(snapshot.alias);
  });
});

function applyWithDiff(
  snapshot: ListSnapshot,
  command: ListMutation["command"],
  now = NOW,
): AppliedListMutation {
  const result = applyListMutationWithDiff(
    snapshot,
    { id: crypto.randomUUID(), baseRevision: snapshot.revision, command },
    now,
  );
  if (!result) {
    throw new Error("Mutation did not apply");
  }
  return result;
}

describe("list mutation diff", () => {
  test("touches one item row for a checked toggle", () => {
    const snapshot = createStarterListSnapshot(LIST_ID, { now: NOW });
    const applied = applyWithDiff(snapshot, {
      type: "set-item-checked",
      itemId: "starter-bread",
      checked: true,
    });

    expect(applied.diff).toEqual({
      upsertItems: [applied.snapshot.items[0]],
      deleteItemIds: [],
      upsertDeletedItems: [],
      deleteArchiveIds: [],
    });
  });

  test("inserts one item row for an added item", () => {
    const snapshot = createStarterListSnapshot(LIST_ID, { now: NOW });
    const applied = applyWithDiff(snapshot, {
      type: "add-item",
      item: {
        id: "added-milk",
        name: "Milk",
        quantity: 2,
        unit: "EA",
        amount: "",
        category: "DAIRY",
      },
    });

    expect(applied.diff).toEqual({
      upsertItems: [applied.snapshot.items[applied.snapshot.items.length - 1]],
      deleteItemIds: [],
      upsertDeletedItems: [],
      deleteArchiveIds: [],
    });
  });

  test("touches one item row for an edited item", () => {
    const snapshot = createStarterListSnapshot(LIST_ID, { now: NOW });
    const applied = applyWithDiff(snapshot, {
      type: "update-item",
      itemId: "starter-bread",
      changes: { name: "Sourdough", quantity: 2 },
    });

    expect(applied.diff).toEqual({
      upsertItems: [applied.snapshot.items[0]],
      deleteItemIds: [],
      upsertDeletedItems: [],
      deleteArchiveIds: [],
    });
  });

  test("deletes the removed row and archives it without touching survivor positions", () => {
    const snapshot = createStarterListSnapshot(LIST_ID, { now: NOW });
    const applied = applyWithDiff(snapshot, { type: "remove-item", itemId: "starter-tomatoes" });

    expect(applied.diff.deleteItemIds).toEqual(["starter-tomatoes"]);
    expect(applied.diff.upsertDeletedItems).toEqual(applied.snapshot.deletedItems);
    expect(applied.diff.deleteArchiveIds).toEqual([]);
    expect(applied.diff.upsertItems).toEqual([]);
    expect(applied.snapshot.items.map((item) => item.position)).toEqual([0, 2]);
  });

  test("remove first item still leaves survivor positions untouched in the diff", () => {
    const snapshot = createStarterListSnapshot(LIST_ID, { now: NOW });
    const applied = applyWithDiff(snapshot, { type: "remove-item", itemId: "starter-bread" });

    expect(applied.diff).toEqual({
      upsertItems: [],
      deleteItemIds: ["starter-bread"],
      upsertDeletedItems: applied.snapshot.deletedItems,
      deleteArchiveIds: [],
    });
    expect(applied.snapshot.items.map((item) => item.position)).toEqual([1, 2]);
  });

  test("restores a deleted item by upserting the row and dropping the archive", () => {
    const snapshot = createStarterListSnapshot(LIST_ID, { now: NOW });
    const removed = applyWithDiff(snapshot, { type: "remove-item", itemId: "starter-bread" });
    const applied = applyWithDiff(removed.snapshot, {
      type: "restore-item",
      archiveId: removed.snapshot.deletedItems[0]!.archiveId,
    });

    expect(applied.diff.upsertItems.map((item) => item.id)).toEqual(["starter-bread"]);
    expect(applied.diff.deleteArchiveIds).toEqual([removed.snapshot.deletedItems[0]!.archiveId]);
    expect(applied.diff.upsertDeletedItems).toEqual([]);
    expect(applied.diff.deleteItemIds).toEqual([]);
  });

  test("purges a deleted item by dropping only its archive row", () => {
    const snapshot = createStarterListSnapshot(LIST_ID, { now: NOW });
    const removed = applyWithDiff(snapshot, { type: "remove-item", itemId: "starter-bread" });
    const archiveId = removed.snapshot.deletedItems[0]!.archiveId;
    const applied = applyWithDiff(removed.snapshot, { type: "purge-deleted-item", archiveId });

    expect(applied.diff).toEqual({
      upsertItems: [],
      deleteItemIds: [],
      upsertDeletedItems: [],
      deleteArchiveIds: [archiveId],
    });
  });

  test("touches no item rows for a rename", () => {
    const snapshot = createStarterListSnapshot(LIST_ID, { now: NOW });
    const applied = applyWithDiff(snapshot, { type: "rename-list", title: "Saturday market" });

    expect(applied.diff).toEqual({
      upsertItems: [],
      deleteItemIds: [],
      upsertDeletedItems: [],
      deleteArchiveIds: [],
    });
  });

  test("caps deleted-item history at MAX_DELETED_ITEMS", () => {
    const snapshot = createStarterListSnapshot(LIST_ID, { now: NOW });
    let current = snapshot;

    for (let i = 0; i < MAX_DELETED_ITEMS + 5; i += 1) {
      const itemId = `bulk-${i}`;
      current = applyWithDiff(current, {
        type: "add-item",
        item: {
          id: itemId,
          name: `Item ${i}`,
          quantity: 1,
          unit: "EA",
          amount: "",
          category: "MISC",
        },
      }).snapshot;
      current = applyWithDiff(current, { type: "remove-item", itemId }).snapshot;
    }

    expect(current.deletedItems).toHaveLength(MAX_DELETED_ITEMS);
    expect(current.deletedItems[0]?.id).toBe("bulk-5");
    expect(current.deletedItems.at(-1)?.id).toBe(`bulk-${MAX_DELETED_ITEMS + 4}`);
  });
});
