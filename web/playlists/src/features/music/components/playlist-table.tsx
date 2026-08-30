/* oxlint-disable typescript/no-unsafe-assignment */
/* oxlint-disable typescript/no-unsafe-call */
/* oxlint-disable typescript/no-unsafe-member-access */
/* oxlint-disable typescript/no-unsafe-return */
/* oxlint-disable react/no-unstable-nested-components */
import { buttonVariants, TableCell } from "@jfa.dev/common/ui";
import { createColumnHelper, tableFeatures, useTable } from "@tanstack/react-table";
import { useCallback, useMemo, useRef, useState } from "react";

import type { PlaylistTrack } from "@/data/playlist-schema";
import { isNowPlayingMatch } from "@/features/music/lib/match";
import { cn } from "@/lib/utils";

import type { NowPlayingTrack } from "../server/now-playing";

import { AppleMusicIcon, SpotifyIcon } from "./music-icons";

const playlistTableFeatures = tableFeatures({});
const trackColumnHelper = createColumnHelper<typeof playlistTableFeatures, PlaylistTrack>();

/** Visible window height ≈ 20 rows; scroll loads the rest in chunks of 20. */
export const PLAYLIST_PAGE_SIZE = 20;
const PLAYLIST_ROW_HEIGHT_PX = 58;
const PLAYLIST_MAX_HEIGHT_PX = PLAYLIST_PAGE_SIZE * PLAYLIST_ROW_HEIGHT_PX;

function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

function createPlaylistColumns(activeTrack: NowPlayingTrack | null) {
  return trackColumnHelper.columns([
    trackColumnHelper.display({
      id: "cover",
      header: () => <span className="sr-only">Cover</span>,
      cell: ({ row }) => (
        <span className="block size-11 shrink-0 overflow-hidden rounded-md bg-muted">
          <img
            src={row.original.artwork}
            alt=""
            width={44}
            height={44}
            loading="lazy"
            decoding="async"
            className="aspect-square size-full object-cover"
          />
        </span>
      ),
    }),
    trackColumnHelper.accessor("title", {
      header: "Title",
      cell: ({ getValue, row }) => {
        const isActive = activeTrack ? isNowPlayingMatch(row.original, activeTrack) : false;
        return (
          <span className="inline-flex items-center gap-2">
            <span className="leading-tight font-medium">{getValue()}</span>
            {isActive ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-1.5 py-0.5 font-mono text-[10px] tracking-wide text-success dark:text-success">
                <span className="size-1.5 animate-pulse rounded-full bg-success" aria-hidden />
                Now listening
              </span>
            ) : null}
          </span>
        );
      },
    }),
    trackColumnHelper.accessor("artist", {
      header: "Artist",
      cell: ({ getValue }) => <span className="text-muted-foreground">{getValue()}</span>,
    }),
    trackColumnHelper.accessor("album", {
      header: "Album",
      cell: ({ getValue }) => {
        const value = getValue();
        return value ? (
          <span className="truncate text-muted-foreground">{value}</span>
        ) : (
          <span className="text-muted-foreground/50">—</span>
        );
      },
    }),
    trackColumnHelper.display({
      id: "duration",
      header: () => <span className="block text-right">Length</span>,
      cell: ({ row }) => (
        <span className="block text-right font-mono text-xs tracking-wide text-muted-foreground tabular-nums">
          {formatDuration(row.original.durationMs)}
        </span>
      ),
    }),
    trackColumnHelper.display({
      id: "links",
      header: () => <span className="sr-only">Links</span>,
      cell: ({ row }) => {
        const track = row.original;
        return (
          <span className="inline-flex items-center justify-end gap-2">
            <a
              href={track.url}
              target="_blank"
              rel="noreferrer"
              aria-label={`${track.title} — ${track.artist} on Apple Music`}
              className={cn(
                buttonVariants({ variant: "default", size: "icon" }),
                "size-8 shrink-0 rounded-xl [&_svg]:size-5",
              )}
            >
              <AppleMusicIcon className="size-5" />
            </a>
            {track.spotifyUrl ? (
              <a
                href={track.spotifyUrl}
                target="_blank"
                rel="noreferrer"
                aria-label={`${track.title} — ${track.artist} on Spotify`}
                className={cn(
                  buttonVariants({ variant: "default", size: "icon" }),
                  "size-8 shrink-0 rounded-xl [&_svg]:size-5",
                )}
              >
                <SpotifyIcon className="size-5" />
              </a>
            ) : null}
          </span>
        );
      },
    }),
  ]);
}

