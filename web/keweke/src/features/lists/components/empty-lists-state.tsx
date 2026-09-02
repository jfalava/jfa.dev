import { Button } from "@jfa.dev/common/ui";
import { Inbox } from "lucide-react";

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
    <div className="flex grow flex-col items-center justify-center gap-5 px-4 py-10 text-center sm:px-6 lg:px-8">
      <Inbox aria-hidden="true" className="size-12 stroke-[1.25] text-muted-foreground" />
      <div>
        <h2 className="text-lg font-semibold tracking-tight">No lists yet</h2>
        <p className="mt-1 text-sm text-muted-foreground">Create one when you need it.</p>
        <p className="mt-2 text-xs text-muted-foreground">
          <DocsLink className="align-baseline" href={kewekeDocs.createList}>
            Create a list
          </DocsLink>
        </p>
      </div>
      <Button
        className="flex h-11 w-full gap-x-3 text-base sm:w-auto sm:px-8"
        isDisabled={isCreating}
        onPress={onCreate}
      >
        {isCreating ? "Creating…" : "Create a new list"}
        {!isCreating ? (
          <HotkeyKbd className="hidden sm:inline-flex" hotkey={NEW_LIST_HOTKEY} />
        ) : null}
      </Button>
    </div>
  );
}
