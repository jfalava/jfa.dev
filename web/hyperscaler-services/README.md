# Hyperscaler Services

A comparison tool for popular cloud services equivalents, built with TanStack.

## Local development

```bash
bun run dev
```

The default build is mounted at `/hyperscaler-services/`, so visit
`http://localhost:3000/hyperscaler-services/` to see the application.

The deployment base path is configurable with `VITE_BASE_PATH`. Use `/` when
building the app for its standalone `hyperscalers.jfa.dev` hostname.

### Build

```bash
bun run build
```

### Preview

```bash
bun run preview
```

### Deploy

```bash
bun run deploy
```

For the standalone hostname:

```bash
VITE_BASE_PATH=/ bun run deploy
```
