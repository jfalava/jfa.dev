import type { ListCommand, ListItemHistoryEvent } from "@jfa.dev/common/lists";

const CHANGE_FIELD_LABELS = {
  amount: "each",
  category: "category",
  name: "name",
  quantity: "qty",
  unit: "unit",
} as const;

const HISTORY_EDITABLE_FIELDS = ["name", "quantity", "unit", "amount", "category"] as const;

type HistoryEditableField = (typeof HISTORY_EDITABLE_FIELDS)[number];
type HistoryValue = string | number | undefined;
type HistoryState = Partial<Record<HistoryEditableField | "checked", HistoryValue>>;

export type HistoryTableRow = {
  actorName: string;
  appliedAt: string;
  after: string;
  before: string;
  field: string;
  id: string;
  revision: number;
};

/** Human-readable description of what a mutation did to an item. */
export function describeHistoryEvent(command: ListCommand): string {
  switch (command.type) {
    case "add-item":
      return "added this item";
    case "update-item": {
      const parts = Object.entries(command.changes).map(([field, value]) => {
        // SAFETY: change keys come from the itemChangesSchema whose fields
        // map 1:1 to CHANGE_FIELD_LABELS; unknown keys fall back to the raw name.
        const label = CHANGE_FIELD_LABELS[field as keyof typeof CHANGE_FIELD_LABELS] ?? field;
        return `${label} → ${value === "" ? "—" : value}`;
      });
      return parts.length > 0 ? `edited ${parts.join(", ")}` : "edited this item";
    }
    case "set-item-checked":
      return command.checked ? "checked this off" : "unchecked this";
    case "remove-item":
      return "removed this item";
    case "restore-item":
      return "restored this item";
    case "purge-deleted-item":
      return "deleted this forever";
    case "rename-list":
      return "renamed the list";
    default:
      return "changed this item";
  }
}

/**
 * Turns newest-first history events into compact before/after rows for the
 * history table. Older events seed the state used to describe newer changes.
 */
export function buildHistoryTableRows(events: readonly ListItemHistoryEvent[]): HistoryTableRow[] {
  const state: HistoryState = {};
  const rowsByEventId = new Map<string, HistoryTableRow[]>();
  const chronologicalEvents = events.toSorted(
    (left, right) => left.revision - right.revision || left.id.localeCompare(right.id),
  );

  for (const event of chronologicalEvents) {
    const rows: HistoryTableRow[] = [];
    const actorName = event.actor?.username ?? "someone";
    const createRow = (
      field: string,
      before: HistoryValue,
      after: HistoryValue,
    ): HistoryTableRow => ({
      actorName,
      appliedAt: event.appliedAt,
      after: formatHistoryValue(after),
      before: formatHistoryValue(before),
      field,
      id: `${event.id}:${field}:${rows.length}`,
      revision: event.revision,
    });

    switch (event.command.type) {
      case "add-item":
        for (const field of HISTORY_EDITABLE_FIELDS) {
          state[field] = event.command.item[field];
        }
        state.checked = "open";
        rows.push(createRow("item", undefined, event.command.item.name));
        break;
      case "update-item":
        for (const field of HISTORY_EDITABLE_FIELDS) {
          const nextValue = event.command.changes[field];
          if (nextValue === undefined) {
            continue;
          }
          rows.push(createRow(CHANGE_FIELD_LABELS[field], state[field], nextValue));
          state[field] = nextValue;
        }
        if (rows.length === 0) {
          rows.push(createRow("item", undefined, "updated"));
        }
        break;
      case "set-item-checked":
        {
          const nextStatus = event.command.checked ? "done" : "open";
          rows.push(createRow("status", state.checked, nextStatus));
          state.checked = nextStatus;
        }
        break;
      case "remove-item":
        rows.push(createRow("status", "active", "removed"));
        break;
      case "restore-item":
        rows.push(createRow("status", "removed", "active"));
        break;
      case "purge-deleted-item":
        rows.push(createRow("status", "removed", "deleted"));
        break;
      case "rename-list":
        break;
    }

    rowsByEventId.set(event.id, rows);
  }

  return events.flatMap((event) => rowsByEventId.get(event.id) ?? []);
}

function formatHistoryValue(value: HistoryValue): string {
  if (value === undefined || value === "") {
    return "—";
  }
  return String(value);
}

/** Compact relative time for history rows; falls back to the ISO date. */
export function formatRelativeTime(iso: string, nowMs = Date.now()): string {
  const elapsedSeconds = Math.round((nowMs - Date.parse(iso)) / 1000);
  if (!Number.isFinite(elapsedSeconds)) {
    return iso;
  }

  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (elapsedSeconds < 45) {
    return "just now";
  }
  const elapsedMinutes = Math.round(elapsedSeconds / 60);
  if (elapsedMinutes < 60) {
    return formatter.format(-elapsedMinutes, "minute");
  }
  const elapsedHours = Math.round(elapsedMinutes / 60);
  if (elapsedHours < 24) {
    return formatter.format(-elapsedHours, "hour");
  }
  const elapsedDays = Math.round(elapsedHours / 24);
  if (elapsedDays < 14) {
    return formatter.format(-elapsedDays, "day");
  }
  return iso.slice(0, 10);
}
