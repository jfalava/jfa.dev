/* oxlint-disable typescript/no-unsafe-assignment */
/* oxlint-disable typescript/no-unsafe-call */
/* oxlint-disable typescript/no-unsafe-member-access */
/* oxlint-disable typescript/no-unsafe-return */
/* oxlint-disable react/no-unstable-nested-components */
/* oxlint-disable react/set-state-in-effect -- scrobble progress resets on track change (derived state sync) */
import { TableCell } from "@jfa.dev/common/ui";
import { createColumnHelper, tableFeatures, useTable } from "@tanstack/react-table";
import { useEffect, useState } from "react";

import { twentySnapshot, type TwentyTrack } from "@/data/20tracks";
import { useNowPlaying } from "@/features/music/hooks/use-now-playing";
import { isNowPlayingMatch } from "@/features/music/lib/match";
import { cn } from "@/lib/utils";

import type { NowPlayingTrack } from "../server/now-playing";

const DISPLAY_TITLE_CLASS_NAME =
  "font-sans text-4xl leading-[0.95] font-semibold tracking-tighter uppercase sm:text-6xl";

const playlistTableFeatures = tableFeatures({});

const trackColumnHelper = createColumnHelper<typeof playlistTableFeatures, TwentyTrack>();

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
        <a
          href={row.original.url}
          target="_blank"
          rel="noreferrer"
          aria-label={`${row.original.title} — ${row.original.artist} on Apple Music`}
          className="block size-11 shrink-0 overflow-hidden rounded-md bg-muted"
        >
          <img
            src={row.original.artwork}
            alt=""
            width={44}
            height={44}
            loading="lazy"
            decoding="async"
            className="aspect-square size-full object-cover"
          />
        </a>
      ),
    }),
    trackColumnHelper.accessor("title", {
      header: "Title",
      cell: ({ getValue, row }) => {
        const isActive = activeTrack ? isNowPlayingMatch(row.original, activeTrack) : false;
        return (
          <span className="inline-flex items-center gap-2">
            <a
              href={row.original.url}
              target="_blank"
              rel="noreferrer"
              className="leading-tight font-medium underline-offset-4 hover:underline"
            >
              {getValue()}
            </a>
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
      id: "preview",
      header: "Preview",
      cell: ({ row }) =>
        row.original.previewUrl ? (
          // oxlint-disable-next-line jsx-a11y/media-has-caption -- 30s preview has no captions track
          <audio controls preload="none" src={row.original.previewUrl} className="h-8 w-28" />
        ) : (
          <span className="text-xs text-muted-foreground/50">—</span>
        ),
    }),
  ]);
}

