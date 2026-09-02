import { Button, Kbd, KbdGroup } from "@jfa.dev/common/ui";
import { Inbox } from "lucide-react";

import { DocsLink } from "./docs-link";
import { PreviewShell } from "./preview-shell";

export function EmptyListsPreview() {
  return (
    <PreviewShell>
      {/* Mimics Routes/index.tsx: ListsPageHeader + EmptyListsState */}
      <div className="flex flex-col">
        <div className="invoice-rule flex flex-wrap items-end justify-between gap-4 border-b px-4 py-5">
          <h1 className="mt-2 text-4xl leading-[0.95] font-semibold tracking-tighter uppercase sm:text-5xl">
            Your lists
          </h1>
          <p className="font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase">
            0 saved
          </p>
        </div>

        <div className="flex flex-col items-center justify-center gap-5 px-4 py-10 text-center sm:px-6">
          <Inbox aria-hidden="true" className="size-12 stroke-[1.25] text-muted-foreground" />
          <div>
            <h2 className="text-lg font-semibold tracking-tight">No lists yet</h2>
            <p className="mt-1 text-sm text-muted-foreground">Create one when you need it.</p>
            <p className="mt-2 text-xs text-muted-foreground">
              <DocsLink className="align-baseline" href="/docs/keweke/lists/create-a-list">
                Create a list
              </DocsLink>
            </p>
          </div>
          <Button
            aria-label="Create new list"
            variant="ghost"
            className="flex h-11 w-full gap-x-3 px-8 text-base text-muted-foreground hover:text-foreground sm:w-auto"
          >
            Create a new list
            <KbdGroup className="hidden sm:inline-flex">
              <Kbd className="h-4 min-w-4 bg-transparent px-0.5 text-[10px] leading-none">⌘</Kbd>
              <Kbd className="h-4 min-w-4 bg-transparent px-0.5 text-[10px] leading-none">E</Kbd>
            </KbdGroup>
          </Button>
        </div>
      </div>
    </PreviewShell>
  );
}
