/** Absolute site path into the KEWEKE docs under `/docs/keweke`. */
export function kewekeDocsPath(path = ""): string {
  const suffix = path.replace(/^\/+/, "").replace(/\/+$/, "");
  return suffix ? `/docs/keweke/${suffix}` : "/docs/keweke";
}

/** Canonical KEWEKE documentation paths linked from the app UI. */
export const kewekeDocs = {
  overview: kewekeDocsPath(),
  users: kewekeDocsPath("users"),
  createUser: kewekeDocsPath("users/create-a-user"),
  whatYouSee: kewekeDocsPath("users/what-you-see"),
  identity: kewekeDocsPath("architecture/identity"),
  collaboration: kewekeDocsPath("architecture/collaboration"),
  storage: kewekeDocsPath("architecture/storage"),
  createList: kewekeDocsPath("lists/create-a-list"),
  publishList: kewekeDocsPath("lists/publishing-a-list"),
  workingWithList: kewekeDocsPath("lists/working-with-the-list"),
} as const;
