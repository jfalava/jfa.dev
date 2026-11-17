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
