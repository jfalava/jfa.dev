import { Button, Kbd, KbdGroup } from "@jfa.dev/common/ui";

import { DocsLink } from "./docs-link";
import { PreviewShell } from "./preview-shell";

export function EmptyListsPreview() {
  return (
    <PreviewShell>
      <div className="flex flex-col">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b px-4 py-5">
          <h1 className="font-sans text-4xl leading-[0.95] font-semibold tracking-tighter uppercase sm:text-5xl">
            Your lists
          </h1>
          <p className="text-sm text-muted-foreground">0 lists</p>
        </div>

        <div className="flex flex-col items-start gap-4 px-4 py-8 sm:px-6">
          <p className="text-sm text-muted-foreground">
            No lists yet. Create one when you need it.
          </p>
          <Button aria-label="Create new list">
            New list
            <KbdGroup className="hidden sm:inline-flex">
              <Kbd className="h-4 min-w-4 bg-transparent px-0.5 text-[10px] leading-none">⌘</Kbd>
              <Kbd className="h-4 min-w-4 bg-transparent px-0.5 text-[10px] leading-none">E</Kbd>
            </KbdGroup>
          </Button>
          <DocsLink href="/docs/keweke/lists/create-a-list" variant="info">
            How lists work
          </DocsLink>
        </div>
      </div>
    </PreviewShell>
  );
}