function createMobilePlaylistColumns(activeTrack: NowPlayingTrack | null) {
  return trackColumnHelper.columns([
    trackColumnHelper.display({
      id: "track",
      header: () => <span className="sr-only">Track</span>,
      cell: ({ row }) => {
        const track = row.original;
        const isActive = activeTrack ? isNowPlayingMatch(track, activeTrack) : false;
        return (
          <div className="flex max-w-full min-w-0 items-center gap-3">
            <div className="block size-11 shrink-0 overflow-hidden rounded-md bg-muted">
              <img
                src={track.artwork}
                alt=""
                width={44}
                height={44}
                loading="lazy"
                decoding="async"
                className="aspect-square size-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1 scrollbar-none overflow-x-auto overscroll-x-contain [&::-webkit-scrollbar]:hidden">
              <div className="flex min-w-max flex-col gap-0.5">
                <div className="flex items-center gap-1.5 whitespace-nowrap">
                  <span className="leading-tight font-medium whitespace-nowrap text-foreground">
                    {track.title}
                  </span>
                  {isActive ? (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-success/15 px-1.5 py-0.5 font-mono text-[10px] tracking-wide whitespace-nowrap text-success dark:text-success">
                      <span
                        className="size-1.5 animate-pulse rounded-full bg-success"
                        aria-hidden
                      />
                      Now listening
                    </span>
                  ) : null}
                </div>
                <div className="text-sm leading-tight whitespace-nowrap text-muted-foreground">
                  {track.artist}
                </div>
                {track.album ? (
                  <div className="text-xs leading-tight whitespace-nowrap text-muted-foreground/80">
                    {track.album}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        );
      },
    }),
    trackColumnHelper.display({
      id: "links",
      header: () => <span className="sr-only">Links</span>,
      cell: ({ row }) => {
        const track = row.original;
        return (
          <div className="flex flex-col items-center gap-2">
            <a
              href={track.url}
              target="_blank"
              rel="noreferrer"
              aria-label={`${track.title} — ${track.artist} on Apple Music`}
              className={cn(
                buttonVariants({ variant: "default", size: "icon" }),
                "size-9 shrink-0 rounded-xl [&_svg]:size-6",
              )}
            >
              <AppleMusicIcon className="size-6" />
            </a>
            {track.spotifyUrl ? (
              <a
                href={track.spotifyUrl}
                target="_blank"
                rel="noreferrer"
                aria-label={`${track.title} — ${track.artist} on Spotify`}
                className={cn(
                  buttonVariants({ variant: "default", size: "icon" }),
                  "size-9 shrink-0 rounded-xl [&_svg]:size-6",
                )}
              >
                <SpotifyIcon className="size-6" />
              </a>
            ) : null}
          </div>
        );
      },
    }),
  ]);
}

export function PlaylistTable({
  tracks,
  activeTrack,
  /** Cap the scroll viewport to ~20 rows and page remaining tracks in. */
  lazy = false,
  className,
}: {
  tracks: readonly PlaylistTrack[];
  activeTrack: NowPlayingTrack | null;
  lazy?: boolean;
  className?: string;
}) {
  // Build-time JSON never mutates at runtime, so the initial window is enough.
  const [visibleCount, setVisibleCount] = useState(() =>
    lazy ? Math.min(PLAYLIST_PAGE_SIZE, tracks.length) : tracks.length,
  );
  const desktopScrollRef = useRef<HTMLDivElement>(null);
  const mobileScrollRef = useRef<HTMLDivElement>(null);

  const visibleTracks = useMemo(() => tracks.slice(0, visibleCount), [tracks, visibleCount]);

  const loadMore = useCallback(() => {
    setVisibleCount((current) => Math.min(current + PLAYLIST_PAGE_SIZE, tracks.length));
  }, [tracks.length]);

  const onScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      if (!lazy || visibleCount >= tracks.length) {
        return;
      }
      const target = event.currentTarget;
      const remaining = target.scrollHeight - target.scrollTop - target.clientHeight;
      if (remaining < PLAYLIST_ROW_HEIGHT_PX * 4) {
        loadMore();
      }
    },
    [lazy, loadMore, tracks.length, visibleCount],
  );

  const desktopColumns = createPlaylistColumns(activeTrack);
  const mobileColumns = createMobilePlaylistColumns(activeTrack);

  const desktopTable = useTable({
    features: playlistTableFeatures,
    data: visibleTracks,
    columns: desktopColumns,
    getRowId: (row) => row.songId,
  });

  const mobileTable = useTable({
    features: playlistTableFeatures,
    data: visibleTracks,
    columns: mobileColumns,
    getRowId: (row) => row.songId,
  });

  const scrollClassName = cn("catalog-scroll", className);

  return (
    <div className="min-h-0">
      <div
        ref={desktopScrollRef}
        className={cn(scrollClassName, "hidden md:block")}
        onScroll={onScroll}
        style={lazy ? { maxHeight: PLAYLIST_MAX_HEIGHT_PX } : undefined}
      >
        <table className="w-full min-w-4xl border-collapse">
          <colgroup>
            <col className="w-14" />
            <col className="w-[24%]" />
            <col className="w-[18%]" />
            <col className="w-[24%]" />
            <col className="w-20" />
            <col className="w-28" />
          </colgroup>
          <thead className="bg-background">
            {desktopTable.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className={cn(
                      "relative sticky top-0 z-10 h-10 bg-background px-3 text-left align-middle text-[13px] font-semibold tracking-widest text-muted-foreground uppercase after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-border sm:px-4",
                      header.index === 0 && "pl-4 sm:pl-6 lg:pl-8",
                      header.index === headerGroup.headers.length - 1 && "pr-4 sm:pr-6 lg:pr-8",
                      header.column.id === "duration" && "text-right",
                    )}
                  >
                    {header.isPlaceholder ? null : <desktopTable.FlexRender header={header} />}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {desktopTable.getRowModel().rows.map((row) => {
              const isActive = activeTrack ? isNowPlayingMatch(row.original, activeTrack) : false;
              return (
                <tr
                  key={row.id}
                  data-state={isActive ? "selected" : undefined}
                  className={cn(
                    "group border-b border-border/70 transition-colors hover:bg-muted/35",
                    isActive && "bg-success/10 hover:bg-success/15",
                  )}
                >
                  {row.getAllCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        "max-w-65 px-3 py-2.5 align-middle text-[15px] leading-5 whitespace-normal text-foreground sm:px-4",
                        cell.column.id === "cover" && "w-14 pl-4 sm:pl-6 lg:pl-8",
                        cell.column.id === "links" && "pr-4 text-right sm:pr-6 lg:pr-8",
                      )}
                    >
                      <desktopTable.FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
        {lazy && visibleCount < tracks.length ? (
          <div className="px-4 py-3 text-center font-mono text-[11px] tracking-wide text-muted-foreground uppercase">
            Showing {visibleCount} / {tracks.length} · scroll for more
          </div>
        ) : null}
      </div>

      <div
        ref={mobileScrollRef}
        className={cn(scrollClassName, "overflow-x-hidden md:hidden")}
        onScroll={onScroll}
        style={lazy ? { maxHeight: PLAYLIST_MAX_HEIGHT_PX } : undefined}
      >
        <table className="w-full table-fixed border-collapse">
          <colgroup>
            <col className="w-[80%]" />
            <col className="w-[20%]" />
          </colgroup>
          <thead className="sr-only">
            {mobileTable.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="px-0 py-0 text-left">
                    {header.isPlaceholder ? null : <mobileTable.FlexRender header={header} />}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {mobileTable.getRowModel().rows.map((row) => {
              const isActive = activeTrack ? isNowPlayingMatch(row.original, activeTrack) : false;
              return (
                <tr
                  key={row.id}
                  data-state={isActive ? "selected" : undefined}
                  className={cn(
                    "group border-b border-border/70 transition-colors hover:bg-muted/35",
                    isActive && "bg-success/10 hover:bg-success/15",
                  )}
                >
                  {row.getAllCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        "px-3 py-3 align-middle text-[15px] leading-5 whitespace-normal text-foreground",
                        cell.column.id === "track" && "max-w-0 overflow-hidden pr-2 pl-4",
                        cell.column.id === "links" && "w-[20%] px-2 text-center",
                      )}
                    >
                      <mobileTable.FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
        {lazy && visibleCount < tracks.length ? (
          <div className="px-4 py-3 text-center font-mono text-[11px] tracking-wide text-muted-foreground uppercase">
            Showing {visibleCount} / {tracks.length} · scroll for more
          </div>
        ) : null}
      </div>
    </div>
  );
}
