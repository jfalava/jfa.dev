import { useQuery } from "@tanstack/react-query";

import { getNowPlaying } from "../server/now-playing";

/** How often we ping Last.fm `user.getrecenttracks`. Also seeds fake bar progress. */
export const NOW_PLAYING_REFETCH_INTERVAL_MS = 15_000;

type UseNowPlayingOptions = {
  enabled?: boolean;
  refetchIntervalMs?: number;
};

export function useNowPlaying(options: UseNowPlayingOptions = {}) {
  const enabled = options.enabled ?? true;
  const refetchInterval = options.refetchIntervalMs ?? NOW_PLAYING_REFETCH_INTERVAL_MS;

  return useQuery({
    queryKey: ["music", "now-playing"],
    queryFn: async (): Promise<import("../server/now-playing").NowPlayingResult> => {
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
    staleTime: Math.floor(refetchInterval * (2 / 3)),
    retry: 1,
  });
}
