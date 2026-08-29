#!/usr/bin/env bun
/**
 * Usage:
 *   bun run scripts/fetch-apple-playlist.ts                # writes JSON
 *   bun run scripts/fetch-apple-playlist.ts --check        # exits 1 if stale
 */
import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { createHmac, randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";

const PLAYLIST_ID = "pl.u-9N9LL2eI2K5oXV";
const PLAYLIST_URL = `https://music.apple.com/es/playlist/20tracks/${PLAYLIST_ID}`;
const ITUNES_LOOKUP_COUNTRY = "ES";
const OUT_PATHS = [
  resolve(import.meta.dirname, "../web/playlist/src/data/20tracks.json"),
  resolve(import.meta.dirname, "../web/playlist/public/data/20tracks.json"),
] as const;

type SpotifyMatch = { spotifyUrl: string | null; spotifyId: string | null };

type EnrichedTrack = {
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
  spotifyUrl: string | null;
  spotifyId: string | null;
};

type Snapshot = {
  fetchedAt: string;
  sourceUrl: string;
  playlistId: string;
  title: string;
  subtitle: string | null;
  trackCount: number;
  tracks: EnrichedTrack[];
};

async function fetchHtml(): Promise<string> {
  const res = await fetch(PLAYLIST_URL, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
    },
  });
  if (!res.ok) {
    throw new Error(`Apple HTML fetch failed: ${res.status} ${res.statusText}`);
  }
  return res.text();
}

function extractSerializedServerData(html: string): unknown {
  const re =
    /<script[^>]*id="serialized-server-data"[^>]*>([\s\S]*?)<\/script>/;
  const m = re.exec(html);
  if (!m) {
    throw new Error("serialized-server-data script tag not found");
  }
  return JSON.parse(m[1]) as unknown;
}

type SerializedRoot = {
  data: Array<{
    data: {
      sections: Array<{
        id: string;
        itemKind: string;
        items: Array<{
          id: string;
          title: string;
          tertiaryLinks: Array<{
            title: string;
            segue: {
              destination: {
                contentDescriptor: { identifiers: { storeAdamID: string } };
              };
            };
          }>;
          duration: number;
          contentDescriptor: {
            identifiers: { storeAdamID: string };
            url: string;
          };
          artwork: { dictionary: { url: string } };
          subtitleLinks: Array<{
            title: string;
            segue: {
              destination: {
                contentDescriptor: { identifiers: { storeAdamID: string } };
              };
            };
          }>;
          composer: string | null;
        }>;
      }>;
    };
  }>;
};

function parseTracks(root: SerializedRoot): {
  title: string;
  subtitle: string | null;
  tracks: Omit<
    EnrichedTrack,
    | "previewUrl"
    | "artworkUrl100"
    | "primaryGenreName"
    | "releaseDate"
    | "spotifyUrl"
    | "spotifyId"
  >[];
} {
  const page = root.data[0]?.data;
  if (!page) {
    throw new Error(
      "unexpected serialized-server-data shape: missing data[0].data",
    );
  }
  const trackSection = page.sections.find(
    (s) => s.itemKind === "trackLockup" || s.id.startsWith("track-list"),
  );
  if (!trackSection) {
    throw new Error("track-list section not found");
  }
  // header section holds the playlist title/subtitle
  const headerSection = page.sections.find((s) =>
    s.id.startsWith("playlist-detail-header"),
  );
  const headerItem = headerSection?.items[0] as unknown as
    | { title?: string; subtitleLinks?: Array<{ title: string }> }
    | undefined;
  const title = headerItem?.title ?? "#20tracks";
  const subtitle = headerItem?.subtitleLinks?.[0]?.title ?? null;

  const tracks = trackSection.items.map((t) => {
    const rawUrl: string = t.artwork.dictionary.url;
    const artwork = rawUrl.replace("{w}x{h}bb.{f}", "500x500bb.jpg");
    return {
      title: t.title,
      artist: t.subtitleLinks[0]?.title ?? "Unknown",
      artistId:
        t.subtitleLinks[0]?.segue.destination.contentDescriptor.identifiers
          .storeAdamID ?? null,
      album: t.tertiaryLinks[0]?.title ?? null,
      albumId:
        t.tertiaryLinks[0]?.segue.destination.contentDescriptor.identifiers
          .storeAdamID ?? null,
      songId: t.contentDescriptor.identifiers.storeAdamID,
      url: t.contentDescriptor.url,
      artwork,
      artworkRaw: rawUrl,
      durationMs: t.duration,
      composer: t.composer,
    };
  });

  return { title, subtitle, tracks };
}

