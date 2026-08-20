import { Button } from "@jfa.dev/common/ui";

import { HotkeyKbd } from "@/app/components/hotkey-kbd";
import { NEW_LIST_HOTKEY } from "@/app/components/keweke-header";

export function EmptyListsState({
  isCreating,
  onCreate,
}: {
  isCreating: boolean;
  onCreate: () => void;
}) {
  return (
    <div className="flex grow flex-col items-center justify-center gap-6 px-4 text-center sm:px-6 lg:px-8">
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
