# Keweke

A small, shareable shopping-list app for friends.

Lists use UUID7 identifiers so a list can be shared directly as a URL. This package currently contains the TanStack Start UI scaffold and a server-only UUID7 list-id function. Durable Object persistence and the `/keweke` router mount will be wired separately through Alchemy.

The app routes are `/keweke/` for the empty shell and `/keweke/:listId` for a loaded list. The current list table is local scaffold state until the Durable Object data layer is added.

## Translations

Keweke ships in English, Spanish (`es-ES`) and Catalan (`ca-ES`) with [fbtee](https://fbtee.dev). English text is written inline in `<fbt desc="…">` or `fbs("…", "…")`; the `desc` is the translator's context.

- The server picks the locale per request from the shared `jfa-language` preference cookie (`@jfa.dev/common/preferences`), else the browser's `Accept-Language`, else English, and renders it into `<html lang>`, which the browser reuses for hydration (`src/app/i18n`). The language picker in user settings writes the cookie.
- `translations/*.json` are the editable catalogs and are committed. After adding or changing strings, run `bun run i18n:prepare` to add them to every catalog as `"status": "new"`, translate those entries, and remove their `status`. Entries still marked new fall back to English at runtime, but `bun run test` (and so `bun run check`, which gates Cloudflare branch builds and deploys) runs `i18n:check`, which fails while any string lacks a finished Spanish or Catalan translation.
- The build and dev server compile the catalogs into `src/translations/` (git-ignored) through the `keweke:fbtee` plugin in `vite.config.ts`, which also compiles `<fbt>` in source (it replaces `@nkzw/vite-plugin-fbtee`, which skips code-split route modules).
- Do not call `fbt`/`fbs` at module scope (there is no request on the server at import time) or in modules imported by `bun test` (fbtee throws when uncompiled); return codes from those modules and translate where they render.
