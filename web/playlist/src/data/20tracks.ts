import * as Schema from "effect/Schema";

import snapshot from "./20tracks.json" with { type: "json" };

/** Check that mirrors `z.url()`: the value must parse as an absolute URL. */
const isHttpUrl = Schema.makeFilter((url: string) =>
  url.startsWith("http://") || url.startsWith("https://") ? undefined : false,
);

export type TwentyTrack = Schema.Schema.Type<typeof twentyTrackSchema>;
export type TwentySnapshot = Schema.Schema.Type<typeof twentySnapshotSchema>;

const twentyTrackSchema = Schema.Struct({
  title: Schema.String,
  artist: Schema.String,
  artistId: Schema.NullOr(Schema.String),
  album: Schema.NullOr(Schema.String),
  albumId: Schema.NullOr(Schema.String),
  songId: Schema.String,
  url: Schema.String.check(isHttpUrl),
  artwork: Schema.String.check(isHttpUrl),
  artworkRaw: Schema.String,
  durationMs: Schema.Number,
  composer: Schema.NullOr(Schema.String),
  previewUrl: Schema.NullOr(Schema.String),
  artworkUrl100: Schema.NullOr(Schema.String),
  primaryGenreName: Schema.NullOr(Schema.String),
  releaseDate: Schema.NullOr(Schema.String),
});

const twentySnapshotSchema = Schema.Struct({
  fetchedAt: Schema.String,
  sourceUrl: Schema.String.check(isHttpUrl),
  playlistId: Schema.String,
  title: Schema.String,
  subtitle: Schema.NullOr(Schema.String),
  trackCount: Schema.Number,
  tracks: Schema.Array(twentyTrackSchema),
});

export const twentySnapshot: TwentySnapshot =
  Schema.decodeUnknownSync(twentySnapshotSchema)(snapshot);
export const twentyTracks: TwentyTrack[] = [...twentySnapshot.tracks];
