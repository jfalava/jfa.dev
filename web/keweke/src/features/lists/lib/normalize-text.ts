/**
 * Case, accent, and punctuation folding shared by list search and item
 * matching. Kept separate from `list-search` so that code paths which do not
 * need the Fuse index do not pull it into their bundle.
 */
export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export function tokenizeSearchText(value: string): readonly string[] {
  const normalized = normalizeSearchText(value);
  return normalized ? normalized.split(" ") : [];
}
