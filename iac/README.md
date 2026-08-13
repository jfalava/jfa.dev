# jfa.dev infrastructure

Alchemy is the canonical deployment entrypoint for the six Worker resources and the local development topology in this repository.

```sh
# Inspect a stage without applying it
ALCHEMY_STAGE=development bun run iac:plan

# Start the complete local topology
bun run dev

# Apply the isolated development stage
ALCHEMY_STAGE=development bun run deploy
```

The local Router Worker is available on `http://localhost:8795`; the redirects Worker is on `http://localhost:8781`; the frontend Workers use ports `3100` through `3103`. The Router Worker uses real Alchemy service bindings, including the mounted hyperscaler build on port `3102`; the standalone build on port `3103` is useful for direct-app QA.

Production has two hyperscaler resources intentionally: `hyperscaler-services` owns `hyperscalers.jfa.dev` and is built with `/` as its base path; `hyperscaler-services-mounted` is bound to the router and is built with `/hyperscaler-services` as its base path.

Cloudflare authentication is infrastructure authentication, not an application runtime secret. Set `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` in the shell or CI environment. This repository currently has no runtime secrets, D1 databases, KV namespaces, or R2 buckets to provision.

Use the production runbook before applying the production stage. In particular, `booru.satuya.com` is deliberately excluded because it is already owned by this repository's redirect Worker in the live account but is intended to be owned by the separate `tBCProject` stack.
