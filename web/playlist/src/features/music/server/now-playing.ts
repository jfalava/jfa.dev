import { createServerFn } from "@tanstack/react-start";
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
// `effect/Config`, and may appear as plain strings. The environment record
// is the I/O boundary: `lastfmEnvSchema` below decodes both shapes into
// plain trimmed strings, and anything else (e.g. an unmaterialized Effect
// `Redacted`) fails to parse and is treated as unavailable, so no secret
// ever leaks to the client.

const secretValueSchema = z.union([
  z.string().transform((value) => value.trim()),
  z
    .object({
      get: z.function({ output: z.promise(z.string()) }),
    })
    .transform(async (binding) => {
      try {
        return (await binding.get()).trim();
      } catch {
        return "";
      }
    }),
]);

const lastfmEnvSchema = z.object({
  LASTFM_API_KEY: secretValueSchema.optional(),
  LASTFM_USER: secretValueSchema.optional(),
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
  const parsed = await lastfmEnvSchema.safeParseAsync(env);
  if (!parsed.success) {
    return { apiKey: "", user: "" };
  }
  return {
    apiKey: parsed.data.LASTFM_API_KEY ?? "",
    user: parsed.data.LASTFM_USER ?? "",
  };
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
