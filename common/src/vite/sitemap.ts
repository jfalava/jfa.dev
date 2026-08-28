import path from "node:path";

import {
  buildPaths,
  buildRobotsTxt,
  buildSitemapIndex,
  buildUrlset,
  toMountPath,
} from "./sitemap-internal.ts";

import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import type { Plugin } from "vite";

/**
 * Shared sitemap generator for mounted workers.
 *
 * Discovers static routes by scanning the app's TanStack file-based route
 * directory for `createFileRoute("<path>")` literals at build time, then emits
 * a `sitemap.xml` at the app's mount path (derived from the Vite `base`).
 * Dynamic routes (`$param`, `$` splat) and API routes are excluded. The app
 * mounted at `/` can additionally emit a `sitemap_index.xml` referencing every
 * mounted worker's sitemap plus a `robots.txt` pointing at the index. Serves
 * all generated files in dev/preview servers.
 */

/** Check that mirrors `z.url()`: the value must parse as an absolute URL. */
const isHttpUrl = Schema.makeFilter((url: string) =>
  url.startsWith("http://") || url.startsWith("https://") ? undefined : false,
);

const sitemapOptionsSchema = Schema.Struct({
  /** Public origin the sitemap URLs are built from. */
  origin: Schema.String.check(isHttpUrl).pipe(
    Schema.withDecodingDefaultKey(Effect.succeed("https://jfa.dev")),
  ),
  /**
   * Route path prefixes to exclude from the sitemap, e.g. ["/admin"].
   * Matches the path exactly or as a directory prefix.
   */
  exclude: Schema.Array(Schema.String).pipe(Schema.withDecodingDefaultKey(Effect.succeed([]))),
  /** Extra explicit paths (mount-relative, with leading slash) to include. */
  include: Schema.Array(Schema.String).pipe(Schema.withDecodingDefaultKey(Effect.succeed([]))),
  /**
   * Directory (relative to the app root) of MDX/MD pages whose files map to
   * additional paths, e.g. "content/docs" where `keweke/index.mdx` becomes
   * `/keweke` and `keweke/lists/create-a-list.mdx` becomes
   * `/keweke/lists/create-a-list`.
   */
  contentDir: Schema.optional(Schema.String),
  /**
   * Sibling mount paths to reference from a `sitemap_index.xml`. When set,
   * the plugin also emits `sitemap_index.xml` and a `robots.txt` pointing at
   * it. Only meaningful for the app mounted at `/`.
   */
  sitemapIndex: Schema.optional(Schema.Array(Schema.String)),
  /** Emits `robots.txt` alongside the sitemap. Defaults to true. */
  robots: Schema.Boolean.pipe(Schema.withDecodingDefaultKey(Effect.succeed(true))),
  /** Paths to disallow in the generated `robots.txt`, e.g. ["/user"]. */
  disallow: Schema.Array(Schema.String).pipe(Schema.withDecodingDefaultKey(Effect.succeed([]))),
});

export type SitemapOptions = Schema.Codec.Encoded<typeof sitemapOptionsSchema>;

/** The generated sitemap artifacts for a single app. */
type SitemapFiles = {
  sitemap: string;
  index?: string;
  robots?: string;
};

/**
 * Vite plugin that generates `sitemap.xml` for a mounted worker from its
 * TanStack file routes (plus optional MDX content pages), and optionally a
 * root `sitemap_index.xml` and `robots.txt`.
 *
 * @param options - Sitemap options (origin, exclude, include, contentDir, sitemapIndex).
 * @returns Vite plugin emitting `sitemap.xml` (and optionally the index files) at the mount path.
 */
export function sitemap(options: SitemapOptions = {}): Plugin {
  const { origin, exclude, include, contentDir, sitemapIndex, robots, disallow } =
    Schema.decodeUnknownSync(sitemapOptionsSchema)(options);

  let mountPath = "/";
  let routesDir = "";
  let resolvedContentDir: string | undefined;

  const build = (): SitemapFiles => {
    const paths = buildPaths(routesDir, resolvedContentDir, exclude, include);
    const result: SitemapFiles = {
      sitemap: buildUrlset(origin, mountPath, paths),
    };
    if (sitemapIndex) {
      result.index = buildSitemapIndex(origin, mountPath, sitemapIndex);
    }
    if (robots) {
      result.robots = buildRobotsTxt(
        origin,
        sitemapIndex ? undefined : { disallow, sitemap: `${origin}${mountPath}sitemap.xml` },
      );
    }
    return result;
  };

  const serveFromBundle = (
    pathname: string,
    res: {
      setHeader: (name: string, value: string) => void;
      end: (body: Buffer | string) => void;
    },
    next: () => void,
  ): void => {
    const generated = build();
    const files: Array<[string, string, string]> = [
      [`${mountPath}sitemap.xml`, "application/xml; charset=utf-8", generated.sitemap],
    ];
    if (generated.index) {
      files.push([
        `${mountPath}sitemap_index.xml`,
        "application/xml; charset=utf-8",
        generated.index,
      ]);
    }
    if (generated.robots) {
      files.push([`${mountPath}robots.txt`, "text/plain; charset=utf-8", generated.robots]);
    }
    for (const [file, contentType, body] of files) {
      if (pathname === file) {
        res.setHeader("Content-Type", contentType);
        res.end(body);
        return;
      }
    }
    next();
  };

  return {
    name: "jfa-dev:sitemap",
    configResolved(config) {
      mountPath = toMountPath(config.base);
      routesDir = path.resolve(config.root, "src", "routes");
      resolvedContentDir = contentDir ? path.resolve(config.root, contentDir) : undefined;
    },
    generateBundle() {
      const generated = build();
      this.emitFile({
        type: "asset",
        fileName: "sitemap.xml",
        source: generated.sitemap,
      });
      if (generated.index) {
        this.emitFile({
          type: "asset",
          fileName: "sitemap_index.xml",
          source: generated.index,
        });
      }
      if (generated.robots) {
        this.emitFile({
          type: "asset",
          fileName: "robots.txt",
          source: generated.robots,
        });
      }
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathname = new URL(req.url ?? "/", "http://localhost").pathname;
        serveFromBundle(pathname, res, next);
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathname = new URL(req.url ?? "/", "http://localhost").pathname;
        serveFromBundle(pathname, res, next);
      });
    },
  };
}
