import { Button, Kbd, KbdGroup } from "@jfa.dev/common/ui";

import { DocsLink } from "./docs-link";
import { PreviewShell } from "./preview-shell";

export function EmptyListsPreview() {
  return (
    <PreviewShell>
      <div className="flex flex-col">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b page-gutters py-5">
          <h1 className="type-page-title">Your lists</h1>
          <p className="text-sm text-muted-foreground">0 lists</p>
        </div>

        <div className="flex flex-col items-start gap-4 page-gutters py-8">
          <p className="text-sm text-muted-foreground">
            No lists yet. Create one when you need it.
          </p>
          <Button aria-label="Create new list">
            New list
            <KbdGroup className="hidden sm:inline-flex">
              <Kbd>⌘</Kbd>
              <Kbd>E</Kbd>
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
