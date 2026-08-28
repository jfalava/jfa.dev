import { z } from "zod";

import snapshot from "./20tracks.json" with { type: "json" };

export type TwentyTrack = {
  title: string;
  artist: string;
  artistId: string | null;
  album: string | null;
  albumId: string | null;
  songId: string;
  url: string;
  artwork: string;
  artworkRaw: string;
  durationMs: number;
  composer: string | null;
  previewUrl: string | null;
  artworkUrl100: string | null;
  primaryGenreName: string | null;
  releaseDate: string | null;
};

export type TwentySnapshot = {
  fetchedAt: string;
  sourceUrl: string;
  playlistId: string;
  title: string;
  subtitle: string | null;
  trackCount: number;
  tracks: TwentyTrack[];
};

const twentyTrackSchema: z.ZodType<TwentyTrack> = z.object({
  title: z.string(),
  artist: z.string(),
  artistId: z.string().nullable(),
  album: z.string().nullable(),
  albumId: z.string().nullable(),
  songId: z.string(),
  url: z.url(),
  artwork: z.url(),
  artworkRaw: z.string(),
  durationMs: z.number(),
  composer: z.string().nullable(),
  previewUrl: z.string().nullable(),
  artworkUrl100: z.string().nullable(),
  primaryGenreName: z.string().nullable(),
  releaseDate: z.string().nullable(),
});

const twentySnapshotSchema: z.ZodType<TwentySnapshot> = z.object({
  fetchedAt: z.string(),
  sourceUrl: z.url(),
  playlistId: z.string(),
  title: z.string(),
  subtitle: z.string().nullable(),
  trackCount: z.number(),
  tracks: z.array(twentyTrackSchema),
});

export const twentySnapshot: TwentySnapshot = twentySnapshotSchema.parse(snapshot);
export const twentyTracks: TwentyTrack[] = twentySnapshot.tracks;
