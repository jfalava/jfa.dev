import type { ListItem } from "@jfa.dev/common/lists";

export type ListView = "list" | "inventory";

export function parseListView(value: ListView | undefined): ListView {
  return value ?? "list";
}

export function itemsForListView(items: readonly ListItem[], view: ListView): ListItem[] {
  return items.filter((item) => (view === "inventory" ? item.checked : !item.checked));
}
