import { useQuery } from "@tanstack/react-query";

import { getNowPlaying } from "../server/now-playing";

type UseNowPlayingOptions = {
  enabled?: boolean;
  refetchIntervalMs?: number;
};

export function useNowPlaying(options: UseNowPlayingOptions = {}) {
  const enabled = options.enabled ?? true;
  const refetchInterval = options.refetchIntervalMs ?? 30_000;

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
    staleTime: 20_000,
    retry: 1,
  });
}
