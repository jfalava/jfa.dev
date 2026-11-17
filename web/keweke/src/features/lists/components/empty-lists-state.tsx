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
    <div className="flex flex-col items-start gap-4 page-gutters py-8">
      <p className="text-sm text-muted-foreground">
        <fbt desc="Message on the lists page when the user has no shopping lists yet">
          No lists yet. Create one when you need it.
        </fbt>
      </p>
      <Button isDisabled={isCreating} onPress={onCreate}>
        {isCreating ? (
          <fbt desc="Label of the new-list button while the list is being created">Creating…</fbt>
        ) : (
          <fbt desc="Button on the empty lists page that creates a new shopping list">New list</fbt>
        )}
        {!isCreating ? (
          <HotkeyKbd className="hidden sm:inline-flex" hotkey={NEW_LIST_HOTKEY} />
        ) : null}
      </Button>
      <DocsLink href={kewekeDocs.createList} variant="info">
        <fbt desc="Link from the empty lists page to the docs about how lists work">
          How lists work
        </fbt>
      </DocsLink>
    </div>
  );
}
