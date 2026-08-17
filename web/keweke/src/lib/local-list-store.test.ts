/// <reference types="bun" />

// oxlint-disable-next-line import/no-unassigned-import
import "fake-indexeddb/auto";
import { afterEach, describe, expect, test } from "bun:test";

import { createStarterListSnapshot } from "@jfa.dev/common/lists";

import {
  applyLocalMutation,
  clearLocalListDatabase,
  clearRemoteListDatabase,
  createLocalList,
  deleteLocalList,
  ensureLocalListAlias,
  getLocalListByAlias,
  getLocalListRecord,
  listLocalLists,
  markListRemote,
  saveLocalList,
  saveRemoteLists,
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

    expect(first.title).toBe("New list");
    expect(first.items).toEqual([]);
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

  test("leaves the stored snapshot untouched for a duplicate check", async () => {
    await saveLocalList(createStarterListSnapshot(LIST_ID, { now: NOW }));

    const result = await applyLocalMutation(LIST_ID, {
      id: "019c5f7e-7b7b-7000-8000-000000000014",
      baseRevision: 0,
      command: {
        type: "set-item-checked",
        itemId: "starter-coffee",
        checked: true,
      },
    });

    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.snapshot.revision).toBe(0);
      expect(result.snapshot.updatedAt).toBe(NOW);
      expect(result.snapshot.items.find((item) => item.id === "starter-coffee")?.checked).toBe(
        true,
      );
      expect((await getLocalListRecord(LIST_ID))?.snapshot.updatedAt).toBe(NOW);
    }
  });

  test("keeps remote-backed snapshots in the same local cache", async () => {
    const snapshot = createStarterListSnapshot(LIST_ID, { now: NOW });
    await markListRemote(snapshot);

    expect((await getLocalListRecord(LIST_ID))?.backend).toBe("remote");
    await deleteLocalList(LIST_ID);
    expect(await getLocalListRecord(LIST_ID)).toBeUndefined();
  });

  test("merges fetched remote snapshots without replacing local lists", async () => {
    const local = await createLocalList();
    const remote = createStarterListSnapshot(LIST_ID, { now: NOW });

    await saveRemoteLists([remote]);

    const summaries = await listLocalLists();
    expect(summaries.map((summary) => summary.id)).toEqual(
      expect.arrayContaining([local.id, remote.id]),
    );
    expect(summaries.find((summary) => summary.id === remote.id)?.backend).toBe("remote");

    await saveRemoteLists([{ ...local, title: "Remote collision" }]);
    expect((await getLocalListRecord(local.id))?.backend).toBe("local");
    expect((await getLocalListRecord(local.id))?.snapshot.title).toBe("New list");
  });

  test("keeps remote ownership in the local catalog", async () => {
    const snapshot = createStarterListSnapshot(LIST_ID, { now: NOW });

    await saveRemoteLists([snapshot], [], [LIST_ID]);

    expect((await getLocalListRecord(LIST_ID))?.remoteRole).toBe("owner");
    expect((await listLocalLists())[0]?.remoteRole).toBe("owner");
  });

  test("removes missing remote snapshots without touching local lists", async () => {
    const local = await createLocalList();
    const remote = createStarterListSnapshot(LIST_ID, { now: NOW });
    await saveRemoteLists([remote]);

    await saveRemoteLists([], [remote.id]);

    expect(await getLocalListRecord(remote.id)).toBeUndefined();
    expect((await getLocalListRecord(local.id))?.backend).toBe("local");
  });

  test("clears remote-backed lists while preserving local lists", async () => {
    const local = await createLocalList();
    const remote = createStarterListSnapshot(LIST_ID, { now: NOW });
    await markListRemote(remote);

    await clearRemoteListDatabase();

    expect((await getLocalListRecord(local.id))?.backend).toBe("local");
    expect(await getLocalListRecord(remote.id)).toBeUndefined();
  });

  test("derives an alias from the first saved title and keeps it after renames", async () => {
    const snapshot = await createLocalList();
    const renamed = await applyLocalMutation(snapshot.id, {
      id: "local-rename-001",
      baseRevision: 0,
      command: { type: "rename-list", title: "Weekend groceries" },
    });
    expect(renamed.status).toBe("ok");

    const assigned = await ensureLocalListAlias(snapshot.id);
    const renamedAgain = await applyLocalMutation(snapshot.id, {
      id: "local-rename-002",
      baseRevision: 1,
      command: { type: "rename-list", title: "Different label" },
    });
    expect(renamedAgain.status).toBe("ok");
    const reassigned = await ensureLocalListAlias(snapshot.id);

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