function spotifyNorm(value: string): string {
  const withoutParens = value.replace(/\s*\([^)]*\)/g, "");
  const withoutBrackets = withoutParens.replace(/\s*\[[^\]]*\]/g, "");
  return withoutBrackets
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[\-‐‑‒–—―]+/gu, " ")
    .trim()
    .replace(/\s+/gu, " ");
}

// --- Anonymous Web-Player flow (no app creds, works greyed-out like open.spotify.com) ---
// Based on https://code.rifkyshre.biz.id/snippets/spotify-search — uses TOTP + clienttoken
// which is how the web player gets a token without user login or premium app.
const SPOTIFY_TOTP_SECRET =
  "376136387538459893883312310911992847112448894410210511297108";
const SPOTIFY_TOTP_VERSION = 61;
const SPOTIFY_APP_VERSION = "1.2.92.50.g97692e81";
const SPOTIFY_PARTNER_HASHES = [
  "eff59fa0a3d026b88b56fddbcf4bdfa16a186b8175a5c1a358c072e053c2e5b0",
  "21b3fe49546912ba782db5c47e9ef5a7dbd20329520ba0c7d0fcfadee671d24e",
] as const;
const SPOTIFY_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36";

function totp(tsMs: number): string {
  const counter = Math.floor(tsMs / 1000 / 30);
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(BigInt(counter));
  const digest = createHmac("sha1", Buffer.from(SPOTIFY_TOTP_SECRET, "utf8"))
    .update(buf)
    .digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const code = (digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return String(code).padStart(6, "0");
}

type SpotifyWebAuth = {
  accessToken: string;
  clientToken: string;
  expiresAtMs: number;
};

async function getSpotifyWebAuth(): Promise<SpotifyWebAuth> {
  const baseHeaders = {
    referer: "https://open.spotify.com/",
    origin: "https://open.spotify.com",
    "user-agent": SPOTIFY_UA,
    "accept-language": "en",
  };
  const now = Date.now();
  const params = new URLSearchParams({
    reason: "init",
    productType: "web-player",
    totp: totp(now),
    totpServer: totp(now),
    totpVer: String(SPOTIFY_TOTP_VERSION),
  });
  const tokenRes = await fetch(
    `https://open.spotify.com/api/token?${params.toString()}`,
    { headers: baseHeaders },
  );
  if (!tokenRes.ok) {
    const body = await tokenRes.text().catch(() => "");
    throw new Error(`Spotify web token failed: ${tokenRes.status} ${body.slice(0, 400)}`);
  }
  const tokenJson = (await tokenRes.json()) as {
    accessToken: string;
    clientId: string;
    accessTokenExpirationTimestampMs?: number;
  };
  if (!tokenJson.accessToken || !tokenJson.clientId) {
    throw new Error("Spotify web token missing accessToken/clientId");
  }
  const clientRes = await fetch("https://clienttoken.spotify.com/v1/clienttoken", {
    method: "POST",
    headers: {
      ...baseHeaders,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      client_data: {
        client_version: SPOTIFY_APP_VERSION,
        client_id: tokenJson.clientId,
        js_sdk_data: {
          device_brand: "unknown",
          device_model: "unknown",
          os: "windows",
          os_version: "NT 10.0",
          device_id: randomUUID(),
          device_type: "computer",
        },
      },
    }),
  });
  if (!clientRes.ok) {
    const body = await clientRes.text().catch(() => "");
    throw new Error(`Spotify clienttoken failed: ${clientRes.status} ${body.slice(0, 400)}`);
  }
  const clientJson = (await clientRes.json()) as {
    granted_token?: { token: string };
  };
  const clientToken = clientJson.granted_token?.token;
  if (!clientToken) {
    throw new Error("Spotify clienttoken missing granted_token.token");
  }
  return {
    accessToken: tokenJson.accessToken,
    clientToken,
    expiresAtMs:
      tokenJson.accessTokenExpirationTimestampMs ?? now + 3_000_000,
  };
}

type PartnerSearchResult = {
  data?: {
    searchV2?: {
      tracksV2?: {
        items: Array<{
          item?: {
            data?: {
              uri: string;
              name: string;
              artists?: { items: Array<{ profile?: { name?: string } }> };
            };
          };
        }>;
      };
    };
  };
} | null;

function spotifyBaseTitle(value: string): string {
  // "How Soon Is Now - Dirty South Remix" -> "How Soon Is Now"
  const dash = value.split(/\s-\s/)[0] ?? value;
  return dash.trim();
}

function scoreSpotifyMatch(
  wantTitle: string,
  wantStripped: string,
  gotName: string,
): number {
  const got = spotifyNorm(gotName);
  const gotBase = spotifyNorm(spotifyBaseTitle(gotName));
  if (got === wantTitle || got === wantStripped) {
    return 2;
  }
  if (gotBase === wantTitle || gotBase === wantStripped) {
    return 1;
  }
  if (got.includes(wantTitle) || wantTitle.includes(got)) {
    return 0;
  }
  if (gotBase.includes(wantTitle) || wantTitle.includes(gotBase)) {
    return 0;
  }
  return -1;
}

