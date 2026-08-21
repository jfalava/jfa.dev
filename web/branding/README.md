# @jfa.dev/branding

Single-page showcase for every component in `@jfa.dev/common/ui` — the shared design system behind the monorepo. Think [ui.shadcn.com](https://ui.shadcn.com) but for this codebase: one scrollable page where you can eyeball every state in light and dark.

- Scaffolded with `tanstack create branding` (React + Cloudflare deployment).
- Consumes only `@jfa.dev/common/ui` (Button, Input, Checkbox, Table, Dialog, Dropdown Menu, Kbd, SiteHeader, Sonner).
- Header houses the light / dark / system toggle; the `SiteHeader` itself is showcased live.

## Dev

```sh
bun run dev          # http://localhost:3104/branding/
bun run typecheck
bun run lint
bun run build        # vp build -> Cloudflare Worker via Alchemy (iac)
```

Deployed at `/branding` (port 3104 local) through `iac/src/config.ts` + `iac/src/workers.ts` and the top-level `function/router`.
