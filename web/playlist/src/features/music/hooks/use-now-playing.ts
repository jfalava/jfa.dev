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
    queryFn: () => getNowPlaying(),
    enabled,
    refetchInterval,
    staleTime: 20_000,
    retry: 1,
  });
}
