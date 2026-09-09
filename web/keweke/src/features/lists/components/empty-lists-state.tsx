import { Button } from "@jfa.dev/common/ui";

import { DocsLink } from "@/app/components/docs-link";
import { HotkeyKbd } from "@/app/components/hotkey-kbd";
import { NEW_LIST_HOTKEY } from "@/app/components/keweke-header";
import { kewekeDocs } from "@/app/lib/docs-paths";

export function EmptyListsState({
  isCreating,
  onCreate,
}: {
  isCreating: boolean;
  onCreate: () => void;
}) {
  return (
    <div className="flex flex-col items-start gap-4 px-4 py-8 sm:px-6 lg:px-8">
      <p className="text-sm text-muted-foreground">No lists yet. Create one when you need it.</p>
      <Button isDisabled={isCreating} onPress={onCreate}>
        {isCreating ? "Creating…" : "New list"}
        {!isCreating ? (
          <HotkeyKbd className="hidden sm:inline-flex" hotkey={NEW_LIST_HOTKEY} />
        ) : null}
      </Button>
      <DocsLink href={kewekeDocs.createList} variant="info">
        How lists work
      </DocsLink>
    </div>
  );
}
