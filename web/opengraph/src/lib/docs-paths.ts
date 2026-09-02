/** Absolute site path into the OpenGraph docs under `/docs/opengraph`. */
export function opengraphDocsPath(path = ""): string {
  const hashIndex = path.indexOf("#");
  const pathname = hashIndex === -1 ? path : path.slice(0, hashIndex);
  const hash = hashIndex === -1 ? "" : path.slice(hashIndex);
  const suffix = pathname.replace(/^\/+/, "").replace(/\/+$/, "");
  return `${suffix ? `/docs/opengraph/${suffix}` : "/docs/opengraph"}${hash}`;
}

/** Canonical OpenGraph documentation paths linked from the app UI. */
export const opengraphDocs = {
  overview: opengraphDocsPath(),
  canvas: opengraphDocsPath("canvas"),
  tools: opengraphDocsPath("tools"),
  layers: opengraphDocsPath("layers"),
  text: opengraphDocsPath("text"),
  shapesImages: opengraphDocsPath("shapes-images"),
  fonts: opengraphDocsPath("fonts"),
  projects: opengraphDocsPath("projects"),
  /** Projects page — portable archives section. */
  projectsArchive: opengraphDocsPath("projects#ogproj-archives"),
  shortcuts: opengraphDocsPath("shortcuts"),
} as const;
