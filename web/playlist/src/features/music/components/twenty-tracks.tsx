/* oxlint-disable typescript/no-unsafe-assignment */
/* oxlint-disable typescript/no-unsafe-call */
/* oxlint-disable typescript/no-unsafe-member-access */
/* oxlint-disable typescript/no-unsafe-return */
/* oxlint-disable react/no-unstable-nested-components */
import { TableCell } from "@jfa.dev/common/ui";
import { createColumnHelper, tableFeatures, useTable } from "@tanstack/react-table";

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
          className="block"
        >
          <img
            src={row.original.artwork}
            alt=""
            width={44}
            height={44}
            loading="lazy"
            decoding="async"
            className="size-11 rounded-md bg-muted object-cover"
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
              <span className="inline-flex items-center gap-1 rounded-full bg-green-500/15 px-1.5 py-0.5 font-mono text-[10px] tracking-wide text-green-700 dark:text-green-300">
                <span className="size-1.5 animate-pulse rounded-full bg-green-500" aria-hidden />
                listening
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

export function PlaylistHeader() {
  const snapshot = twentySnapshot;
  const { data: nowPlaying } = useNowPlaying();
  const activeTrack = nowPlaying?.status === "playing" ? nowPlaying.track : null;

  return (
    <header className="shrink-0 border-b border-border bg-background px-4 py-6 sm:px-6 lg:px-8">
      <p className="font-mono text-[10px] tracking-[0.12em] text-muted-foreground uppercase">playlist</p>
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
      <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <span>
          {snapshot.subtitle} · {snapshot.trackCount} tracks
        </span>
        {activeTrack ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-0.5 font-mono text-[11px] tracking-wide">
            <span className="size-2 animate-pulse rounded-full bg-green-500" aria-hidden />
            Now playing: {activeTrack.title} — {activeTrack.artist}
          </span>
        ) : nowPlaying?.status === "recent" && nowPlaying.track ? (
          <span className="font-mono text-xs tracking-wide">
            Last: {nowPlaying.track.title} — {nowPlaying.track.artist}
          </span>
        ) : null}
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        Source{" "}
        <a
          href={snapshot.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-4"
        >
          Apple Music
        </a>{" "}
        · updated {new Date(snapshot.fetchedAt).toLocaleDateString()}
      </p>
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
      <table className="w-full min-w-[56rem] border-collapse">
        <colgroup>
          <col className="w-[3.5rem]" />
          <col className="w-[26%]" />
          <col className="w-[20%]" />
          <col className="w-[26%]" />
          <col className="w-[5rem]" />
          <col className="w-[8rem]" />
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
                  isActive && "bg-green-500/10 hover:bg-green-500/15",
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
