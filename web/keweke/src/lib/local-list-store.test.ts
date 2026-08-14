/// <reference types="bun" />

// oxlint-disable-next-line import/no-unassigned-import
import "fake-indexeddb/auto";
import { afterEach, describe, expect, test } from "bun:test";

import { createStarterListSnapshot } from "@jfa.dev/common/lists";

import {
  applyLocalMutation,
  assignLocalListAlias,
  clearLocalListDatabase,
  createLocalList,
  deleteLocalList,
  getLocalListByAlias,
  getLocalListRecord,
  listLocalLists,
  markListRemote,
  saveLocalList,
} from "./local-list-store";

const LIST_ID = "019c5f7e-7b7b-7000-8000-000000000010";
const NOW = "2026-08-14T10:00:00.000Z";

afterEach(async () => {
  await clearLocalListDatabase();
});

describe("local list store", () => {
  test("keeps an unlimited catalog of local snapshots", async () => {
    const first = await createLocalList();
    const second = await createLocalList();

    const summaries = await listLocalLists();

    expect(summaries).toHaveLength(2);
    expect(summaries.map((summary) => summary.id)).toContain(first.id);
    expect(summaries.map((summary) => summary.id)).toContain(second.id);
    expect(summaries.every((summary) => summary.backend === "local")).toBe(true);
  });

  test("deletes a local list from the catalog", async () => {
    const snapshot = await createLocalList();

    await deleteLocalList(snapshot.id);

    expect(await getLocalListRecord(snapshot.id)).toBeUndefined();
    expect(await listLocalLists()).toEqual([]);
  });

  test("applies commands against the stored revision", async () => {
    await saveLocalList(createStarterListSnapshot(LIST_ID, { now: NOW }));
    const record = await getLocalListRecord(LIST_ID);

    const result = await applyLocalMutation(LIST_ID, {
      id: "019c5f7e-7b7b-7000-8000-000000000011",
      baseRevision: record?.snapshot.revision ?? -1,
      command: {
        type: "set-item-checked",
        itemId: "starter-bread",
        checked: true,
      },
    });

    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.snapshot.revision).toBe(1);
      expect(result.snapshot.items[0]?.checked).toBe(true);
    }
  });

  test("keeps remote-backed snapshots in the same local cache", async () => {
    const snapshot = createStarterListSnapshot(LIST_ID, { now: NOW });
    await markListRemote(snapshot);

    expect((await getLocalListRecord(LIST_ID))?.backend).toBe("remote");
    await deleteLocalList(LIST_ID);
    expect(await getLocalListRecord(LIST_ID)).toBeUndefined();
  });

  test("assigns and resolves a readable alias for a local list", async () => {
    const snapshot = await createLocalList();
    const assigned = await assignLocalListAlias(snapshot.id, "Weekend groceries");
    const reassigned = await assignLocalListAlias(snapshot.id, "Different label");

    expect(assigned?.alias).toMatch(/^weekend-groceries-[a-z]{5}$/);
    expect(reassigned?.alias).toBe(assigned?.alias);
    const resolved = await getLocalListByAlias(assigned?.alias ?? "");
    expect(resolved?.snapshot.id).toBe(snapshot.id);
  });

  test("serializes concurrent mutations for one local list", async () => {
    await saveLocalList(createStarterListSnapshot(LIST_ID, { now: NOW }));

    const [first, second] = await Promise.all([
      applyLocalMutation(LIST_ID, {
        id: "019c5f7e-7b7b-7000-8000-000000000012",
        baseRevision: 0,
        command: {
          type: "set-item-checked",
          itemId: "starter-bread",
          checked: true,
        },
      }),
      applyLocalMutation(LIST_ID, {
        id: "019c5f7e-7b7b-7000-8000-000000000013",
        baseRevision: 0,
        command: {
          type: "set-item-checked",
          itemId: "starter-tomatoes",
          checked: true,
        },
      }),
    ]);
    const finalRecord = await getLocalListRecord(LIST_ID);

    expect(first.status).not.toBe(second.status);
    expect([first.status, second.status].includes("ok")).toBe(true);
    expect([first.status, second.status].includes("conflict")).toBe(true);
    expect(finalRecord?.snapshot.revision).toBe(1);
  });

  test("keeps deleted items recoverable until they are purged", async () => {
    await saveLocalList(createStarterListSnapshot(LIST_ID, { now: NOW }));

    const removed = await applyLocalMutation(LIST_ID, {
      id: "local-remove-001",
      baseRevision: 0,
      command: { type: "remove-item", itemId: "starter-bread" },
    });
    expect(removed.status).toBe("ok");
    if (removed.status !== "ok") {
      return;
    }

    expect(removed.snapshot.deletedItems[0]?.name).toBe("Bread");
    const archiveId = removed.snapshot.deletedItems[0]?.archiveId ?? "";

    const restored = await applyLocalMutation(LIST_ID, {
      id: "local-restore-001",
      baseRevision: 1,
      command: { type: "restore-item", archiveId },
    });
    expect(restored.status).toBe("ok");
    if (restored.status !== "ok") {
      return;
    }

    const purged = await applyLocalMutation(LIST_ID, {
      id: "local-remove-002",
      baseRevision: 2,
      command: { type: "remove-item", itemId: "starter-bread" },
    });
    expect(purged.status).toBe("ok");
    if (purged.status !== "ok") {
      return;
    }

    const deletedAgain = purged.snapshot.deletedItems[0]?.archiveId ?? "";
    const forever = await applyLocalMutation(LIST_ID, {
      id: "local-purge-001",
      baseRevision: 3,
      command: { type: "purge-deleted-item", archiveId: deletedAgain },
    });
    expect(forever.status).toBe("ok");
    if (forever.status === "ok") {
      expect(forever.snapshot.deletedItems).toEqual([]);
    }
  });
});
