import { Button } from "@jfa.dev/common/ui";
import { Check, CloudUpload, Copy, RefreshCw } from "lucide-react";

import { PreviewShell } from "./preview-shell";

export function PublishButtonPreview() {
  return (
    <PreviewShell caption="Publish button in Keweke header — shown only for local lists. Hotkey Mod+U. Share/Copy appears only for remote lists.">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-background px-3 py-2 sm:px-4">
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm font-black tracking-tighter">KEWEKE</span>
          <span className="hidden font-mono text-[10px] tracking-wide text-muted-foreground sm:inline">
            Yet another collaborative shopping list
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            aria-label="Publish list to a remote list"
            className="inline-flex w-8 sm:w-auto sm:gap-1.5 sm:px-2.5"
            isDisabled
            size="icon-lg"
            variant="outline"
          >
            <CloudUpload className="size-4" />
            <span className="hidden sm:inline">Publish</span>
            <span className="hidden rounded bg-muted px-1 py-0.5 font-mono text-[10px] leading-none text-muted-foreground sm:inline-flex">
              ⌘U
            </span>
          </Button>
          <div className="hidden h-8 items-center gap-1.5 sm:flex">
            <span className="font-mono text-[10px] tracking-wide text-muted-foreground">vs</span>
            <Button
              aria-label="Copy share link"
              className="h-8 min-w-0"
              isDisabled
              size="lg"
              variant="outline"
            >
              <Copy className="size-4" />
              <span>Share</span>
            </Button>
          </div>
        </div>
      </div>
      <div className="flex gap-4 px-4 py-3 font-mono text-[10px] tracking-[0.08em] text-muted-foreground uppercase">
        <span>
          <span className="inline-flex size-2 rounded-full bg-primary align-middle" /> local →
          Publish
        </span>
        <span>
          <span className="inline-flex size-2 rounded-full bg-amber-500 align-middle" /> remote →
          Share
        </span>
      </div>
    </PreviewShell>
  );
}

export function PublishNudgePreview() {
  return (
    <PreviewShell caption="Publish nudge — tooltip under the Publish button the first time a local list looks shareable. Auto-dismisses after 10s.">
      <div className="flex justify-end bg-background p-6">
        <div className="relative">
          <Button
            aria-describedby="preview-publish-nudge"
            aria-label="Publish list to a remote list"
            className="inline-flex sm:gap-1.5 sm:px-2.5"
            isDisabled
            size="icon-lg"
            variant="outline"
          >
            <CloudUpload className="size-4" />
            <span>Publish</span>
          </Button>
          <div
            className="absolute top-full right-0 z-10 mt-2 w-64 rounded-md border border-border bg-popover px-3 py-2 text-left text-xs leading-relaxed text-popover-foreground shadow-lg before:absolute before:-top-1 before:right-3 before:size-2 before:rotate-45 before:border-t before:border-l before:border-border before:bg-popover before:content-[''] sm:before:right-10"
            id="preview-publish-nudge"
            role="tooltip"
          >
            You can now publish this list to access it from anywhere.
          </div>
        </div>
      </div>
      <p className="border-t bg-muted/30 px-3 py-2 font-mono text-[10px] leading-relaxed text-muted-foreground">
        Shown when a local list has enough items / the title was changed from “New list.” Dismiss to
        hide forever.
      </p>
    </PreviewShell>
  );
}

export function PublishDialogPreview() {
  return (
    <PreviewShell caption="Publish dialog — confirms public addresses before the list leaves this browser.">
      <div className="overflow-hidden rounded-lg border bg-popover text-popover-foreground">
        <div className="border-b px-4 py-4">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <p className="text-[10px] tracking-[0.12em] text-primary uppercase">
              publish to remote
            </p>
            <span aria-hidden="true" className="text-[11px] text-muted-foreground/75">
              /
            </span>
            <h2 className="text-[11px] font-normal text-muted-foreground/75">
              Make this list public?
            </h2>
          </div>
        </div>
        <div className="space-y-5 p-4">
          <p className="text-sm leading-6 text-muted-foreground">
            Publishing this list will make it public and accessible online. Anyone with its ID or
            alias can open it.
          </p>
          <div className="space-y-2 border bg-muted/40 p-3 text-[11px]">
            <p className="tracking-widest text-muted-foreground uppercase">public addresses</p>
            <div className="flex gap-3">
              <span className="w-12 shrink-0 text-muted-foreground uppercase">id</span>
              <span className="min-w-0 font-mono break-all text-primary">
                0199c2f0-8a1b-7c3d-9e4f-2a1b3c4d5e6f
              </span>
            </div>
            <div className="flex gap-3">
              <span className="w-12 shrink-0 text-muted-foreground uppercase">alias</span>
              <span className="min-w-0 font-mono break-all text-primary">
                weekend-groceries-a3k
              </span>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button isDisabled variant="ghost">
              Cancel
            </Button>
            <Button isDisabled>
              <RefreshCw aria-hidden="true" className="size-3.5 animate-spin" />
              Publishing…
            </Button>
          </div>
        </div>
      </div>
      <p className="border-t bg-muted/30 px-3 py-2 font-mono text-[10px] leading-relaxed text-muted-foreground">
        Needs a named user — if you have none, the User dialog opens first (
        <span className="text-foreground">“You must create an user to publish”</span>).
      </p>
    </PreviewShell>
  );
}

export function RemoteListPreview() {
  return (
    <PreviewShell caption="After publishing — the list is now remote and collaborative. Header swaps Publish → Share (copy link), catalog shows Cloud badge.">
      <div className="flex flex-col">
        <div className="flex items-center justify-between border-b bg-background px-3 py-2 sm:px-4">
          <span className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
            remote list · public
          </span>
          <span className="font-mono text-[10px] tracking-wide text-muted-foreground">
            Anyone with the link can open it
          </span>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-background px-3 py-2 sm:px-4">
          <div className="flex items-center gap-2 font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
            <span className="size-2 rounded-full bg-emerald-500" />
            live
            <span className="hidden sm:inline">· WebSocket connected</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              aria-label="Copy share link"
              className="h-8 gap-1.5"
              isDisabled
              size="sm"
              variant="outline"
            >
              <Copy className="size-3.5" />
              Share
            </Button>
            <span className="font-mono text-[10px] tracking-wide text-muted-foreground">vs</span>
            <Button
              aria-label="Publish list to a remote list"
              className="inline-flex opacity-30"
              isDisabled
              size="sm"
              variant="outline"
            >
              <CloudUpload className="size-3.5" />
              Publish
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-between border-b bg-muted/20 px-4 py-3">
          <span className="font-serif text-sm font-medium">Weekend groceries</span>
          <span className="flex items-center gap-1.5 font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
            <Copy className="size-3" /> Share
            <Check className="size-3 text-emerald-600" />
            Copied
          </span>
        </div>
        <p className="bg-background px-4 py-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
          Your browser keeps a cached copy in IndexedDB — offline opens still work, and reconnecting
          replays mutations. If the owner deletes the list, your cached copy is removed on next
          sync.
        </p>
      </div>
    </PreviewShell>
  );
}
