import * as Schema from "effect/Schema";

import twentyTracksJson from "./20tracks.json" with { type: "json" };
import replay2021Json from "./replay-2021.json" with { type: "json" };
import replay2022Json from "./replay-2022.json" with { type: "json" };
import replay2023Json from "./replay-2023.json" with { type: "json" };
import replay2024Json from "./replay-2024.json" with { type: "json" };
import replay2025Json from "./replay-2025.json" with { type: "json" };

import {
  playlistSnapshotSchema,
  type PlaylistSnapshot,
  type PlaylistTrack,
} from "./playlist-schema";

/**
 * Build-time playlist registry.
 *
 * Add a playlist by:
 * 1. appending an entry to `playlistSources` in `scripts/fetch-apple-playlist.ts`
 * 2. running `bun run fetch:music` (writes `src/data/<id>.json` + `public/data/<id>.json`)
 * 3. importing the JSON here and registering it in `playlistDefinitions`
 *
 * Keep accordion order aligned with `playlistSources`.
 */
export type PlaylistDefinition = {
  /** Stable id used for anchors, search, and accordion keys. */
  id: string;
  /** Whether this playlist renders expanded by default above the accordion. */
  isDefault: boolean;
  snapshot: PlaylistSnapshot;
};

const decode = Schema.decodeUnknownSync(playlistSnapshotSchema);

const twentyTracksSnapshot = decode(twentyTracksJson);
const replay2025Snapshot = decode(replay2025Json);
const replay2024Snapshot = decode(replay2024Json);
const replay2023Snapshot = decode(replay2023Json);
const replay2022Snapshot = decode(replay2022Json);
const replay2021Snapshot = decode(replay2021Json);

const playlistDefinitions: readonly PlaylistDefinition[] = [
  {
    id: "20tracks",
    isDefault: true,
    snapshot: twentyTracksSnapshot,
  },
  {
    id: "replay-2025",
    isDefault: false,
    snapshot: replay2025Snapshot,
  },
  {
    id: "replay-2024",
    isDefault: false,
    snapshot: replay2024Snapshot,
  },
  {
    id: "replay-2023",
    isDefault: false,
    snapshot: replay2023Snapshot,
  },
  {
    id: "replay-2022",
    isDefault: false,
    snapshot: replay2022Snapshot,
  },
  {
    id: "replay-2021",
    isDefault: false,
    snapshot: replay2021Snapshot,
  },
];

export const playlists: readonly PlaylistDefinition[] = playlistDefinitions;

export const defaultPlaylist =
  playlists.find((playlist) => playlist.isDefault) ?? playlists[0];

if (!defaultPlaylist) {
  throw new Error("playlist registry is empty");
}

export const accordionPlaylists = playlists.filter((playlist) => !playlist.isDefault);

export function getPlaylistById(id: string): PlaylistDefinition | undefined {
  return playlists.find((playlist) => playlist.id === id);
}

export function playlistAnchorId(id: string): string {
  return `playlist-${id}`;
}

/** Flat track list across every registered playlist (for now-playing matching). */
export function allPlaylistTracks(): PlaylistTrack[] {
  return playlists.flatMap((playlist) => [...playlist.snapshot.tracks]);
}

// Back-compat aliases used by older imports.
export type TwentyTrack = PlaylistTrack;
export type TwentySnapshot = PlaylistSnapshot;
export const twentySnapshot = twentyTracksSnapshot;
export const twentyTracks: PlaylistTrack[] = [...twentyTracksSnapshot.tracks];
