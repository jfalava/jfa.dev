import { createServerFn } from "@tanstack/react-start";
import * as Effect from "effect/Effect";
import * as Result from "effect/Result";
import * as Schema from "effect/Schema";
import * as SchemaGetter from "effect/SchemaGetter";

const lastfmTrackSchema = Schema.Struct({
  name: Schema.String,
  artist: Schema.Struct({ "#text": Schema.String, mbid: Schema.String }),
  album: Schema.Struct({ "#text": Schema.String, mbid: Schema.String }),
  image: Schema.Array(Schema.Struct({ "#text": Schema.String, size: Schema.String })),
  url: Schema.String,
  date: Schema.optional(Schema.Struct({ uts: Schema.String, "#text": Schema.String })),
  "@attr": Schema.optional(Schema.Struct({ nowplaying: Schema.String })),
});

const lastfmRecentTracksSchema = Schema.Struct({
  recenttracks: Schema.Struct({
    track: Schema.Array(lastfmTrackSchema),
    "@attr": Schema.Struct({
      user: Schema.String,
      total: Schema.String,
      page: Schema.String,
      perPage: Schema.String,
      totalPages: Schema.String,
    }),
  }),
  error: Schema.optional(Schema.Number),
  message: Schema.optional(Schema.String),
});

type LastfmTrack = Schema.Schema.Type<typeof lastfmTrackSchema>;

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

/** Plain string binding; the value is trimmed on decode. */
const trimmedString = Schema.String.pipe(
  Schema.decode({
    decode: SchemaGetter.transform((value: string) => value.trim()),
    encode: SchemaGetter.transform((value: string) => value),
  }),
);

/** Secrets Store binding (`env.*.get()`), resolved to a trimmed string. */
const secretBindingSchema = Schema.Struct({ get: Schema.Any });

const secretFromBinding = Schema.decodeTo<typeof Schema.String, typeof secretBindingSchema>(
  Schema.String,
  {
    decode: SchemaGetter.transformOrFail((binding: { readonly get: unknown }) =>
      Effect.promise(async () => {
        try {
          // SAFETY: Secrets Store bindings are exactly `{ get(): Promise<string> }`
          return (await (binding.get as () => Promise<string>)()).trim();
        } catch {
          return "";
        }
      }),
    ),
    encode: SchemaGetter.transform((value: string) => ({
      get: () => Promise.resolve(value),
    })),
  },
)(secretBindingSchema);

/**
 * Secrets are injected via Alchemy Secrets Store. At runtime Cloudflare
 * exposes them as `SecretsStoreSecret` with an async `.get()` — but for
 * `alchemy dev` the values are seeded from `web/playlist/.dev.vars` via
 * `effect/Config`, and may appear as plain strings. The environment record
 * is the I/O boundary: `secretValueSchema` below decodes both shapes into
 * plain trimmed strings, and anything else (e.g. an unmaterialized Effect
 * `Redacted`) fails to decode and is treated as unavailable, so no secret
 * ever leaks to the client.
 */
const secretValueSchema = Schema.Union([trimmedString, secretFromBinding]);

const lastfmEnvSchema = Schema.Struct({
  LASTFM_API_KEY: Schema.optional(secretValueSchema),
  LASTFM_USER: Schema.optional(secretValueSchema),
});

async function loadServerEnv() {
  // Workerd (alchemy dev / prod): the real `cloudflare:workers` env, whose
  // secrets are Secrets Store bindings.
  try {
    // @vite-ignore — `cloudflare:workers` only exists in workerd, not in plain Vite dev (5173)
    return (await import("cloudflare:workers")).env;
  } catch {
    // Vite dev (5173) or any Node fallback: `process.env`, populated from
    // `web/playlist/.dev.vars` via `iac/src/workers.ts:loadDevVarsForLocal`
    // (alchemy dev) or from Vite's own `web/playlist/vite.config.ts` dev-vars loader.
    return globalThis.process?.env ?? null;
  }
}

/**
 * Reads server-only Last.fm bindings and decodes them to plain strings.
 * Both values are secrets — nothing is exposed to the client
 * (`createServerFn` runs only on the server). Supports Secrets Store
 * (`env.*.get()`) in prod and plain strings from `.dev.vars` in
 * `alchemy dev` / Vite dev.
 */
async function readLastfmBindings(): Promise<{ apiKey: string; user: string }> {
  const env = await loadServerEnv();
  if (env === null) {
    return { apiKey: "", user: "" };
  }
  // The bindings are untyped on `Env` (Secrets Store keys are not declared);
  // `lastfmEnvSchema` is the narrowing boundary and strips every other key
  // before the values reach the handler.
  const { LASTFM_API_KEY, LASTFM_USER } = await Schema.decodeUnknownPromise(lastfmEnvSchema)(env);
  return { apiKey: LASTFM_API_KEY ?? "", user: LASTFM_USER ?? "" };
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
    const parsed = Schema.decodeUnknownResult(lastfmRecentTracksSchema)(raw);
    if (Result.isFailure(parsed)) {
      return { status: "unavailable", reason: "Last.fm returned unexpected shape" };
    }
    const json = parsed.success;
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
