import { Button, Kbd, KbdGroup } from "@jfa.dev/common/ui";
import { Check, CloudUpload, Copy } from "lucide-react";
import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";

import { DocsLink } from "./docs-link";
import { PreviewShell } from "./preview-shell";

export function PublishButtonPreview() {
  return (
    <PreviewShell>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-background px-3 py-2 sm:px-4">
        <div className="flex items-center gap-3">
          <span className="font-sans text-sm font-black tracking-tighter text-primary">
            /KEWEKE
          </span>
          <span className="hidden font-sans text-[10px] tracking-wide text-muted-foreground sm:inline">
            Yet another collaborative shopping list
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            aria-label="Publish list to a remote list"
            size="lg"
            variant="ghost"
            className="gap-1.5 px-2 text-muted-foreground hover:text-foreground"
          >
            <CloudUpload className="size-4" />
            <span className="hidden sm:inline">Publish</span>
            <KbdGroup className="hidden sm:inline-flex">
              <Kbd className="h-4 min-w-4 bg-transparent px-0.5 text-[10px] leading-none">⌘</Kbd>
              <Kbd className="h-4 min-w-4 bg-transparent px-0.5 text-[10px] leading-none">U</Kbd>
            </KbdGroup>
          </Button>
          <div className="hidden h-8 items-center gap-1.5 sm:flex">
            <span className="font-mono text-[10px] tracking-wide text-muted-foreground">vs</span>
            <Button
              aria-label="Copy share link"
              size="lg"
              variant="ghost"
              className="gap-1.5 px-2 text-muted-foreground hover:text-foreground"
            >
              <Copy className="size-4" />
              <span>Share</span>
            </Button>
          </div>
        </div>
      </div>
    </PreviewShell>
  );
}

const NUDGE_TOOLTIP_CLASSES =
  "absolute z-50 w-64 rounded-md border border-border bg-popover px-3 py-2 text-left text-xs leading-relaxed text-popover-foreground shadow-lg before:absolute before:-top-1 before:right-3 before:size-2 before:rotate-45 before:border-t before:border-l before:border-border before:bg-popover before:content-[''] sm:before:right-10";

function PublishNudgeTooltip({
  anchorRef,
  onDismiss,
}: {
  anchorRef: RefObject<HTMLSpanElement | null>;
  onDismiss: () => void;
}) {
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);

  useLayoutEffect(() => {
    const update = () => {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (rect) {
        setPos({
          top: rect.bottom + window.scrollY + 8,
          right: document.documentElement.clientWidth - rect.right,
        });
      }
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [anchorRef]);

  useLayoutEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Tab" || event.key === "Escape") {
        onDismiss();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDismiss]);

  if (!pos) {
    return null;
  }

  return createPortal(
    <button
      className={`${NUDGE_TOOLTIP_CLASSES} block cursor-pointer text-left`}
      id="preview-publish-nudge"
      onClick={onDismiss}
      style={{ top: pos.top, right: pos.right }}
      type="button"
    >
      You can now publish this list to access it from anywhere.
    </button>,
    document.body,
  );
}

export function PublishNudgePreview() {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const [nudgeVisible, setNudgeVisible] = useState(true);
  const dismissNudge = () => {
    setNudgeVisible(false);
  };

  return (
    <PreviewShell>
      <div className="flex justify-end bg-background p-6">
        <span ref={anchorRef} className="inline-flex">
          <Button
            aria-describedby={nudgeVisible ? "preview-publish-nudge" : undefined}
            aria-label="Publish list to a remote list"
            size="lg"
            variant="ghost"
            className="gap-1.5 px-2 text-muted-foreground hover:text-foreground"
            onClick={dismissNudge}
          >
            <CloudUpload className="size-4" />
            <span>Publish</span>
          </Button>
        </span>
        {nudgeVisible ? (
          <PublishNudgeTooltip anchorRef={anchorRef} onDismiss={dismissNudge} />
        ) : null}
      </div>
    </PreviewShell>
  );
}

export function PublishDialogPreview() {
  return (
    <PreviewShell>
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
            alias can open it.{" "}
            <DocsLink className="align-baseline" href="/docs/keweke/lists/publishing-a-list">
              Publishing a list
            </DocsLink>
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
            <Button variant="ghost">Cancel</Button>
            <Button>Publish</Button>
          </div>
        </div>
      </div>
    </PreviewShell>
  );
}

export function RemoteListPreview() {
  return (
    <PreviewShell>
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
              size="lg"
              variant="ghost"
              className="gap-1.5 px-2 text-muted-foreground hover:text-foreground"
            >
              <Copy className="size-4" />
              Share
            </Button>
            <span className="font-mono text-[10px] tracking-wide text-muted-foreground">vs</span>
            <Button
              aria-label="Publish list to a remote list"
              size="lg"
              variant="ghost"
              className="gap-1.5 px-2 text-muted-foreground opacity-30 hover:text-foreground"
            >
              <CloudUpload className="size-4" />
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
