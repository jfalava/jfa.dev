/** How often the client pings Last.fm `user.getrecenttracks`. */
export const NOW_PLAYING_REFETCH_INTERVAL_MS = 10_000;

/**
 * Prefer false positives: keep status `"playing"` through this many consecutive
 * client pings that do not confirm now-playing.
 */
export const NOW_PLAYING_STICKY_MISSES = 6;

/** Fresh scrobble timestamps within this window are treated as still playing. */
export const NOW_PLAYING_FRESH_GRACE_MS =
  NOW_PLAYING_REFETCH_INTERVAL_MS * NOW_PLAYING_STICKY_MISSES;
