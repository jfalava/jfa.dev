#!/usr/bin/env bun
/**
 * Usage:
 *   bun run scripts/fetch-apple-playlist.ts                # writes JSON
 *   bun run scripts/fetch-apple-playlist.ts --check        # exits 1 if stale
 */
import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const PLAYLIST_ID = "pl.u-9N9LL2eI2K5oXV";
const PLAYLIST_URL = `https://music.apple.com/es/playlist/20tracks/${PLAYLIST_ID}`;
const ITUNES_LOOKUP_COUNTRY = "ES";
const OUT_PATHS = [
  resolve(import.meta.dirname, "../web/playlist/src/data/20tracks.json"),
  resolve(import.meta.dirname, "../web/playlist/public/data/20tracks.json"),
] as const;

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
    "previewUrl" | "artworkUrl100" | "primaryGenreName" | "releaseDate"
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
    const tracks: EnrichedTrack[] = base.map((t) => {
      const e = itunesMap?.get(t.songId);
      return {
        ...t,
        previewUrl: e?.previewUrl ?? null,
        artworkUrl100: e?.artworkUrl100 ?? null,
        primaryGenreName: e?.primaryGenreName ?? null,
        releaseDate: e?.releaseDate ?? null,
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
