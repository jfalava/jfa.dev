/**
 * Root-route head metadata generated at build time by the `siteMeta` Vite
 * plugin (`@jfa.dev/common/vite/site-meta`). The plugin validates the per-app
 * options and inlines the final head output as the `__JFA_SITE_HEAD__`
 * constant, so apps only declare their metadata once in `vite.config.ts`.
 */

/** A single meta tag entry accepted by TanStack Router's `head` function. */
export type SiteMetaTag =
  | { charSet: string }
  | { title: string }
  | { name: string; content: string }
  | { property: string; content: string };

/** A single link tag entry accepted by TanStack Router's `head` function. */
export type SiteLinkTag = { rel: string; href: string } & Record<string, string | undefined>;

/** The complete root-route head output. */
export type SiteHead = {
  meta: SiteMetaTag[];
  links: SiteLinkTag[];
};

// Inlined by the siteMeta Vite plugin as an object literal via `define`.
declare const __JFA_SITE_HEAD__: SiteHead;

const SITE_HEAD = __JFA_SITE_HEAD__;

/**
 * Returns the build-time generated root-route head for `createRootRoute`,
 * optionally appending app-specific meta and link tags (e.g. the app
 * stylesheet link).
 *
 * @param extra - Additional meta and link tags appended to the generated ones.
 * @returns The head object with meta and link tags for the root route.
 */
export function siteHead(extra?: { meta?: SiteMetaTag[]; links?: SiteLinkTag[] }): SiteHead {
  return {
    meta: [...SITE_HEAD.meta, ...(extra?.meta ?? [])],
    links: [...SITE_HEAD.links, ...(extra?.links ?? [])],
  };
}
