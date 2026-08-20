import type { ListCommand } from "@jfa.dev/common/lists";

const CHANGE_FIELD_LABELS = {
  amount: "each",
  category: "category",
  name: "name",
  quantity: "qty",
  unit: "unit",
} as const;

/** Human-readable description of what a mutation did to an item. */
export function describeHistoryEvent(command: ListCommand): string {
  switch (command.type) {
    case "add-item":
      return "added this item";
    case "update-item": {
      const parts = Object.entries(command.changes).map(([field, value]) => {
        // SAFETY: change keys come from the zod itemChangesSchema whose fields
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