async function enrichWithSpotify(
  tracks: Array<{ songId: string; title: string; artist: string }>,
  initialAuth: SpotifyWebAuth,
): Promise<Map<string, SpotifyMatch>> {
  let auth = initialAuth;
  const baseHeaders = {
    referer: "https://open.spotify.com/",
    origin: "https://open.spotify.com",
    "user-agent": SPOTIFY_UA,
    "accept-language": "en",
  };

  async function partnerSearch(
    searchTerm: string,
    hash: string,
  ): Promise<PartnerSearchResult> {
    const params = new URLSearchParams({
      operationName: "searchDesktop",
      variables: JSON.stringify({
        searchTerm,
        offset: 0,
        limit: 5,
        numberOfTopResults: 5,
        includeAudiobooks: false,
      }),
      extensions: JSON.stringify({
        persistedQuery: { version: 1, sha256Hash: hash },
      }),
    });
    const url = `https://api-partner.spotify.com/pathfinder/v1/query?${params.toString()}`;
    const doFetch = async (): Promise<Response> =>
      fetch(url, {
        headers: {
          ...baseHeaders,
          accept: "application/json",
          "app-platform": "WebPlayer",
          authorization: `Bearer ${auth.accessToken}`,
          "client-token": auth.clientToken,
          "spotify-app-version": SPOTIFY_APP_VERSION,
        },
      });
    let res = await doFetch();
    if (res.status === 401) {
      // Token expired — refresh once via TOTP.
      auth = await getSpotifyWebAuth();
      res = await doFetch();
    }
    if (res.status === 429) {
      await new Promise<void>((r) => setTimeout(r, 1800));
      res = await doFetch();
    }
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Spotify partner search ${res.status} for "${searchTerm}": ${body.slice(0, 300)}`);
    }
    const json = (await res.json()) as PartnerSearchResult & { errors?: unknown };
    // PersistedQueryNotFound is returned as 200 with errors array — bubble as throw to try next hash.
    if ((json as { errors?: Array<{ message?: string }> })?.errors?.length) {
      const msg = JSON.stringify((json as { errors?: unknown }).errors).slice(0, 300);
      throw new Error(`Spotify partner errors for "${searchTerm}": ${msg}`);
    }
    return json;
  }

  const map = new Map<string, SpotifyMatch>();
  for (const t of tracks) {
    const strippedTitle = t.title.replace(/\s*\([^)]*\)/g, "").trim();
    const wantTitle = spotifyNorm(t.title);
    const wantStripped = spotifyNorm(strippedTitle);
    const candidates = Array.from(
      new Set(
        [
          `${t.title} ${t.artist}`,
          `${strippedTitle} ${t.artist}`,
          t.title,
          strippedTitle,
        ].map((s) => s.trim()).filter(Boolean),
      ),
    );

    let bestMatch: SpotifyMatch | null = null;
    let bestScore = -1;
    let foundExact = false;

    for (const term of candidates) {
      if (foundExact) {
        break;
      }
      for (const hash of SPOTIFY_PARTNER_HASHES) {
        let json: PartnerSearchResult | null = null;
        try {
          json = await partnerSearch(term, hash);
        } catch {
          continue;
        }
        const items = json?.data?.searchV2?.tracksV2?.items ?? [];
        for (const it of items) {
          const data = it.item?.data;
          if (!data?.uri || !data?.name) {
            continue;
          }
          const score = scoreSpotifyMatch(wantTitle, wantStripped, data.name);
          if (score < 0) {
            continue;
          }
          if (score > bestScore) {
            const id = data.uri.split(":")[2] ?? null;
            bestScore = score;
            bestMatch = {
              spotifyUrl: id ? `https://open.spotify.com/track/${id}` : null,
              spotifyId: id,
            };
            if (score === 2) {
              foundExact = true;
              break;
            }
          }
        }
        if (foundExact) {
          break;
        }
        // Small pause between hashes for same term.
        await new Promise<void>((r) => setTimeout(r, 90));
      }
      // Between candidate terms.
      await new Promise<void>((r) => setTimeout(r, 180));
      if (foundExact) {
        break;
      }
    }

    map.set(t.songId, bestMatch ?? { spotifyUrl: null, spotifyId: null });
    // Be nice to Spotify — 20 tracks overall stays well under partner limits.
    await new Promise<void>((r) => setTimeout(r, 220));
  }
  return map;
}

async function enrichWithItunes(
  tracks: Array<{ songId: string }>,
): Promise<
  Map<
    string,
    {
      previewUrl: string | null;
      artworkUrl100: string | null;
      primaryGenreName: string | null;
      releaseDate: string | null;
    }
  >
