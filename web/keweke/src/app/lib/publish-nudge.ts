import type { ListBackend } from "@jfa.dev/common/lists";

const DEFAULT_LIST_TITLE = "New list";

export function shouldShowPublishNudge(input: {
  backend: ListBackend | undefined;
  isFirstList: boolean;
  itemCount: number;
  title: string | undefined;
}): boolean {
  return (
    input.backend === "local" &&
    input.isFirstList &&
    input.itemCount === 1 &&
    input.title !== undefined &&
    input.title !== DEFAULT_LIST_TITLE
  );
}
