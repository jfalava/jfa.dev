import { describe, expect, it } from "bun:test";

import {
  buildHistoryTableRows,
  describeHistoryEvent,
  formatRelativeTime,
} from "@/features/lists/lib/item-history";

describe("describeHistoryEvent", () => {
  it("describes every item command type", () => {
    expect(
      describeHistoryEvent({
        type: "add-item",
        item: { id: "1", name: "Milk", quantity: 1, unit: "EA", amount: "", category: "DAIRY" },
      }),
    ).toBe("added this item");
    expect(
      describeHistoryEvent({ type: "update-item", itemId: "1", changes: { quantity: 2 } }),
    ).toBe("edited qty → 2");
    expect(
      describeHistoryEvent({
        type: "update-item",
        itemId: "1",
        changes: { name: "Oat milk", amount: "" },
      }),
    ).toBe("edited name → Oat milk, each → —");
    expect(describeHistoryEvent({ type: "update-item", itemId: "1", changes: {} })).toBe(
      "edited this item",
    );
    expect(describeHistoryEvent({ type: "set-item-checked", itemId: "1", checked: true })).toBe(
      "checked this off",
    );
    expect(describeHistoryEvent({ type: "set-item-checked", itemId: "1", checked: false })).toBe(
      "unchecked this",
    );
    expect(describeHistoryEvent({ type: "remove-item", itemId: "1" })).toBe("removed this item");
    expect(describeHistoryEvent({ type: "restore-item", archiveId: "1:2" })).toBe(
      "restored this item",
    );
    expect(describeHistoryEvent({ type: "purge-deleted-item", archiveId: "1:2" })).toBe(
      "deleted this forever",
    );
    expect(describeHistoryEvent({ type: "rename-list", title: "Next" })).toBe("renamed the list");
  });
});

describe("formatRelativeTime", () => {
  const NOW = Date.parse("2026-08-17T12:00:00.000Z");

  it("formats recent times relative to now", () => {
    expect(formatRelativeTime("2026-08-17T11:59:50.000Z", NOW)).toBe("just now");
    expect(formatRelativeTime("2026-08-17T11:30:00.000Z", NOW)).toBe("30 minutes ago");
    expect(formatRelativeTime("2026-08-17T07:00:00.000Z", NOW)).toBe("5 hours ago");
    expect(formatRelativeTime("2026-08-15T12:00:00.000Z", NOW)).toBe("2 days ago");
  });

  it("falls back to the date beyond two weeks and for invalid input", () => {
    expect(formatRelativeTime("2026-07-01T12:00:00.000Z", NOW)).toBe("2026-07-01");
    expect(formatRelativeTime("not-a-date", NOW)).toBe("not-a-date");
  });
});

describe("buildHistoryTableRows", () => {
  it("reconstructs before and after values in newest-first order", () => {
    const rows = buildHistoryTableRows([
      {
        id: "event-2",
        mutationId: "mutation-2",
        itemId: "1",
        revision: 2,
        actor: { id: "user-1", username: "Jorge" },
        command: { type: "update-item", itemId: "1", changes: { quantity: 2, name: "Oat milk" } },
        appliedAt: "2026-08-17T12:01:00.000Z",
      },
      {
        id: "event-1",
        mutationId: "mutation-1",
        itemId: "1",
        revision: 1,
        actor: { id: "user-1", username: "Jorge" },
        command: {
          type: "add-item",
          item: { id: "1", name: "Milk", quantity: 1, unit: "EA", amount: "", category: "DAIRY" },
        },
        appliedAt: "2026-08-17T12:00:00.000Z",
      },
    ]);

    expect(
      rows.map(({ field, before, after, revision }) => ({ field, before, after, revision })),
    ).toEqual([
      { field: "name", before: "Milk", after: "Oat milk", revision: 2 },
      { field: "qty", before: "1", after: "2", revision: 2 },
      { field: "item", before: "—", after: "Milk", revision: 1 },
    ]);
  });

  it("represents item lifecycle changes as status rows", () => {
    const rows = buildHistoryTableRows([
      {
        id: "event-4",
        mutationId: "mutation-4",
        itemId: "1",
        revision: 5,
        actor: null,
        command: { type: "set-item-checked", itemId: "1", checked: false },
        appliedAt: "2026-08-17T12:03:00.000Z",
      },
      {
        id: "event-3",
        mutationId: "mutation-3",
        itemId: "1",
        revision: 4,
        actor: null,
        command: { type: "restore-item", archiveId: "1:2" },
        appliedAt: "2026-08-17T12:02:00.000Z",
      },
      {
        id: "event-2",
        mutationId: "mutation-2",
        itemId: "1",
        revision: 3,
        actor: null,
        command: { type: "remove-item", itemId: "1" },
        appliedAt: "2026-08-17T12:01:00.000Z",
      },
      {
        id: "event-1",
        mutationId: "mutation-1",
        itemId: "1",
        revision: 2,
        actor: null,
        command: { type: "set-item-checked", itemId: "1", checked: true },
        appliedAt: "2026-08-17T12:00:00.000Z",
      },
      {
        id: "event-0",
        mutationId: "mutation-0",
        itemId: "1",
        revision: 1,
        actor: null,
        command: {
          type: "add-item",
          item: { id: "1", name: "Milk", quantity: 1, unit: "EA", amount: "", category: "DAIRY" },
        },
        appliedAt: "2026-08-17T11:59:00.000Z",
      },
    ]);

    expect(rows.map(({ field, before, after }) => ({ field, before, after }))).toEqual([
      { field: "status", before: "done", after: "open" },
      { field: "status", before: "removed", after: "active" },
      { field: "status", before: "active", after: "removed" },
      { field: "status", before: "open", after: "done" },
      { field: "item", before: "—", after: "Milk" },
    ]);
  });
});
