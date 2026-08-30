import { allPlaylistTracks } from "@/data/playlists";
import { useNowPlaying } from "@/features/music/hooks/use-now-playing";
import { isNowPlayingMatch } from "@/features/music/lib/match";
import { cn } from "@/lib/utils";

/**
 * Sticky Last.fm strip that mirrors `SiteHeader` gutters and branding width.
 * Status comes from the Last.fm ping with sticky "playing" grace — no fake progress bar.
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
  const isPlaying = status === "playing" && activeTrack !== null;
  const TitleLink = trackUrl ? "a" : "span";

  // Opaque tint (mix with background, not transparent) so sticky scroll never shows through.
  // Scoped to the central column only — gutters stay plain `bg-background` on the aside.
  const playingColumn =
    isPlaying && "bg-[color-mix(in_oklab,var(--success)_12%,var(--background))]";

  return (
    <aside
      aria-label="Now playing"
      data-state={isPlaying ? "selected" : undefined}
      className="now-playing-bar sticky top-11 z-20 shrink-0 bg-background"
    >
      {/* Borders + paint stay on the playlist column only — no full-bleed wash past the sides. */}
      <div
        className={cn(
          "mx-auto h-11 w-full max-w-screen-2xl border-x border-b border-border bg-background",
          playingColumn,
        )}
      >
        <div className="flex h-full items-center justify-between gap-3 overflow-hidden px-2 sm:gap-6 sm:px-3 lg:gap-8 lg:px-4">
          {/* Mobile: badge left, track right. sm+: mirror SiteHeader icon gutter + brand widths. */}
          <div className="flex min-w-0 shrink-0 items-center gap-1">
            <span className="hidden size-8 shrink-0 sm:inline-flex" aria-hidden />
            <div className="flex min-w-0 items-center gap-2 sm:w-84 md:w-120 lg:w-xl">
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
              <span
                className={cn(
                  "font-mono text-[10px] tracking-[0.14em] uppercase",
                  isPlaying ? "text-success" : "text-muted-foreground",
                )}
              >
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

          <div className="flex min-w-0 flex-1 items-center justify-end sm:justify-start">
            {isLoading && !nowPlaying ? (
              <div className="flex max-w-full min-w-0 items-center gap-2 sm:w-full sm:gap-3">
                <div className="size-7 shrink-0 animate-pulse rounded-md bg-muted" aria-hidden />
                <div className="min-w-0 flex-1">
                  <div className="h-2.5 w-48 max-w-full animate-pulse rounded bg-muted sm:hidden" />
                  <div className="hidden space-y-1 sm:block">
                    <div className="h-2.5 w-56 max-w-full animate-pulse rounded bg-muted" />
                    <div className="h-2 w-40 max-w-[70%] animate-pulse rounded bg-muted" />
                  </div>
                </div>
              </div>
            ) : !displayTitle ? (
              <span className="truncate font-mono text-xs tracking-wide text-muted-foreground">
                Not scrobbling anything atm
              </span>
            ) : (
              <div className="flex max-w-full min-w-0 flex-1 items-center gap-2 sm:gap-3">
                {artwork ? (
                  <TitleLink
                    {...(trackUrl ? { href: trackUrl, target: "_blank", rel: "noreferrer" } : {})}
                    className="block size-7 shrink-0 overflow-hidden rounded-md border bg-muted no-underline"
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
                    className="block truncate text-sm leading-none font-semibold text-foreground"
                  >
                    {displayTitle}
                    <span className="font-normal text-muted-foreground sm:hidden">
                      {displayArtist ? ` · ${displayArtist}` : ""}
                      {displayAlbum ? ` — ${displayAlbum}` : ""}
                    </span>
                  </TitleLink>
                  <div className="mt-0.5 hidden truncate text-[11px] leading-none text-muted-foreground sm:block">
                    {displayArtist}
                    {displayAlbum ? ` — ${displayAlbum}` : ""}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
