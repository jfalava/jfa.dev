/* oxlint-disable typescript/no-unsafe-assignment */
/* oxlint-disable typescript/no-unsafe-call */
/* oxlint-disable typescript/no-unsafe-member-access */
/* oxlint-disable typescript/no-unsafe-return */
/* oxlint-disable react/no-unstable-nested-components */
/* oxlint-disable react/set-state-in-effect -- scrobble progress resets on track change (derived state sync) */
import { buttonVariants, TableCell } from "@jfa.dev/common/ui";
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

function AppleMusicIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <path d="m24 6.124c0-.029.001-.063.001-.097 0-.743-.088-1.465-.253-2.156l.013.063c-.312-1.291-1.1-2.359-2.163-3.031l-.02-.012c-.536-.35-1.168-.604-1.847-.723l-.03-.004c-.463-.084-1.003-.138-1.553-.15h-.011c-.04 0-.083-.01-.124-.013h-12.025c-.152.01-.3.017-.455.026-.791.016-1.542.161-2.242.415l.049-.015c-1.306.501-2.327 1.495-2.853 2.748l-.012.033c-.17.409-.297.885-.36 1.38l-.003.028c-.051.343-.087.751-.1 1.165v.016c0 .032-.007.062-.01.093v12.224c.01.14.017.283.027.424.02.861.202 1.673.516 2.416l-.016-.043c.609 1.364 1.774 2.387 3.199 2.792l.035.009c.377.111.817.192 1.271.227l.022.001c.555.053 1.11.06 1.667.06h11.028c.554 0 1.099-.037 1.633-.107l-.063.007c.864-.096 1.645-.385 2.321-.823l-.021.013c.825-.539 1.47-1.29 1.867-2.176l.013-.032c.166-.383.295-.829.366-1.293l.004-.031c.084-.539.132-1.161.132-1.794 0-.086-.001-.171-.003-.256v.013q0-5.7 0-11.394zm-6.424 3.99v5.712c.001.025.001.054.001.083 0 .407-.09.794-.252 1.14l.007-.017c-.273.562-.771.979-1.373 1.137l-.015.003c-.316.094-.682.156-1.06.173h-.01c-.029.002-.062.002-.096.002-1.033 0-1.871-.838-1.871-1.871 0-.741.431-1.382 1.056-1.685l.011-.005c.293-.14.635-.252.991-.32l.027-.004c.378-.082.758-.153 1.134-.24.264-.045.468-.252.51-.513v-.003c.013-.057.02-.122.02-.189 0-.002 0-.003 0-.005q0-2.723 0-5.443c-.001-.066-.01-.13-.027-.19l.001.005c-.026-.134-.143-.235-.283-.235-.006 0-.012 0-.018.001h.001c-.178.013-.34.036-.499.07l.024-.004q-1.14.225-2.28.456l-3.7.748c-.016 0-.032.01-.048.013-.222.03-.392.219-.392.447 0 .015.001.03.002.045v-.002.13q0 3.9 0 7.801c.001.028.001.062.001.095 0 .408-.079.797-.224 1.152l.007-.021c-.264.614-.792 1.072-1.436 1.235l-.015.003c-.319.096-.687.158-1.067.172h-.008c-.031.002-.067.003-.104.003-.913 0-1.67-.665-1.815-1.536l-.001-.011c-.02-.102-.031-.218-.031-.338 0-.785.485-1.458 1.172-1.733l.013-.004c.315-.127.687-.234 1.072-.305l.036-.005c.287-.06.575-.116.86-.177.341-.05.6-.341.6-.693 0-.007 0-.015 0-.022v.001-.15q0-4.44 0-8.883c0-.002 0-.004 0-.007 0-.129.015-.254.044-.374l-.002.011c.066-.264.277-.466.542-.517l.004-.001c.255-.066.515-.112.774-.165.733-.15 1.466-.3 2.2-.444l2.27-.46c.67-.134 1.34-.27 2.01-.4.181-.042.407-.079.637-.104l.027-.002c.018-.002.04-.004.061-.004.27 0 .489.217.493.485.008.067.012.144.012.222v.001q0 2.865 0 5.732z" />
    </svg>
  );
}

function SpotifyIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <g fill="currentColor" transform="translate(-140 -7479)">
        <g transform="translate(56 160)">
          <path d="M99.915,7327.865 C96.692,7325.951 91.375,7325.775 88.297,7326.709 C87.803,7326.858 87.281,7326.58 87.131,7326.085 C86.981,7325.591 87.26,7325.069 87.754,7324.919 C91.287,7323.846 97.159,7324.053 100.87,7326.256 C101.314,7326.52 101.46,7327.094 101.196,7327.538 C100.934,7327.982 100.358,7328.129 99.915,7327.865 Z M99.81,7330.7 C99.584,7331.067 99.104,7331.182 98.737,7330.957 C96.05,7329.305 91.952,7328.827 88.773,7329.792 C88.36,7329.916 87.925,7329.684 87.8,7329.272 C87.676,7328.86 87.908,7328.425 88.32,7328.3 C91.951,7327.198 96.466,7327.732 99.553,7329.629 C99.92,7329.854 100.035,7330.334 99.81,7330.7 Z M98.586,7333.423 C98.406,7333.717 98.023,7333.81 97.729,7333.63 C95.381,7332.195 92.425,7331.871 88.944,7332.666 C88.609,7332.743 88.274,7332.533 88.198,7332.197 C88.121,7331.862 88.33,7331.528 88.667,7331.451 C92.476,7330.58 95.743,7330.955 98.379,7332.566 C98.673,7332.746 98.766,7333.129 98.586,7333.423 Z M94,7319 C88.477,7319 84,7323.477 84,7329 C84,7334.523 88.477,7339 94,7339 C99.523,7339 104,7334.523 104,7329 C104,7323.478 99.523,7319.001 94,7319.001 Z" />
        </g>
      </g>
    </svg>
  );
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
            {/* Fixed-size horizontally-scrollable area: no page overflow, all text reachable via swipe */}
            <div className="min-w-0 flex-1 [scrollbar-width:none] overflow-x-auto overscroll-x-contain [&::-webkit-scrollbar]:hidden">
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
        <span className="font-mono text-xs tracking-wide">Not scrobbling anything atm</span>
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

  const desktopColumns = createPlaylistColumns(activeTrack);
  const mobileColumns = createMobilePlaylistColumns(activeTrack);

  const desktopTable = useTable({
    features: playlistTableFeatures,
    data: snapshot.tracks,
    columns: desktopColumns,
    getRowId: (row) => row.songId,
  });

  const mobileTable = useTable({
    features: playlistTableFeatures,
    data: snapshot.tracks,
    columns: mobileColumns,
    getRowId: (row) => row.songId,
  });

  return (
    <>
      {/* Desktop: full 6-column table (cover, title, artist, album, length, preview) */}
      <div className="catalog-scroll hidden md:block">
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
                        "max-w-65 px-3 py-2.5 align-top text-[15px] leading-5 whitespace-normal text-foreground sm:px-4",
                        cell.column.id === "cover" && "w-14 pl-4 sm:pl-6 lg:pl-8",
                        cell.column.id === "preview" && "pr-4 sm:pr-6 lg:pr-8",
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
      </div>

      {/* Mobile: 2-column compact view — track info (cover+title+artist+album) + Apple Music link */}
      <div className="catalog-scroll overflow-x-hidden md:hidden">
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
      </div>
    </>
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
