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

    expect(assigned?.alias).toMatch(/^weekend-groceries-[a-z]{5}$/);
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
});
