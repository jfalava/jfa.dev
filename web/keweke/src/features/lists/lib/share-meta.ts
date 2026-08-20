import type { ListSnapshot } from "@jfa.dev/common/lists";

export interface ListShareMeta {
  title: string;
  itemCount: number;
  completedCount: number;
}

export function listShareMetaFromSnapshot(snapshot: ListSnapshot): ListShareMeta {
  const completedCount = snapshot.items.filter((item) => item.checked).length;
  return {
    title: snapshot.title,
    itemCount: snapshot.items.length,
    completedCount,
  };
}

export function listShareDescription(meta: ListShareMeta): string {
  if (meta.itemCount === 0) {
    return "No items yet — add your first item to this shared shopping list.";
  }
  const items = meta.itemCount === 1 ? "1 item" : `${meta.itemCount} items`;
  return `${items} · ${meta.completedCount} done`;
}
