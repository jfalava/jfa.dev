/// <reference types="bun-types" />

// oxlint-disable-next-line import/no-unassigned-import
import "fake-indexeddb/auto";
import { afterEach, expect, test } from "bun:test";

import { createStarterListSnapshot, type ListSnapshot } from "@jfa.dev/common/lists";
import { uuidv7 } from "uuidv7";

import { ListCommandQueue } from "./list-command-queue";
import {
  applyLocalMutation,
  clearLocalListDatabase,
  getLocalListRecord,
  saveLocalList,
} from "./local-list-store";

const LIST_ID = "019c5f7e-7b7b-7000-8000-000000000010";

afterEach(async () => {
  await clearLocalListDatabase();
});

function setChecked(base: ListSnapshot, itemId: string, checked = true) {
  return applyLocalMutation(base.id, {
    id: uuidv7(),
    baseRevision: base.revision,
    command: { type: "set-item-checked", itemId, checked },
  });
}

test("rapid purchases made from the same view both persist without a revision conflict", async () => {
  const snapshot = createStarterListSnapshot(LIST_ID);
  await saveLocalList(snapshot);
  const queue = new ListCommandQueue();
  const gate = Promise.withResolvers<void>();
  const first = queue.commit(snapshot, async (base) => {
    await gate.promise;
    return setChecked(base, "starter-bread");
  });
  const second = queue.commit(snapshot, (base) => setChecked(base, "starter-tomatoes"));
  gate.resolve();

  const results = await Promise.all([first, second]);
  expect(results.map((result) => result.status)).toEqual(["ok", "ok"]);
  const saved = await getLocalListRecord(LIST_ID);
  expect(saved?.snapshot.revision).toBe(2);
  expect(saved?.snapshot.items.map((item) => [item.id, item.checked])).toEqual([
    ["starter-bread", true],
    ["starter-tomatoes", true],
    ["starter-coffee", true],
  ]);
});

test("a rejected request does not block the next purchase or retry the failed one", async () => {
  const snapshot = createStarterListSnapshot(LIST_ID);
  await saveLocalList(snapshot);
  const queue = new ListCommandQueue();
  const failed = queue.commit(snapshot, async () => {
    throw new Error("Connection lost");
  });
  const next = queue.commit(snapshot, (base) => setChecked(base, "starter-tomatoes"));

  const [failure, success] = await Promise.allSettled([failed, next]);
  expect(failure).toEqual({ status: "rejected", reason: new Error("Connection lost") });
  expect(success).toMatchObject({ status: "fulfilled", value: { status: "ok" } });
  const saved = await getLocalListRecord(LIST_ID);
  expect(saved?.snapshot.revision).toBe(1);
  expect(saved?.snapshot.items.slice(0, 2).map((item) => item.checked)).toEqual([false, true]);
});

test("a real external conflict stays failed but later purchases use the refreshed revision", async () => {
  const snapshot = createStarterListSnapshot(LIST_ID);
  await saveLocalList(snapshot);
  await setChecked(snapshot, "starter-coffee", false);
  const queue = new ListCommandQueue();
  const conflicted = queue.commit(snapshot, (base) => setChecked(base, "starter-bread"));
  const next = queue.commit(snapshot, (base) => setChecked(base, "starter-tomatoes"));

  expect((await conflicted).status).toBe("conflict");
  expect((await next).status).toBe("ok");
  const saved = await getLocalListRecord(LIST_ID);
  expect(saved?.snapshot.revision).toBe(2);
  expect(saved?.snapshot.items.map((item) => item.checked)).toEqual([false, true, false]);
});