> {
  const ids = tracks.map((t) => t.songId).join(",");
  const url = `https://itunes.apple.com/lookup?id=${ids}&country=${ITUNES_LOOKUP_COUNTRY}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "jfa.dev playlist fetcher",
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    throw new Error(`iTunes lookup failed: ${res.status}`);
  }
  const json = (await res.json()) as {
    resultCount: number;
    results: Array<{
      trackId: number;
      previewUrl?: string;
      artworkUrl100?: string;
      primaryGenreName?: string;
      releaseDate?: string;
    }>;
  };
  const map = new Map<
    string,
    {
      previewUrl: string | null;
      artworkUrl100: string | null;
      primaryGenreName: string | null;
      releaseDate: string | null;
    }
  >();
  for (const r of json.results) {
    map.set(String(r.trackId), {
      previewUrl: r.previewUrl ?? null,
      artworkUrl100: r.artworkUrl100 ?? null,
      primaryGenreName: r.primaryGenreName ?? null,
      releaseDate: r.releaseDate ?? null,
    });
  }
  return map;
}

function writeSnapshot(snapshot: Snapshot): void {
  const text = `${JSON.stringify(snapshot, null, 2)}\n`;
  for (const p of OUT_PATHS) {
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, text, "utf8");
    console.log(`✅ wrote ${p} (${snapshot.tracks.length} tracks)`);
  }
}

async function main(): Promise<void> {
  const checkOnly = process.argv.includes("--check");
  try {
    const html = await fetchHtml();
    const raw = extractSerializedServerData(html) as SerializedRoot;
    const { title, subtitle, tracks: base } = parseTracks(raw);
    let itunesMap: Map<
      string,
      {
        previewUrl: string | null;
        artworkUrl100: string | null;
        primaryGenreName: string | null;
        releaseDate: string | null;
      }
    > | null = null;
    try {
      itunesMap = await enrichWithItunes(base);
      console.log(`✅ iTunes enrichment: ${itunesMap.size}/${base.length}`);
    } catch (error) {
      console.warn(
        "⚠️  iTunes enrichment failed, continuing without previewUrl",
        error,
      );
    }
    // Spotify enrichment — anonymous web-player flow, no app/SECRET needed (same as open.spotify.com / Android).
    // Fail-open: if Spotify is unreachable we keep Apple-only snapshot.
    let spotifyMap: Map<string, SpotifyMatch> | null = null;
    try {
      const webAuth = await getSpotifyWebAuth();
      spotifyMap = await enrichWithSpotify(base, webAuth);
      const hits = [...spotifyMap.values()].filter((v) => v.spotifyUrl).length;
      console.log(`✅ Spotify enrichment (web-player): ${hits}/${base.length}`);
    } catch (error) {
      console.warn("⚠️  Spotify enrichment failed, continuing without spotifyUrl", error);
    }
    const tracks: EnrichedTrack[] = base.map((t) => {
      const e = itunesMap?.get(t.songId);
      const s = spotifyMap?.get(t.songId);
      return {
        ...t,
        previewUrl: e?.previewUrl ?? null,
        artworkUrl100: e?.artworkUrl100 ?? null,
        primaryGenreName: e?.primaryGenreName ?? null,
        releaseDate: e?.releaseDate ?? null,
        spotifyUrl: s?.spotifyUrl ?? null,
        spotifyId: s?.spotifyId ?? null,
      };
    });
    const snapshot: Snapshot = {
      fetchedAt: new Date().toISOString(),
      sourceUrl: PLAYLIST_URL,
      playlistId: PLAYLIST_ID,
      title,
      subtitle,
      trackCount: tracks.length,
      tracks,
    };
    if (checkOnly) {
      // compare with existing file if present
      const primary = OUT_PATHS[0];
      if (existsSync(primary)) {
        const cur = JSON.parse(
          readFileSync(primary, "utf8") as string,
        ) as Snapshot;
        if (JSON.stringify(cur.tracks) === JSON.stringify(tracks)) {
          console.log("✅ --check: up to date");
          return;
        }
        console.error(
          "❌ --check: local snapshot is stale (track data differs)",
        );
        process.exitCode = 1;
        return;
      }
      console.error("❌ --check: no snapshot found");
      process.exitCode = 1;
      return;
    }
    writeSnapshot(snapshot);
  } catch (error) {
    const primary = OUT_PATHS[0];
    if (existsSync(primary)) {
      console.warn("⚠️  fetch failed, keeping last committed snapshot:", error);
      if (checkOnly) {
        process.exitCode = 1;
        return;
      }
      // do not overwrite, exit 0 so CI build keeps going
      return;
    }
    console.error("❌ fetch failed and no snapshot exists:", error);
    throw error;
  }
}

await main();
