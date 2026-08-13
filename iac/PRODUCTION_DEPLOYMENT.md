# Production deployment

Production uses adoption against the existing Worker names and domains. Review the dry-run output before applying it:

```sh
ALCHEMY_STAGE=production bun run iac:plan
```

Expected production owners are:

- `jfa.dev` → `jfa-dev-router`
- `hyperscalers.jfa.dev` → `hyperscaler-services`
- the 15 domains listed in `src/config.ts` → `jfa-redirects`
- `/`, `/og-img-gen`, and `/hyperscaler-services` on `jfa.dev` → `jfa-dev-router`
- the router's `HYPERSCALER_SERVICES` service binding → `hyperscaler-services-mounted`

Before applying, confirm the plan has no unexpected domain moves, deletes, replacements, or recreation of adopted Workers. The first apply should be run manually with the exact production hostname and old/new ownership recorded in the deployment log:

```sh
ALCHEMY_STAGE=production bun run deploy
```

Rollback is the same command after reverting the infrastructure/source change and rerunning the production plan. Do not include `booru.satuya.com` in this stack: its handoff belongs to the `tBCProject` migration and requires a separate old-owner/new-owner/rollback review.
