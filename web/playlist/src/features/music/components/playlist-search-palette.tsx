import {
  Button,
  Dialog,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
  Input,
  Kbd,
  KbdGroup,
} from "@jfa.dev/common/ui";
import { detectPlatform, formatForDisplay, useHotkey } from "@tanstack/react-hotkeys";
import { CornerDownLeft, ListMusic, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

import {
  playlistAnchorId,
  playlists,
  type PlaylistDefinition,
} from "@/data/playlists";
import { cn } from "@/lib/utils";

// oxlint-disable-next-line eslint/no-empty-function
const subscribe = () => () => {};

function HotkeyKbd({
  hotkey,
  className,
  kbdClassName,
}: {
  hotkey: string;
  className?: string;
  kbdClassName?: string;
}) {
  const platform = useSyncExternalStore(subscribe, detectPlatform, () => "mac" as const);

  return (
    <KbdGroup className={className}>
      {formatForDisplay(hotkey, { platform, separatorToken: " " })
        .split(" ")
        .map((token) => (
          <Kbd key={token} className={kbdClassName}>
            {token}
          </Kbd>
        ))}
    </KbdGroup>
  );
}

function matchesQuery(playlist: PlaylistDefinition, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return true;
  }
  const haystack = [
    playlist.id,
    playlist.snapshot.title,
    playlist.snapshot.subtitle ?? "",
    playlist.snapshot.playlistId,
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(needle);
}

function jumpToPlaylist(playlist: PlaylistDefinition): void {
  const anchor = document.getElementById(playlistAnchorId(playlist.id));
  if (!anchor) {
    return;
  }
  anchor.scrollIntoView({ behavior: "smooth", block: "start" });
  if (!playlist.isDefault) {
    const trigger = anchor.querySelector<HTMLButtonElement>('[data-slot="accordion-trigger"]');
    if (trigger && trigger.getAttribute("aria-expanded") !== "true") {
      trigger.click();
    }
  }
}

/** Command palette listing every build-time playlist. Opens with ⌘/Ctrl+K. */
export function PlaylistSearchPalette() {
  const [open, setOpen] = useState(false);
  const [draftQuery, setDraftQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(
    () => playlists.filter((playlist) => matchesQuery(playlist, draftQuery)),
    [draftQuery],
  );
  const clampedActiveIndex =
    results.length === 0 ? 0 : Math.min(activeIndex, results.length - 1);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useHotkey("Mod+K", () => {
    setOpen((prev) => !prev);
  });

  const handleOpenChange = (nextOpen: boolean): void => {
    setOpen(nextOpen);
    if (nextOpen) {
      setDraftQuery("");
      setActiveIndex(0);
    }
  };

  const selectPlaylist = (playlist: PlaylistDefinition): void => {
    setOpen(false);
    // Wait a tick so the dialog unmounts before scrolling/focusing the target.
    requestAnimationFrame(() => jumpToPlaylist(playlist));
  };

  return (
    <DialogTrigger isOpen={open} onOpenChange={handleOpenChange}>
      <Button
        type="button"
        variant="ghost"
        size="lg"
        className="gap-1.5 px-2 text-muted-foreground hover:text-foreground"
        aria-label="Search playlists"
      >
        <Search className="size-4" />
        <span className="hidden sm:inline">Lists</span>
        <HotkeyKbd
          hotkey="Mod+K"
          className="hidden md:inline-flex"
          kbdClassName="h-5 min-h-0 px-1 text-[10px]"
        />
      </Button>
      <Dialog
        className="max-w-[calc(100%-1.5rem)] gap-0 overflow-hidden p-0 sm:max-w-xl"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">Search playlists</DialogTitle>
        <DialogDescription className="sr-only">
          Jump to any playlist loaded at build time
        </DialogDescription>
        <div className="flex items-center gap-3 border-b border-border px-4">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={draftQuery}
            onChange={(event) => {
              setDraftQuery(event.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setActiveIndex((index) => Math.min(index + 1, Math.max(results.length - 1, 0)));
                return;
              }
              if (event.key === "ArrowUp") {
                event.preventDefault();
                setActiveIndex((index) => Math.max(index - 1, 0));
                return;
              }
              if (event.key === "Enter") {
                event.preventDefault();
                const selected = results[clampedActiveIndex];
                if (selected) {
                  selectPlaylist(selected);
                }
              }
            }}
            placeholder="Search playlists…"
            aria-label="Search playlists"
            className="h-12 border-0 bg-transparent px-0 text-sm shadow-none focus-visible:border-0 focus-visible:ring-0"
          />
          <kbd className="hidden shrink-0 items-center gap-1 text-[10px] text-muted-foreground sm:inline-flex">
            <CornerDownLeft className="size-3" />
            Open
          </kbd>
        </div>

        <div className="max-h-[min(24rem,55vh)] overflow-y-auto" aria-live="polite">
          {results.length === 0 ? (
            <div className="px-4 py-10 text-center text-xs text-muted-foreground">
              No playlists match “{draftQuery.trim()}”
            </div>
          ) : (
            <div className="p-1.5">
              {results.map((playlist, index) => {
                const isActive = index === clampedActiveIndex;
                return (
                  <button
                    key={playlist.id}
                    type="button"
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => selectPlaylist(playlist)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md px-2.5 py-2.5 text-left transition-colors",
                      isActive ? "bg-muted text-foreground" : "text-foreground hover:bg-muted/70",
                    )}
                  >
                    <ListMusic className="size-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {playlist.snapshot.title}
                      </span>
                      <span className="mt-0.5 block truncate font-mono text-[10px] tracking-wide text-muted-foreground uppercase">
                        {playlist.id}
                        {playlist.isDefault ? " · default" : ""} · {playlist.snapshot.trackCount}{" "}
                        tracks
                      </span>
                    </span>
                    <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                      {new Date(playlist.snapshot.fetchedAt).toLocaleDateString()}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </Dialog>
    </DialogTrigger>
  );
}
