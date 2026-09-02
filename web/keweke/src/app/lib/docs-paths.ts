/** Absolute site path into the KEWEKE docs under `/docs/keweke`. */
export function kewekeDocsPath(path = ""): string {
  const hashIndex = path.indexOf("#");
  const pathname = hashIndex === -1 ? path : path.slice(0, hashIndex);
  const hash = hashIndex === -1 ? "" : path.slice(hashIndex);
  const suffix = pathname.replace(/^\/+/, "").replace(/\/+$/, "");
  return `${suffix ? `/docs/keweke/${suffix}` : "/docs/keweke"}${hash}`;
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
  /** Publish confirm dialog — “what you are making public”. */
  publishListDialog: kewekeDocsPath(
    "lists/publishing-a-list#the-dialog--what-you-are-making-public",
  ),
  workingWithList: kewekeDocsPath("lists/working-with-the-list"),
  workingWithListSpreadsheet: kewekeDocsPath(
    "lists/working-with-the-list#search-and-spreadsheet-mode",
  ),
} as const;
