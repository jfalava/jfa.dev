import { Button, Input } from "@jfa.dev/common/ui";

import { DocsLink } from "./docs-link";
import { PreviewShell } from "./preview-shell";

function OrDivider() {
  return (
    <div aria-hidden="true" className="relative my-1 flex items-center">
      <hr className="h-px w-full border-0 bg-border" />
      <span className="absolute left-1/2 -translate-x-1/2 bg-popover px-2 text-xs text-muted-foreground">
        or
      </span>
    </div>
  );
}

export function UserDialogPreview() {
  return (
    <PreviewShell>
      <div className="flex flex-col rounded-lg border bg-popover text-popover-foreground">
        <div className="border-b px-4 py-4">
          <h2 className="text-lg font-semibold tracking-tight">Identify this browser</h2>
        </div>
        <div className="space-y-5 p-4">
          <section className="space-y-3" aria-labelledby="preview-create-user-heading">
            <div className="space-y-1">
              <h3 className="text-sm font-medium" id="preview-create-user-heading">
                Create a user
              </h3>
              <p className="text-sm text-muted-foreground">Publish lists from this browser.</p>
            </div>
            <div className="flex items-end gap-2">
              <div className="min-w-0 flex-1">
                <Input
                  className="mt-1.5 h-10 font-serif text-base sm:text-sm"
                  placeholder="Your username"
                />
              </div>
              <Button className="h-10 min-w-24 px-5 text-sm">Create</Button>
            </div>
            <p className="flex">
              <DocsLink href="/docs/keweke/users/create-a-user" variant="info">
                How names work
              </DocsLink>
            </p>
          </section>

          <section className="space-y-3">
            <OrDivider />
            <div className="space-y-1">
              <h3 className="text-sm font-medium">Pair a user</h3>
              <p className="text-sm text-muted-foreground">
                Use an existing user from another device.
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              Already have a user on another browser? Connect this one with a passkey or a pairing
              code.
            </p>
            <p className="flex">
              <DocsLink href="/docs/keweke/architecture/identity" variant="info">
                How pairing works
              </DocsLink>
            </p>
            <div className="flex flex-col items-stretch gap-3">
              <Button className="h-10 gap-1.5 px-5 text-sm">Pair with passkey</Button>
              <OrDivider />
              <Button className="h-10 min-w-24 px-5 text-sm">Show pairing code</Button>
            </div>
            <div className="border border-border bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground">Pairing code</p>
              <p className="mt-1 font-mono text-xl tracking-[0.18em] break-all text-primary">
                aB3x9Qp2Zk
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Waiting for approval on your other device…
              </p>
              <Button className="mt-3" size="sm">
                Use this username
              </Button>
            </div>
          </section>
        </div>
      </div>
    </PreviewShell>
  );
}

export function InlineUserCreationPreview() {
  return (
    <div className="not-prose my-4 flex flex-col gap-2 rounded-md border bg-muted/30 p-3">
      <p className="text-xs text-muted-foreground">Quick create</p>
      <div className="flex items-end gap-2">
        <Input className="h-9 flex-1" placeholder="Your username" />
        <Button size="sm" className="h-9">
          Create
        </Button>
      </div>
    </div>
  );
}
