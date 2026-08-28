import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { z } from "zod";
import type { Plugin } from "vite";

/**
 * Shared PWA web app manifest and icon set generator for mounted workers.
 *
 * Derives `start_url`, `scope`, and icon paths from the Vite `base` (mount
 * path), so a manifest is always consistent with the app's deployment path.
 * Emits `manifest.json` plus the shared icon files into the client bundle on
 * build and serves both in dev/preview servers.
 */

const DEFAULT_THEME_COLOR = "oklch(0.511 0.262 276.966)";

/** Directory holding the canonical icon set, relative to each app root. */
const DEFAULT_ICONS_DIR = path.join("common", "src", "vite", "pwa-assets");

/** Every icon file the plugin emits, with the MIME type used in dev. */
const ICON_FILES = [
  { file: "android-chrome-192x192.png", mime: "image/png" },
  { file: "android-chrome-512x512.png", mime: "image/png" },
  { file: "apple-touch-icon.png", mime: "image/png" },
  { file: "favicon-16x16.png", mime: "image/png" },
  { file: "favicon-32x32.png", mime: "image/png" },
  { file: "favicon.ico", mime: "image/x-icon" },
];

/** Subset of icons referenced from the web app manifest. */
const MANIFEST_ICONS = [
  { file: "android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
  { file: "android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
  {
    file: "favicon.ico",
    sizes: "64x64 32x32 24x24 16x16",
    type: "image/x-icon",
  },
];

const pwaManifestOptionsSchema = z.object({
  /** Full application name, e.g. "KEWEKE by JFA". */
  name: z.string().min(1),
  /** Short name shown under the home screen icon. */
  shortName: z.string().min(1),
  /** Application description. */
  description: z.string().optional(),
  /** Theme and background color; both are set to the same value. */
  themeColor: z.string().default(DEFAULT_THEME_COLOR),
  /** Display mode. */
  display: z
    .enum(["fullscreen", "standalone", "minimal-ui", "browser"])
    .default("standalone"),
  /**
   * Directory containing the icon set to emit. Defaults to the canonical set
   * in `common/src/vite/pwa-assets`, resolved relative to the app root.
   */
  iconsDir: z.string().optional(),
});

export type PwaManifestOptions = z.input<typeof pwaManifestOptionsSchema>;

type WebAppManifest = {
  name: string;
  short_name: string;
  description?: string;
  icons: Array<{ src: string; sizes: string; type: string }>;
  start_url: string;
  scope: string;
  display: string;
  theme_color: string;
  background_color: string;
};

/**
 * Normalizes a Vite base into an absolute mount path with leading and
 * trailing slashes, e.g. "/keweke/".
 */
function toMountPath(base: string): string {
  const withLeadingSlash = base.startsWith("/") ? base : `/${base}`;
  return withLeadingSlash.endsWith("/")
    ? withLeadingSlash
    : `${withLeadingSlash}/`;
}

/**
 * Locates the icon set directory, resolving the shared default against the
 * app root (web apps live one level under the repository root).
 *
 * @param configRoot - Vite `root` for the app.
 * @param iconsDir - Optional explicit directory override.
 * @returns Absolute path to the icon set directory.
 */
function resolveIconsDir(configRoot: string, iconsDir?: string): string {
  const resolved = path.resolve(
    configRoot,
    iconsDir ?? path.join("..", "..", DEFAULT_ICONS_DIR),
  );
  if (!existsSync(resolved)) {
    throw new Error(
      `pwaManifest: icon set not found at ${resolved}. Pass iconsDir to point at a directory containing ${ICON_FILES.map((icon) => icon.file).join(", ")}.`,
    );
  }
  return resolved;
}

/**
 * Vite plugin that generates the web app manifest and emits the shared icon
 * set from per-app options and the configured `base` mount path.
 *
 * @param options - Per-app manifest metadata (name, shortName, description, themeColor, iconsDir).
 * @returns Vite plugin emitting `manifest.json` and the icon files at `<mount-path>/`.
 */
export function pwaManifest(options: PwaManifestOptions): Plugin {
  const { name, shortName, description, themeColor, display, iconsDir } =
    pwaManifestOptionsSchema.parse(options);

  let mountPath = "/";
  let assetsDir = "";

  const buildManifest = (): WebAppManifest => {
    const manifest: WebAppManifest = {
      name,
      short_name: shortName,
      icons: MANIFEST_ICONS.map((icon) => ({
        src: `${mountPath}${icon.file}`,
        sizes: icon.sizes,
        type: icon.type,
      })),
      start_url: mountPath,
      scope: mountPath,
      display,
      theme_color: themeColor,
      background_color: themeColor,
    };
    if (description) {
      manifest.description = description;
    }
    return manifest;
  };

  const serveFromBundle = (
    pathname: string,
    res: {
      setHeader: (name: string, value: string) => void;
      end: (body: Buffer | string) => void;
    },
    next: () => void,
  ): void => {
    if (pathname === `${mountPath}manifest.json`) {
      res.setHeader("Content-Type", "application/manifest+json");
      res.end(JSON.stringify(buildManifest(), null, 2));
      return;
    }
    const icon = ICON_FILES.find(
      (candidate) => pathname === `${mountPath}${candidate.file}`,
    );
    if (icon) {
      res.setHeader("Content-Type", icon.mime);
      res.end(readFileSync(path.join(assetsDir, icon.file)));
      return;
    }
    next();
  };

  return {
    name: "jfa-dev:pwa-manifest",
    configResolved(config) {
      mountPath = toMountPath(config.base);
      assetsDir = resolveIconsDir(config.root, iconsDir);
    },
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "manifest.json",
        source: `${JSON.stringify(buildManifest(), null, 2)}\n`,
      });
      for (const icon of ICON_FILES) {
        this.emitFile({
          type: "asset",
          fileName: icon.file,
          source: readFileSync(path.join(assetsDir, icon.file)),
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
