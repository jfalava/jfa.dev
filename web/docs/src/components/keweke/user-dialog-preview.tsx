import { Button, Input } from "@jfa.dev/common/ui";

import { DocsLink } from "./docs-link";
import { PreviewShell } from "./preview-shell";

function OrDivider() {
  return (
    <div aria-hidden="true" className="relative my-1 flex items-center">
      <hr className="h-px w-full border-0 bg-border" />
      <span className="absolute left-1/2 -translate-x-1/2 bg-popover px-2 font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
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
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
            <p className="font-mono text-[10px] tracking-[0.12em] text-primary uppercase">
              device identity
            </p>
            <span aria-hidden="true" className="text-[11px] text-muted-foreground/75">
              /
            </span>
            <h3 className="text-[11px] font-normal text-muted-foreground/75">Identify yourself</h3>
          </div>
        </div>
        <div className="space-y-5 p-4">
          <section className="space-y-3" aria-labelledby="preview-create-user-heading">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <p className="font-mono text-[10px] tracking-widest text-primary uppercase">
                create a user
              </p>
              <span aria-hidden="true" className="text-[11px] text-muted-foreground/75">
                /
              </span>
              <h3
                className="text-[11px] font-normal text-muted-foreground/75"
                id="preview-create-user-heading"
              >
                Publish lists from this browser
              </h3>
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
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <p className="font-mono text-[10px] tracking-widest text-primary uppercase">
                pair a user
              </p>
              <span aria-hidden="true" className="text-[11px] text-muted-foreground/75">
                /
              </span>
              <h3 className="text-[11px] font-normal text-muted-foreground/75">
                Use an existing user from another device
              </h3>
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
              <p className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                pairing code
              </p>
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
      <p className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
        quick create
      </p>
      <div className="flex items-end gap-2">
        <Input className="h-9 flex-1" placeholder="Your username" />
        <Button size="sm" className="h-9">
          Create
        </Button>
      </div>
    </div>
  );
}
