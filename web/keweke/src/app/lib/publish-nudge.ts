import type { ListBackend } from "@jfa.dev/common/lists";

const DEFAULT_LIST_TITLE = "New list";

export function shouldShowPublishNudge(input: {
  backend: ListBackend | undefined;
  isFirstList: boolean;
  itemCount: number;
  title: string | undefined;
}): boolean {
  if (input.backend !== "local" || !input.isFirstList) {
    return false;
  }

  const hasCustomTitle = input.title !== undefined && input.title !== DEFAULT_LIST_TITLE;
  const hasItems = input.itemCount >= 1;

  return hasCustomTitle || hasItems;
}
