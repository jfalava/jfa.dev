import type { TwentyTrack } from "@/data/20tracks";

import type { NowPlayingTrack } from "../server/now-playing";

function norm(value: string): string {
  const withoutParens = value.replace(/\s*\([^)]*\)/g, "");
  const withoutBrackets = withoutParens.replace(/\s*\[[^\]]*\]/g, "");
  const withoutSuffix = withoutBrackets.replace(
    /\s*-\s*(remaster|remix|edit|version|mono|stereo).*/iu,
    "",
  );
  return withoutSuffix
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .replace(/\s+/gu, " ");
}

/**
 * Fuzzy match a Last.fm now-playing track against a catalogue track.
 * Title must match; artist is a substring check to tolerate
 * "David Guetta, Dirty South" vs "David Guetta".
 */
export function isNowPlayingMatch(playlistTrack: TwentyTrack, now: NowPlayingTrack): boolean {
  const aTitle = norm(playlistTrack.title);
  const bTitle = norm(now.title);
  if (aTitle !== bTitle) {
    return false;
  }
  const aArtist = norm(playlistTrack.artist);
  const bArtist = norm(now.artist);
  return aArtist === bArtist || aArtist.includes(bArtist) || bArtist.includes(aArtist);
}

/** Convenience: find the matched track in a list, if any. */
export function findNowPlayingInList(
  tracks: TwentyTrack[],
  now: NowPlayingTrack | null | undefined,
): TwentyTrack | null {
  if (!now) {
    return null;
  }
  return tracks.find((t) => isNowPlayingMatch(t, now)) ?? null;
}
