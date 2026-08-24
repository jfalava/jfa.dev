import { Button, Kbd, KbdGroup } from "@jfa.dev/common/ui";
import { Copy, Plus, UserRound } from "lucide-react";

import { PreviewShell } from "./preview-shell";

export function HeaderNewListPreview() {
  return (
    <PreviewShell caption="Keweke header (/keweke and /keweke/:listId). The “New list” button is always available unless the store is empty — hidden to keep the empty state as the single call to action.">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-background px-3 py-2 sm:px-4">
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm font-black tracking-tighter">KEWEKE</span>
          <span className="hidden font-mono text-[10px] tracking-wide text-muted-foreground sm:inline">
            Yet another collaborative shopping list
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            aria-label="User"
            size="icon-lg"
            variant="ghost"
            isDisabled
            className="w-8 sm:w-auto sm:gap-1.5 sm:px-2.5"
          >
            <UserRound aria-hidden="true" className="size-4" />
            <span className="hidden sm:inline">User</span>
          </Button>
          <Button
            aria-label="Copy share link"
            size="lg"
            variant="outline"
            isDisabled
            className="hidden h-8 sm:inline-flex"
          >
            <Copy className="size-4" />
            <span className="hidden sm:inline">Share</span>
          </Button>
          <Button
            aria-label="Create new list"
            className="inline-flex w-8 sm:w-auto sm:gap-1.5 sm:px-2.5"
            isDisabled
            size="icon-lg"
          >
            <Plus className="size-4" />
            <span className="hidden sm:inline">New list</span>
            <KbdGroup className="hidden sm:inline-flex">
              <Kbd className="h-4 min-w-4 bg-white/20 px-0.5 text-[10px] leading-none text-primary-foreground">
                ⌘
              </Kbd>
              <Kbd className="h-4 min-w-4 bg-white/20 px-0.5 text-[10px] leading-none text-primary-foreground">
                E
              </Kbd>
            </KbdGroup>
          </Button>
        </div>
      </div>
      <div className="px-4 py-3">
        <p className="font-mono text-[10px] tracking-[0.08em] text-muted-foreground uppercase">
          Hotkey: Mod+E (⌘E / Ctrl+E) triggers the same createLocalList() call.
        </p>
      </div>
    </PreviewShell>
  );
}

export function NewListHotkeyPreview() {
  return (
    <div className="not-prose my-4 flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2.5">
      <span className="font-mono text-[11px] tracking-wide text-muted-foreground">Press</span>
      <KbdGroup>
        <Kbd>⌘</Kbd>
        <Kbd>E</Kbd>
      </KbdGroup>
      <span className="font-mono text-[11px] tracking-wide text-muted-foreground">or</span>
      <KbdGroup>
        <Kbd>Ctrl</Kbd>
        <Kbd>E</Kbd>
      </KbdGroup>
      <span className="font-mono text-[11px] tracking-wide text-muted-foreground">
        to create a list
      </span>
    </div>
  );
}
