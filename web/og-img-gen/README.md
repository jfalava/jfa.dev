# OG Image Generator

`@jfa.dev/og-img-gen` is a zero-cost, local-first OpenGraph image editor. It provides a Photoshop-style layer workspace without uploads, buckets, server-side image transformations, or an account requirement.

Current capabilities:

- text, geometry, and local image layers
- local PNG, JPEG, WebP, GIF, AVIF, and SVG uploads, including multi-file selection and drag-and-drop
- layer selection, visibility, locking, reordering, deletion, and undo/redo
- position, size, rotation, opacity, color, typography, and image-fit controls
- browser-only persistence with IndexedDB
- `.ogproj` project archives containing the project data and local image files
- client-side PNG rendering at 1200 × 630 pixels

Local images stay in the browser’s IndexedDB until the user removes them or resets the project. Exporting a project creates a portable ZIP-based `.ogproj` file in the browser; nothing is sent to a remote service or R2 bucket.

Run it from the repository root:

```bash
bun run --filter @jfa.dev/og-img-gen dev
```

The app is available at `http://localhost:3101/og-img-gen/`.
