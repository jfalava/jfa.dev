import path from "node:path";

import {
  buildMountedPaths,
  buildRobotsTxt,
  buildUrlset,
  toMountPath,
} from "./sitemap-internal.ts";

import { webPackages } from "../web-packages.ts";

import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import type { Plugin } from "vite";

/**
 * Shared sitemap generator for mounted workers.
 *
 * Discovers static routes for every package in the shared mounted-package
 * registry, then emits the same complete `sitemap.xml` from every worker.
 * Dynamic routes (`$param`, `$` splat) and API routes are excluded. Serves the
 * generated sitemap and robots.txt in dev/preview servers.
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
  /** Emits `robots.txt` alongside the sitemap. Defaults to true. */
  robots: Schema.Boolean.pipe(
    Schema.withDecodingDefaultKey(Effect.succeed(true)),
  ),
});

export type SitemapOptions = Schema.Codec.Encoded<typeof sitemapOptionsSchema>;

/** The generated sitemap artifacts for a single app. */
type SitemapFiles = {
  sitemap: string;
  robots?: string;
};

/**
 * Vite plugin that generates the shared `sitemap.xml` and `robots.txt` for a
 * mounted worker.
 *
 * @param options - Sitemap origin and robots.txt options.
 * @returns Vite plugin emitting `sitemap.xml` and optionally `robots.txt` at the mount path.
 */
export function sitemap(options: SitemapOptions = {}): Plugin {
  const { origin, robots } =
    Schema.decodeUnknownSync(sitemapOptionsSchema)(options);

  let mountPath = "/";
  let webRoot = "";

  const build = (): SitemapFiles => {
    const paths = buildMountedPaths(
      webPackages.map((webPackage) => {
        const directory =
          webPackage.path === "/" ? "landing" : webPackage.path.slice(1);
        const packageRoot = path.resolve(webRoot, directory);
        return {
          mountPath: webPackage.path,
          routesDir: path.resolve(packageRoot, "src", "routes"),
          contentDir: webPackage.sitemapContentDir
            ? path.resolve(packageRoot, webPackage.sitemapContentDir)
            : undefined,
          exclude: webPackage.sitemapExclude,
        };
      }),
    );
    const result: SitemapFiles = {
      sitemap: buildUrlset(origin, "/", paths),
    };
    if (robots) {
      const disallow = webPackages.flatMap((webPackage) =>
        (webPackage.robotsDisallow ?? []).map((routePath) =>
          webPackage.path === "/"
            ? routePath
            : `${webPackage.path}${routePath}`,
        ),
      );
      result.robots = buildRobotsTxt(origin, { disallow });
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
      [
        `${mountPath}sitemap.xml`,
        "application/xml; charset=utf-8",
        generated.sitemap,
      ],
    ];
    if (generated.robots) {
      files.push([
        `${mountPath}robots.txt`,
        "text/plain; charset=utf-8",
        generated.robots,
      ]);
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
      webRoot = path.resolve(config.root, "..");
    },
    generateBundle() {
      const generated = build();
      this.emitFile({
        type: "asset",
        fileName: "sitemap.xml",
        source: generated.sitemap,
      });
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
