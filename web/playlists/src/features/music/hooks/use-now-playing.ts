/* oxlint-disable react/set-state-in-effect -- sticky now-playing holds across flaky Last.fm pings */
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import {
  NOW_PLAYING_FRESH_GRACE_MS,
  NOW_PLAYING_REFETCH_INTERVAL_MS,
  NOW_PLAYING_STICKY_MISSES,
} from "../lib/now-playing-timing";
import { getNowPlaying } from "../server/now-playing";
import type { NowPlayingResult, NowPlayingTrack } from "../server/now-playing";

export {
  NOW_PLAYING_FRESH_GRACE_MS,
  NOW_PLAYING_REFETCH_INTERVAL_MS,
  NOW_PLAYING_STICKY_MISSES,
} from "../lib/now-playing-timing";

type UseNowPlayingOptions = {
  enabled?: boolean;
  refetchIntervalMs?: number;
};

type StickyPlaying = {
  track: NowPlayingTrack;
  misses: number;
};

function sameTrack(a: NowPlayingTrack, b: NowPlayingTrack): boolean {
  return (
    a.title.localeCompare(b.title, undefined, { sensitivity: "accent" }) === 0 &&
    a.artist.localeCompare(b.artist, undefined, { sensitivity: "accent" }) === 0
  );
}

function isFreshPlayedAt(playedAt: string | null, nowMs: number): boolean {
  if (playedAt === null) {
    return false;
  }
  const playedMs = Date.parse(playedAt);
  if (Number.isNaN(playedMs)) {
    return false;
  }
  return nowMs - playedMs <= NOW_PLAYING_FRESH_GRACE_MS;
}

export function useNowPlaying(options: UseNowPlayingOptions = {}) {
  const enabled = options.enabled ?? true;
  const refetchInterval = options.refetchIntervalMs ?? NOW_PLAYING_REFETCH_INTERVAL_MS;
  const [sticky, setSticky] = useState<StickyPlaying | null>(null);

  const query = useQuery({
    queryKey: ["music", "now-playing"],
    queryFn: async (): Promise<NowPlayingResult> => {
      const result = await getNowPlaying();
      // TanStack Query forbids `undefined` – server function manifest mismatch (stale
      // `.tanstack` cache) can briefly resolve to `undefined` on HMR.
      if (!result) {
        return { status: "unavailable", reason: "Last.fm not configured" };
      }
      return result;
    },
    enabled,
    refetchInterval,
    staleTime: Math.floor(refetchInterval / 2),
    placeholderData: keepPreviousData,
    retry: 1,
    refetchOnWindowFocus: true,
  });

  // Hold "playing" across flaky Last.fm pings; prefer false positives mid-song.
  useEffect(() => {
    const raw = query.data;
    if (!raw) {
      return;
    }

    if (raw.status === "playing") {
      setSticky({ track: raw.track, misses: 0 });
      return;
    }

    if (raw.status === "recent" && raw.track !== null) {
      const recentTrack = raw.track;
      const fresh = isFreshPlayedAt(raw.playedAt, Date.now());
      setSticky((prev) => {
        // Same track still topping recenttracks: refresh while scrobble is fresh,
        // otherwise age out through the miss budget (avoid forever-"playing").
        if (prev !== null && sameTrack(prev.track, recentTrack)) {
          if (fresh) {
            return { track: recentTrack, misses: 0 };
          }
          const misses = prev.misses + 1;
          return misses < NOW_PLAYING_STICKY_MISSES ? { track: recentTrack, misses } : null;
        }

        if (prev === null) {
          return null;
        }

        const misses = prev.misses + 1;
        return misses < NOW_PLAYING_STICKY_MISSES ? { track: prev.track, misses } : null;
      });
      return;
    }

    // unavailable / empty recent — hold the last playing track for a few pings
    setSticky((prev) => {
      if (prev === null) {
        return null;
      }
      const misses = prev.misses + 1;
      return misses < NOW_PLAYING_STICKY_MISSES ? { track: prev.track, misses } : null;
    });
  }, [query.data]);

  const data = useMemo((): NowPlayingResult | undefined => {
    const raw = query.data;

    if (raw?.status === "playing") {
      return raw;
    }

    // Prefer false positives: keep sticky track as playing through miss budget.
    if (sticky !== null) {
      return { status: "playing", track: sticky.track };
    }

    return raw;
  }, [query.data, sticky]);

  return { ...query, data };
}
