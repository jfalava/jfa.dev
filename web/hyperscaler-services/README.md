# Hyperscaler Services

A comparison tool for popular cloud services equivalents, built with TanStack.

## Local development

```bash
bun run dev
```

This package-level command serves the standalone app at
`http://localhost:3102/`. The repository-level `bun run dev` command starts the
complete Alchemy topology; use `http://localhost:8795/hyperscaler-services/`
to test the mounted public route.

The public application path is configurable with `VITE_BASE_PATH`. Use `/` for
the standalone `hyperscalers.jfa.dev` hostname. Alchemy's mounted build keeps
that public path at `/hyperscaler-services` while using `/` as its internal
Vite asset base, because the router strips the mount before invoking the
Worker.

### Build

```bash
bun run build
```

### Preview

```bash
bun run preview
```

### Deploy

Run deployments from the repository root through Alchemy:

```bash
ALCHEMY_STAGE=development bun run deploy
```

The standalone public Worker is configured by infrastructure with `VITE_BASE_PATH=/`.
For a standalone build check:

```bash
VITE_BASE_PATH=/ bun run build
```
