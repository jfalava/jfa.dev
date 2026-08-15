import { createStarterListSnapshot, type ListMutation } from "@jfa.dev/common/lists";
import { runInDurableObject } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

import { KewekeList } from "../src/server/keweke-list";

const LIST_ID = "019c5f7e-7b7b-7000-8000-000000000020";
const SECOND_LIST_ID = "019c5f7e-7b7b-7000-8000-000000000021";
const THIRD_LIST_ID = "019c5f7e-7b7b-7000-8000-000000000022";
const FOURTH_LIST_ID = "019c5f7e-7b7b-7000-8000-000000000023";
const NOW = "2026-08-14T10:00:00.000Z";

describe("KewekeList Durable Object", () => {
  it("imports, persists, and applies a portable list snapshot", async () => {
    const snapshot = createStarterListSnapshot(LIST_ID, { now: NOW });
    const stub = env.KEWEKE_LISTS.getByName(LIST_ID);

    const imported = await runInDurableObject(stub, (instance: KewekeList) =>
      instance.importSnapshot(LIST_ID, snapshot, "migration-001"),
    );
    expect(imported.status).toBe("imported");

    const aliased = await stub.setAlias(LIST_ID, "weekend-groceries-abcde");
    expect(aliased?.alias).toBe("weekend-groceries-abcde");
    expect((await stub.setAlias(LIST_ID, "renamed-list-klmno"))?.alias).toBe(aliased?.alias);

    const mutation: ListMutation = {
      id: "mutation-001",
      baseRevision: 0,
      actor: { id: "abcde", username: "Alex" },
      command: {
        type: "set-item-checked",
        itemId: "starter-bread",
        checked: true,
      },
    };
    const applied = await stub.applyMutation(LIST_ID, mutation);

    expect(applied.status).toBe("ok");
    if (applied.status === "ok") {
      expect(applied.snapshot.revision).toBe(1);
      expect(applied.snapshot.items[0]?.checked).toBe(true);
      expect(applied.snapshot.items[0]?.updatedBy).toEqual({ id: "abcde", username: "Alex" });
    }

    const retry = await stub.applyMutation(LIST_ID, mutation);
    const stale = await stub.applyMutation(LIST_ID, {
      ...mutation,
      id: "mutation-002",
    });
    expect(retry.status).toBe("ok");
    expect(stale.status).toBe("conflict");
    if (stale.status === "conflict") {
      expect(stale.snapshot.revision).toBe(1);
    }
  });

  it("makes migration retries idempotent and rejects a second list", async () => {
    const snapshot = createStarterListSnapshot(SECOND_LIST_ID, { now: NOW });
    const stub = env.KEWEKE_LISTS.getByName(SECOND_LIST_ID);

    await stub.importSnapshot(SECOND_LIST_ID, snapshot, "migration-002");
    const retry = await stub.importSnapshot(SECOND_LIST_ID, snapshot, "migration-002");
    const conflictingImport = await stub.importSnapshot(
      SECOND_LIST_ID,
      { ...snapshot, title: "Another list" },
      "migration-003",
    );

    expect(retry.status).toBe("already-imported");
    expect(conflictingImport.status).toBe("conflict");
  });

  it("persists an anonymous signer id without a username", async () => {
    const snapshot = createStarterListSnapshot(FOURTH_LIST_ID, { now: NOW });
    const stub = env.KEWEKE_LISTS.getByName(FOURTH_LIST_ID);
    await stub.importSnapshot(FOURTH_LIST_ID, snapshot, "migration-004");

    const applied = await stub.applyMutation(FOURTH_LIST_ID, {
      id: "mutation-anonymous-004",
      baseRevision: 0,
      actor: { id: "abcde", username: null },
      command: {
        type: "set-item-checked",
        itemId: "starter-bread",
        checked: true,
      },
    });

    expect(applied.status).toBe("ok");
    if (applied.status === "ok") {
      expect(applied.snapshot.items[0]?.updatedBy).toEqual({
        id: "abcde",
        username: null,
      });
    }

    expect((await stub.getSnapshot(FOURTH_LIST_ID))?.items[0]?.updatedBy).toEqual({
      id: "abcde",
      username: null,
    });
  });

  it("persists deleted history and supports recovery and permanent deletion", async () => {
    const snapshot = createStarterListSnapshot(THIRD_LIST_ID, { now: NOW });
    const stub = env.KEWEKE_LISTS.getByName(THIRD_LIST_ID);
    await stub.importSnapshot(THIRD_LIST_ID, snapshot, "migration-003");

    const removed = await stub.applyMutation(THIRD_LIST_ID, {
      id: "mutation-delete-003",
      baseRevision: 0,
      command: { type: "remove-item", itemId: "starter-bread" },
    });
    expect(removed.status).toBe("ok");
    if (removed.status !== "ok") {
      return;
    }

    expect((await stub.getSnapshot(THIRD_LIST_ID))?.deletedItems[0]?.name).toBe("Bread");
    const archiveId = removed.snapshot.deletedItems[0]?.archiveId ?? "";
    const restored = await stub.applyMutation(THIRD_LIST_ID, {
      id: "mutation-restore-003",
      baseRevision: 1,
      command: { type: "restore-item", archiveId },
    });
    expect(restored.status).toBe("ok");
    expect((await stub.getSnapshot(THIRD_LIST_ID))?.deletedItems).toEqual([]);
  });
});
