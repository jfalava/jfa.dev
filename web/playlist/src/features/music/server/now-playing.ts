/* oxlint-disable anti-slop/no-unknown-parameters -- resolveSecret is the I/O boundary parser for SecretsStoreSecret|string */
/* oxlint-disable anti-slop/no-unsafe-dictionary-type -- env is `Record<string, unknown>` from cloudflare:workers */
/* oxlint-disable anti-slop/no-runtime-typeof -- branching on SecretsStoreSecret vs string is the domain contract */
/* oxlint-disable anti-slop/require-safety-comment-for-type-assertion -- SAFETY comments below cover each `as` */
/* oxlint-disable typescript/no-base-to-string -- Redacted intentionally stringifies to "<redacted>" */
/* oxlint-disable typescript/no-unnecessary-type-assertion -- narrow `unknown` env / record for `get` */
import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { z } from "zod";

const lastfmTrackSchema = z.object({
  name: z.string(),
  artist: z.object({ "#text": z.string(), mbid: z.string() }),
  album: z.object({ "#text": z.string(), mbid: z.string() }),
  image: z.array(z.object({ "#text": z.string(), size: z.string() })),
  url: z.url(),
  date: z.object({ uts: z.string(), "#text": z.string() }).optional(),
  "@attr": z.object({ nowplaying: z.string() }).optional(),
});

const lastfmRecentTracksSchema = z.object({
  recenttracks: z.object({
    track: z.array(lastfmTrackSchema),
    "@attr": z.object({
      user: z.string(),
      total: z.string(),
      page: z.string(),
      perPage: z.string(),
      totalPages: z.string(),
    }),
  }),
  error: z.number().optional(),
  message: z.string().optional(),
});

type LastfmTrack = z.output<typeof lastfmTrackSchema>;

export type NowPlayingTrack = {
  title: string;
  artist: string;
  album: string;
  url: string;
  image: string | null;
};

export type NowPlayingResult =
  | { status: "playing"; track: NowPlayingTrack }
  | { status: "recent"; track: NowPlayingTrack | null; playedAt: string | null }
  | { status: "unavailable"; reason: string };

function toTrack(track: LastfmTrack): NowPlayingTrack {
  const image =
    track.image.find((entry) => entry.size === "extralarge")?.["#text"] ??
    track.image.find((entry) => entry.size === "large")?.["#text"] ??
    track.image.at(-1)?.["#text"] ??
    null;
  return {
    title: track.name,
    artist: track.artist["#text"],
    album: track.album["#text"],
    url: track.url,
    image: image !== null && image.length > 0 ? image : null,
  };
}

// Secrets are injected via Alchemy Secrets Store. At runtime Cloudflare
// exposes them as `SecretsStoreSecret` with an async `.get()` — but for
// `alchemy dev` the values are seeded from `web/playlist/.dev.vars` via
// `effect/Config`, and may appear as plain strings. Support both shapes so
// no secret ever leaks to the client and local dev stays simple (edit
// `.dev.vars`).

async function resolveSecret(value: unknown): Promise<string> {
  if (typeof value === "string") {
    return value.trim();
  }
  if (
    value !== null &&
    typeof value === "object" &&
    "get" in value &&
    // SAFETY: `unknown` env record guaranteed to have `get` if `"get" in value` passed
        typeof (value as { get: unknown }).get === "function"
  ) {
    try {
      const raw = await (value as { get(): Promise<string> }).get();
      return typeof raw === "string" ? raw.trim() : "";
    } catch {
      return "";
    }
  }
  // Effect Redacted that wasn't materialized (shouldn't happen in prod)
  // SAFETY: Redacted intentionally stringifies to "<redacted>" for availability check
    if (
    value !== null &&
    typeof value === "object" &&
    String(value).startsWith("<redacted")
  ) {
    return "";
  }
  return "";
}

const lastfmEnvSchema = z
  .object({
    LASTFM_API_KEY: z.unknown().optional(),
    LASTFM_USER: z.unknown().optional(),
  })
  .passthrough();

/**
 * Reads server-only Last.fm bindings. Both values are secrets — nothing is
 * exposed to the client (`createServerFn` runs only on the server).
 * Supports Secrets Store (`env.*.get()`) in prod and plain strings from
 * `.dev.vars` in `alchemy dev`.
 */
async function readLastfmBindings(): Promise<{ apiKey: string; user: string }> {
  // SAFETY: `env` is untyped `unknown` from `cloudflare:workers`; safeParse validates it
    const parsed = lastfmEnvSchema.safeParse(env as Record<string, unknown>);
  if (!parsed.success) {
    return { apiKey: "", user: "" } as const;
  }
  const [apiKey, user] = await Promise.all([
    resolveSecret(parsed.data.LASTFM_API_KEY),
    resolveSecret(parsed.data.LASTFM_USER),
  ]);
  return { apiKey, user } as const;
}

export const getNowPlaying = createServerFn({ method: "GET" }).handler(
  async (): Promise<NowPlayingResult> => {
    const { apiKey, user } = await readLastfmBindings();

    if (apiKey.length === 0 || user.length === 0) {
      return { status: "unavailable", reason: "Last.fm not configured" };
    }

    const url = new URL("https://ws.audioscrobbler.com/2.0/");
    url.searchParams.set("method", "user.getrecenttracks");
    url.searchParams.set("user", user);
    url.searchParams.set("api_key", apiKey);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");
    url.searchParams.set("extended", "0");

    const response = await fetch(url, {
      headers: { "User-Agent": "jfa.dev/playlist now-playing" },
    });

    if (!response.ok) {
      return { status: "unavailable", reason: `Last.fm ${response.status}` };
    }

    const raw = await response.json();
    const parsed = lastfmRecentTracksSchema.safeParse(raw);
    if (!parsed.success) {
      return { status: "unavailable", reason: "Last.fm returned unexpected shape" };
    }
    const json = parsed.data;
    if (json.error !== undefined) {
      return { status: "unavailable", reason: json.message ?? `Last.fm error ${json.error}` };
    }

    const track = json.recenttracks.track[0];
    if (track === undefined) {
      return { status: "recent", track: null, playedAt: null };
    }

    const nowPlaying = track["@attr"]?.nowplaying === "true";
    if (nowPlaying) {
      return { status: "playing", track: toTrack(track) };
    }

    return {
      status: "recent",
      track: toTrack(track),
      playedAt: track.date?.uts ? new Date(Number(track.date.uts) * 1000).toISOString() : null,
    };
  },
);
