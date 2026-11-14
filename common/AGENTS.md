# Shared UI components

`common/src/components/ui` is the JFA design system: React Aria Components styled with the shared tokens, exported through `@jfa.dev/common/ui` and shown in Branding.

## `ui-lint` is the judge

`bun run lint:ui` (`tools/ui-lint`) decides whether a change follows these rules. It runs in `bun run check`, which `predeploy` and Cloudflare CI run, and only violations not recorded in `tools/ui-lint/baseline.json` fail. This file explains the rules; if this file and the linter disagree, the linter is right and this file needs fixing. When a rule can be checked mechanically, add it to `tools/ui-lint` with a test instead of writing more prose here.

| Rule                         | What it enforces                                                                                                        |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `shared-module-use`          | A shared module exists because a product app or another shared module uses it. Branding and Docs examples do not count. |
| `shared-module-export`       | Every file in `components/ui` is exported from `index.ts`.                                                              |
| `branding-coverage`          | Every exported module has an executable Branding example.                                                               |
| `foreign-primitive`          | No Radix, Base UI or Vaul, in imports or in any `package.json`.                                                         |
| `alias-import`               | No `@/` imports in `common/src`; apps alias `@/` to their own `src`.                                                    |
| `cn-import`                  | `cn` comes from `common/src/lib/utils.ts`, which knows the custom font sizes.                                           |
| `text-size`, `palette-color` | Type roles and theme tokens instead of arbitrary sizes and raw colors.                                                  |
| `reference-drift`            | Branding and Docs examples do not drift from product class lists.                                                       |

A deliberate exception takes a `ui-lint-allow <rule>` comment with the reason, on the same or the previous line (anywhere in the module for `shared-module-use`). Refresh the baseline with `bun tools/ui-lint/index.ts --update-baseline` only when violations went down.

## Adding a component

Add one when a product needs it, never ahead of time, and never the whole catalog. Markup used once stays in its app.

1. Preview from `common/`, with the shadcn version from the root `ui` catalog. `components.json` selects the `aria-nova` style.

   ```sh
   bunx shadcn@4.23.0 add <name> --path src/components/ui --dry-run
   bunx shadcn@4.23.0 add <name> --path src/components/ui --view
   ```

2. If the dry run lists an `overwrite` (for example, `dialog` overwrites `button.tsx`), do not apply it. Copy the new file from `--view` and adapt it by hand. Never pass `--overwrite` or `--all`.
3. Adapt the file until `ui-lint`, `lint` and `typecheck` pass: relative imports, `cn` from `../../lib/utils`, type roles and tokens, no `any`, accessible names passed through. Give interactive controls the `density` prop that Button, Input and Toggle use.
4. Export it from `index.ts`, add a Branding section that exercises its real states, move the product code onto it and delete the app's own copy.
5. Check: `bun run check` (lint, `lint:ui`, typecheck and tests), then Branding and the consuming app in light and dark at mobile and desktop widths.

There is no upstream tracking. Diff against upstream with `--diff` only when fixing a bug in a component.
