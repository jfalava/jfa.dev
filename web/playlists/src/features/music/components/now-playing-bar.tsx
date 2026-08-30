/* oxlint-disable react/set-state-in-effect -- scrobble progress resets on track change (derived state sync) */
import { useEffect, useState } from "react";

import { allPlaylistTracks } from "@/data/playlists";
import { useNowPlaying } from "@/features/music/hooks/use-now-playing";
import { isNowPlayingMatch } from "@/features/music/lib/match";
import { cn } from "@/lib/utils";

/**
 * Sticky Last.fm strip that mirrors `SiteHeader` gutters and branding width.
 * Sits directly under the global header and stays visible while the catalog scrolls.
 */
export function NowPlayingBar() {
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

  const catalogue = allPlaylistTracks();
  const matched = activeTrack
    ? (catalogue.find((t) => isNowPlayingMatch(t, activeTrack)) ?? null)
    : recentTrack
      ? (catalogue.find((t) => isNowPlayingMatch(t, recentTrack)) ?? null)
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
  const TitleLink = trackUrl ? "a" : "span";

  return (
    <aside
      aria-label="Now playing"
      className="now-playing-bar sticky top-11 z-20 shrink-0 bg-background"
    >
      {/* Borders stay on the playlist column only — no full-bleed line past the sides. */}
      <div className="mx-auto h-11 w-full max-w-screen-2xl border-x border-b border-border bg-background">
        <div className="flex h-full items-center justify-between gap-4 overflow-hidden px-2 sm:gap-6 sm:px-3 lg:gap-8 lg:px-4">
          {/* Left cluster mirrors SiteHeader: icon-lg gutter + brand trigger widths. */}
          <div className="flex min-w-0 items-center gap-1">
            <span className="inline-flex size-8 shrink-0" aria-hidden />
            <div className="flex w-48 min-w-0 items-center gap-2 sm:w-84 md:w-120 lg:w-xl">
              <span
                className={cn(
                  "size-2 shrink-0 rounded-full",
                  isPlaying
                    ? "animate-pulse bg-success"
                    : displayTitle
                      ? "bg-muted-foreground/40"
                      : "bg-muted-foreground/30",
                )}
                aria-hidden
              />
              <span className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
                {isLoading && !nowPlaying
                  ? "Listening…"
                  : isPlaying
                    ? "Now playing"
                    : displayTitle
                      ? "Last played"
                      : "Last.fm"}
              </span>
            </div>
          </div>

          <div className="flex min-w-0 flex-1 items-center gap-3">
            {isLoading && !nowPlaying ? (
              <>
                <div className="size-7 shrink-0 animate-pulse rounded-md bg-muted" aria-hidden />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="h-2.5 w-40 animate-pulse rounded bg-muted" />
                  <div className="h-2 w-28 animate-pulse rounded bg-muted" />
                </div>
              </>
            ) : !displayTitle ? (
              <span className="truncate font-mono text-xs tracking-wide text-muted-foreground">
                Not scrobbling anything atm
              </span>
            ) : (
              <>
                {artwork ? (
                  <TitleLink
                    {...(trackUrl ? { href: trackUrl, target: "_blank", rel: "noreferrer" } : {})}
                    className="block size-7 shrink-0 overflow-hidden rounded-md border bg-muted"
                    aria-label={displayTitle ? `${displayTitle} on Last.fm` : undefined}
                  >
                    <img
                      src={artwork}
                      alt=""
                      width={28}
                      height={28}
                      loading="lazy"
                      decoding="async"
                      className="aspect-square size-full object-cover"
                    />
                  </TitleLink>
                ) : (
                  <div className="size-7 shrink-0 rounded-md border bg-muted" aria-hidden />
                )}

                <div className="min-w-0 flex-1">
                  <TitleLink
                    {...(trackUrl ? { href: trackUrl, target: "_blank", rel: "noreferrer" } : {})}
                    className="block truncate text-sm leading-none font-semibold text-foreground hover:underline"
                  >
                    {displayTitle}
                  </TitleLink>
                  <div className="mt-0.5 truncate text-[11px] leading-none text-muted-foreground">
                    {displayArtist}
                    {displayAlbum ? ` — ${displayAlbum}` : ""}
                  </div>
                </div>

                <div className="hidden w-28 shrink-0 sm:block lg:w-40">
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full transition-[width] duration-1000 ease-linear",
                        isPlaying ? "bg-success" : "bg-muted-foreground/30",
                      )}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
