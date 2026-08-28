import { toMountPath } from "./sitemap-internal.ts";

import type { Plugin } from "vite";
import { z } from "zod";

/**
 * Shared root-route head metadata generator for TanStack Start workers.
 *
 * Each app declares its site metadata once in `vite.config.ts`; the plugin
 * computes the full root-route `head()` output (title, description, Open
 * Graph, Twitter card, canonical URL, rel=me identity links, and optional
 * PWA links) at build time and inlines it via `define`. The app's root route
 * then imports `siteHead()` from `@jfa.dev/common/site-head` and returns it.
 * Child routes keep overriding any entry through TanStack Router's normal
 * head merging, exactly as they do today.
 */

const DEFAULT_ORIGIN = "https://jfa.dev";
const DEFAULT_THEME_COLOR = "oklch(0.511 0.262 276.966)";
const AUTHOR = "Jorge Fernando Álava";
const SITE_NAME = "JFA";

/** Identity URLs every worker advertises via rel=me. */
const REL_ME_URLS = ["https://github.com/jfalava"] as const;

const siteMetaOptionsSchema = z.object({
  /** Page title; also used for og:title and twitter:title. */
  title: z.string().min(1),
  /** Page description; also used for og:description and twitter:description. */
  description: z.string().min(1),
  /** Public origin canonical URLs are built from. */
  origin: z.url().default(DEFAULT_ORIGIN),
  /** Viewport meta content; defaults to "width=device-width, initial-scale=1". */
  viewport: z.string().default("width=device-width, initial-scale=1"),
  /** Theme color emitted as the `theme-color` meta tag. */
  themeColor: z.string().default(DEFAULT_THEME_COLOR),
  /** Absolute URL or mount-relative path (leading slash) for og:image. */
  ogImage: z.string().optional(),
  /** Adds manifest, favicon, and apple-touch-icon links at the mount path. */
  pwa: z.boolean().default(false),
  /** Extra meta tags appended after the generated ones. */
  meta: z.array(z.record(z.string(), z.string())).default([]),
  /** Extra link tags appended after the generated ones. */
  links: z.array(z.record(z.string(), z.string())).default([]),
});

export type SiteMetaOptions = z.input<typeof siteMetaOptionsSchema>;

type SiteHeadTag = Record<string, string>;

type SiteHead = {
  meta: SiteHeadTag[];
  links: SiteHeadTag[];
};

/**
 * Builds the complete root-route head output for the given options and mount
 * path.
 *
 * @param options - Validated site meta options.
 * @param mountPath - Normalized mount path with trailing slash, e.g. "/docs/".
 * @returns The head object consumed by TanStack Router's `head` function.
 */
function buildHead(options: z.output<typeof siteMetaOptionsSchema>, mountPath: string): SiteHead {
  const canonical = `${options.origin}${mountPath}`;
  const meta: SiteHeadTag[] = [
    { charSet: "utf-8" },
    { name: "viewport", content: options.viewport },
    { title: options.title },
    { name: "description", content: options.description },
    { name: "author", content: AUTHOR },
    { name: "theme-color", content: options.themeColor },
    { property: "og:title", content: options.title },
    { property: "og:description", content: options.description },
    { property: "og:type", content: "website" },
    { property: "og:site_name", content: SITE_NAME },
    { property: "og:url", content: canonical },
    { name: "twitter:card", content: "summary" },
    { name: "twitter:title", content: options.title },
    { name: "twitter:description", content: options.description },
  ];
  if (options.ogImage) {
    const image = options.ogImage.startsWith("/")
      ? `${options.origin}${options.ogImage}`
      : options.ogImage;
    meta.push({ property: "og:image", content: image });
  }
  meta.push(...options.meta);

  const links: SiteHeadTag[] = [
    { rel: "canonical", href: canonical },
    ...REL_ME_URLS.map((href) => ({ rel: "me", href })),
  ];
  if (options.pwa) {
    links.push(
      { rel: "manifest", href: `${mountPath}manifest.json` },
      { rel: "icon", href: `${mountPath}favicon.ico`, type: "image/x-icon" },
      {
        rel: "apple-touch-icon",
        href: `${mountPath}apple-touch-icon.png`,
      },
    );
  }
  links.push(...options.links);

  return { meta, links };
}

/**
 * Vite plugin that inlines the root-route head metadata at build time.
 *
 * @param options - Per-app site metadata (title, description, origin, ogImage, pwa, extra meta/links).
 * @returns Vite plugin defining `__JFA_SITE_HEAD__` for `@jfa.dev/common/site-head`.
 */
export function siteMeta(options: SiteMetaOptions): Plugin {
  const parsed = siteMetaOptionsSchema.parse(options);

  return {
    name: "jfa-dev:site-meta",
    config(userConfig) {
      // userConfig.base can be a string, false, or a function; anything that
      // is not a mount path string falls back to the root mount.
      const base = z
        .string()
        .default("/")
        .catch("/")
        .parse(userConfig.base);
      const head = buildHead(parsed, toMountPath(base));
      return {
        define: {
          __JFA_SITE_HEAD__: JSON.stringify(head),
        },
      };
    },
  };
}
