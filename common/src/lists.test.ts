/// <reference types="bun" />

import { describe, expect, test } from "bun:test";

import { applyListMutation, createStarterListSnapshot, parseListSnapshot } from "./lists";

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
    expect(nextSnapshot?.items.map((item) => item.name)).toEqual(["Bread", "Coffee"]);
    expect(nextSnapshot?.deletedItems[0]?.name).toBe("Tomatoes");
    expect(nextSnapshot?.deletedItems[0]?.archiveId).toBe("starter-tomatoes:1");
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
