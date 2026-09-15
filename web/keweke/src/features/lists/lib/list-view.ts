import type { ListItem } from "@jfa.dev/common/lists";

export type ListView = "list" | "inventory";

export function parseListView(value: unknown): ListView {
  return value === "inventory" ? "inventory" : "list";
}

export function itemsForListView(items: readonly ListItem[], view: ListView): ListItem[] {
  return items.filter((item) => (view === "inventory" ? item.checked : !item.checked));
}