function NowPlayingWidget() {
  const { data: nowPlaying, isLoading } = useNowPlaying();

  // SAFETY: status narrows the discriminated union `NowPlayingResult`; cast is the idiomatic way to extract the branch.
  const status = nowPlaying?.status;
  const activeTrack =
    // SAFETY: narrowed by `status === "playing"` discriminated union check
    status === "playing"
      ? (nowPlaying as Extract<NonNullable<typeof nowPlaying>, { status: "playing" }>).track
      : null;
  const recentTrack =
    // SAFETY: narrowed by `status === "recent"` discriminated union check
    status === "recent"
      ? (nowPlaying as Extract<NonNullable<typeof nowPlaying>, { status: "recent" }>).track
      : null;

  const matched = activeTrack
    ? (twentySnapshot.tracks.find((t) => isNowPlayingMatch(t, activeTrack)) ?? null)
    : recentTrack
      ? (twentySnapshot.tracks.find((t) => isNowPlayingMatch(t, recentTrack)) ?? null)
      : null;

  const displayTitle = activeTrack?.title ?? recentTrack?.title ?? null;
  const displayArtist = activeTrack?.artist ?? recentTrack?.artist ?? null;
  const displayAlbum = matched?.album ?? activeTrack?.album ?? recentTrack?.album ?? null;
  const artwork = matched?.artwork ?? activeTrack?.image ?? recentTrack?.image ?? null;
  const trackUrl = matched?.url ?? activeTrack?.url ?? recentTrack?.url ?? null;
  const durationMs = matched?.durationMs ?? null;
  const isPlaying = status === "playing" && activeTrack !== null;

  const [elapsedMs, setElapsedMs] = useState<number>(() =>
    durationMs ? Math.floor(durationMs * 0.36) : 0,
  );

  useEffect(() => {
    if (durationMs) {
      setElapsedMs(Math.floor(durationMs * 0.36));
    } else {
      setElapsedMs(0);
    }
  }, [durationMs]);

  useEffect(() => {
    if (!isPlaying || !durationMs) {
      return undefined;
    }
    const id = window.setInterval(() => {
      setElapsedMs((prev) => Math.min(prev + 1000, durationMs));
    }, 1000);
    return (): void => window.clearInterval(id);
  }, [isPlaying, durationMs]);

  const progress = durationMs ? Math.min(100, (elapsedMs / durationMs) * 100) : 0;

  if (isLoading && !nowPlaying) {
    return (
      <div className="flex items-center gap-4 rounded-lg border bg-card px-4 py-4">
        <div className="size-14 animate-pulse rounded-md bg-muted sm:size-16" aria-hidden />
        <div className="min-w-0 flex-1 space-y-2.5">
          <div className="h-3 w-32 animate-pulse rounded bg-muted" />
          <div className="h-3 w-44 animate-pulse rounded bg-muted" />
          <div className="h-2 w-full animate-pulse rounded-full bg-muted" />
        </div>
      </div>
    );
  }

  if (!displayTitle) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-dashed bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        <span className="size-2 shrink-0 rounded-full bg-muted-foreground/30" aria-hidden />
        <span className="font-mono text-xs tracking-wide">Not scrobbling — play something</span>
      </div>
    );
  }

  const TitleLink = trackUrl ? "a" : "span";

  return (
    <div className="flex w-full items-center gap-4 rounded-lg border bg-card px-4 py-4 shadow-sm">
      {artwork ? (
        <TitleLink
          {...(trackUrl ? { href: trackUrl, target: "_blank", rel: "noreferrer" } : {})}
          className="block size-14 shrink-0 overflow-hidden rounded-md border bg-muted sm:size-16"
          aria-label={displayTitle ? `${displayTitle} on Last.fm` : undefined}
        >
          <img
            src={artwork}
            alt=""
            width={64}
            height={64}
            loading="lazy"
            decoding="async"
            className="aspect-square size-full object-cover"
          />
        </TitleLink>
      ) : (
        <div className="size-14 shrink-0 rounded-md border bg-muted sm:size-16" aria-hidden />
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "size-2 shrink-0 rounded-full",
              isPlaying ? "animate-pulse bg-success" : "bg-muted-foreground/40",
            )}
            aria-hidden
          />
          <span className="font-mono text-xs tracking-[0.14em] text-muted-foreground uppercase">
            {isPlaying ? "Now playing" : "Last played"}
          </span>
        </div>
        <TitleLink
          {...(trackUrl ? { href: trackUrl, target: "_blank", rel: "noreferrer" } : {})}
          className="mt-1 block truncate font-sans text-base leading-tight font-semibold text-foreground hover:underline"
        >
          {displayTitle}
        </TitleLink>
        <div className="truncate font-sans text-sm text-muted-foreground">
          {displayArtist}
          {displayAlbum ? ` — ${displayAlbum}` : ""}
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-1000 ease-linear",
              isPlaying ? "bg-success" : "bg-muted-foreground/30",
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export function PlaylistHeader() {
  const snapshot = twentySnapshot;

  return (
    <header className="shrink-0 border-b border-border bg-background px-4 py-6 sm:px-6 lg:px-8">
      <div className="margin-y-auto flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] tracking-[0.12em] text-muted-foreground uppercase">
            playlist
          </p>
          <h1 id="playlist-heading" className={`mt-2 ${DISPLAY_TITLE_CLASS_NAME}`}>
            <a
              href={snapshot.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="no-underline hover:underline"
            >
              {snapshot.title}
            </a>
          </h1>
          <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            <span>
              {snapshot.subtitle} · {snapshot.trackCount} tracks
            </span>
            <span>
              Updated{" "}
              <span className="font-mono">{new Date(snapshot.fetchedAt).toLocaleDateString()}</span>
            </span>
          </p>
        </div>
        <div className="w-full shrink-0 lg:w-130">
          <NowPlayingWidget />
        </div>
      </div>
    </header>
  );
}

export function TwentyTracksTable() {
  const snapshot = twentySnapshot;
  const { data: nowPlaying } = useNowPlaying();
  const activeTrack = nowPlaying?.status === "playing" ? nowPlaying.track : null;

  const columns = createPlaylistColumns(activeTrack);

  const table = useTable({
    features: playlistTableFeatures,
    data: snapshot.tracks,
    columns,
    getRowId: (row) => row.songId,
  });

  return (
    <div className="catalog-scroll">
      <table className="w-full min-w-4xl border-collapse">
        <colgroup>
          <col className="w-14" />
          <col className="w-[26%]" />
          <col className="w-[20%]" />
          <col className="w-[26%]" />
          <col className="w-20" />
          <col className="w-32" />
        </colgroup>
        <thead className="bg-background">
          {table.getHeaderGroups().map((headerGroup) => (
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
                  {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => {
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
                      "max-w-65 px-3 py-2.5 align-top text-[15px] leading-5 whitespace-normal text-foreground sm:px-4",
                      cell.column.id === "cover" && "w-14 pl-4 sm:pl-6 lg:pl-8",
                      cell.column.id === "preview" && "pr-4 sm:pr-6 lg:pr-8",
                    )}
                  >
                    <table.FlexRender cell={cell} />
                  </TableCell>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Back-compat for the route that still imports `TwentyTracks` as a single component.
export function TwentyTracks() {
  return (
    <>
      <PlaylistHeader />
      <div className="catalog-main min-h-0 flex-1 overflow-hidden">
        <TwentyTracksTable />
      </div>
    </>
  );
}

export default TwentyTracksTable;
