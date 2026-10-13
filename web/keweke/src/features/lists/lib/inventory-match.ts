import type { ListItem } from "@jfa.dev/common/lists";
import { distance } from "fastest-levenshtein";
import pluralize from "pluralize";

import { normalizeSearchText } from "@/features/lists/lib/normalize-text";

/** Why a candidate was accepted; surfaced in copy and pinned by tests. */
export type InventoryMatchReason = "exact" | "plural" | "contained" | "fuzzy";

export interface InventoryMatch {
  status: "none" | "likely";
  reason?: InventoryMatchReason;
  item?: ListItem;
}

const NO_MATCH: InventoryMatch = { status: "none" };

/** Edit-distance ratio below which two tokens are treated as the same word. */
const fuzzyTokenRatio = 0.34;

/** Tokens shorter than this must match exactly; "ale" must not match "apple". */
const minimumFuzzyTokenLength = 4;

/** Dropped outright: they carry no product identity. */
const STOP_TOKENS = new Set([
  "a",
  "an",
  "and",
  "at",
  "for",
  "in",
  "of",
  "on",
  "or",
  "some",
  "to",
  "with",
]);

/**
 * Qualifiers describe a product rather than being one. An inventory entry may
 * carry these in addition to a matching token set ("milk" against "whole milk
 * 2%"), which is why they do not block a match.
 */
const QUALIFIER_TOKENS = new Set([
  "bag",
  "bags",
  "bottle",
  "bottles",
  "box",
  "boxes",
  "can",
  "cans",
  "case",
  "cases",
  "carton",
  "each",
  "jar",
  "jars",
  "pack",
  "packs",
  "packet",
  "pkg",
  "pouch",
  "roll",
  "tube",
  // Preparations.
  "canned",
  "chopped",
  "cubed",
  "diced",
  "dried",
  "frozen",
  "fresh",
  "ground",
  "halved",
  "minced",
  "raw",
  "roasted",
  "shredded",
  "sliced",
  // Variants.
  "dark",
  "extra",
  "free",
  "hot",
  "large",
  "lean",
  "light",
  "low",
  "lowfat",
  "medium",
  "mild",
  "mixed",
  "organic",
  "plain",
  "red",
  "regular",
  "salt",
  "salted",
  "seedless",
  "skim",
  "small",
  "spicy",
  "standard",
  "sugar",
  "unsalted",
  "unsweetened",
  "black",
  "white",
  "whole",
  "yellow",
  // Volume and mass units.
  "g",
  "gram",
  "grams",
  "kg",
  "l",
  "lb",
  "lbs",
  "ml",
  "oz",
  "ounce",
  "ounces",
  "pound",
  "pounds",
]);

const NUMERIC_TOKEN = /^\d+(?:\.\d+)?$/;

/** Folded form of a single token; numbers pass through unsingularised. */
function foldToken(token: string): string {
  return NUMERIC_TOKEN.test(token) ? token : pluralize.singular(token);
}

function isQualifierToken(token: string): boolean {
  return NUMERIC_TOKEN.test(token) || QUALIFIER_TOKENS.has(token);
}

/**
 * A name reduced to the tokens that identify a product, plus the same tokens
 * with plurals folded. Both arrays are positionally aligned.
 *
 * Folding is done once up front rather than per comparison because
 * `pluralize.singular` runs a stack of regex replacements and this runs on
 * every keystroke against every item in the snapshot.
 */
interface ParsedName {
  normalized: string;
  tokens: readonly string[];
  foldedTokens: readonly string[];
  /** `foldedTokens` joined, for a cheap whole-string comparison. */
  folded: string;
}

/**
 * Tokens that identify the product itself, with filler removed. The
 * deterministic order preserves the name's own sequence so results are stable.
 */
function parseName(value: string): ParsedName {
  const normalized = normalizeSearchText(value);
  const tokens: string[] = [];
  const seen = new Set<string>();
  if (normalized) {
    for (const token of normalized.split(" ")) {
      if (!token || STOP_TOKENS.has(token) || seen.has(token)) {
        continue;
      }
      seen.add(token);
      tokens.push(token);
    }
  }

  const foldedTokens = tokens.map((token) => foldToken(token));
  return { normalized, tokens, foldedTokens, folded: foldedTokens.join(" ") };
}

interface NameMatchScore {
  /** Mean token similarity, in [0, 1]. */
  score: number;
  /**
   * Candidate tokens that were not needed by the draft. All must be
   * qualifiers; a smaller count means a more specific match.
   */
  leftoverQualifiers: number;
}

const NO_NAME_MATCH: NameMatchScore = { score: 0, leftoverQualifiers: Number.POSITIVE_INFINITY };

/**
 * True when `right` is `left` with one adjacent pair of characters swapped.
 * Swapping two letters is the most common typing mistake and reads as a single
 * mistake, but it costs two edits under plain Levenshtein.
 */
function isAdjacentTransposition(left: string, right: string): boolean {
  if (left.length !== right.length || left.length < 2) {
    return false;
  }

  let firstMismatch = -1;
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] === right[index]) {
      continue;
    }
    if (firstMismatch === -1) {
      firstMismatch = index;
      continue;
    }
    return (
      index === firstMismatch + 1 &&
      left[firstMismatch] === right[index] &&
      left[index] === right[firstMismatch]
    );
  }

  return false;
}

/**
 * Similarity of two already-folded tokens in [0, 1]. Short tokens only match
 * exactly, which stops "ale" from fuzzy-matching "apple".
 *
 * Callers pass folded tokens, so plural pairs such as "berries"/"berry" score
 * as an exact hit without re-running the plural rules here.
 */
function foldedTokenSimilarity(left: string, right: string): number {
  if (left === right) {
    return 1;
  }
  if (Math.min(left.length, right.length) < minimumFuzzyTokenLength) {
    return 0;
  }
  if (isAdjacentTransposition(left, right)) {
    return 1 - 1 / left.length;
  }

  return 1 - distance(left, right) / Math.max(left.length, right.length);
}

/**
 * Score for treating `candidate` as the same product as `draft`, or 0 when the
 * two are different products.
 *
 * Every draft token must find a counterpart in the candidate, except that a
 * qualifier the draft adds and the candidate omits is allowed to go unmatched.
 * Any candidate token left over must likewise be a qualifier. That symmetry is
 * what lets "bag of bread" match "sliced bread" and "milk" match "whole milk
 * 2%", while "chocolate bar" refuses to match "dark chocolate" and "milk"
 * refuses to match "milk chocolate".
 */
function scoreCandidate(draft: ParsedName, candidate: ParsedName): NameMatchScore {
  if (draft.tokens.length === 0 || candidate.tokens.length === 0) {
    return NO_NAME_MATCH;
  }

  const unmatched = new Set(candidate.foldedTokens);
  let total = 0;
  let matchedDraftTokens = 0;
  for (let index = 0; index < draft.foldedTokens.length; index += 1) {
    const draftToken = draft.foldedTokens[index];
    let bestToken: string | undefined;
    let bestScore = 0;
    for (const candidateToken of unmatched) {
      const score = foldedTokenSimilarity(draftToken, candidateToken);
      if (score > bestScore) {
        bestScore = score;
        bestToken = candidateToken;
      }
    }

    if (bestToken && bestScore >= 1 - fuzzyTokenRatio) {
      unmatched.delete(bestToken);
      total += bestScore;
      matchedDraftTokens += 1;
      continue;
    }

    // A qualifier the draft adds but the candidate omits ("bag of bread"
    // against "sliced bread") is not a reason to reject. Any other unmatched
    // word means these are different products.
    if (!isQualifierToken(draft.tokens[index])) {
      return NO_NAME_MATCH;
    }
  }

  if (matchedDraftTokens === 0) {
    return NO_NAME_MATCH;
  }

  let leftoverQualifiers = 0;
  for (const leftover of unmatched) {
    if (!isQualifierToken(leftover)) {
      return NO_NAME_MATCH;
    }
    leftoverQualifiers += 1;
  }

  return { score: total / matchedDraftTokens, leftoverQualifiers };
}

/** Why a candidate matched, for copy and for pinning which rule fired. */
function matchReason(draft: ParsedName, candidate: ParsedName): InventoryMatchReason {
  if (draft.normalized === candidate.normalized) {
    return "exact";
  }
  if (draft.folded === candidate.folded) {
    return "plural";
  }

  const candidateFolded = new Set(candidate.foldedTokens);
  const draftIsContained = draft.foldedTokens.every(
    (token, index) => candidateFolded.has(token) || isQualifierToken(draft.tokens[index]),
  );
  return draftIsContained ? "contained" : "fuzzy";
}

/** One inventory item with its name pre-parsed. */
interface InventoryEntry {
  item: ListItem;
  parsed: ParsedName;
}

/**
 * Pre-parsed inventory, built once per snapshot.
 *
 * Matching runs on every keystroke of the new-item row, so names are tokenised
 * and plural-folded here — once per list change — rather than on each query.
 * Mirror of how `list-search` keeps a Fuse index alongside the list catalog.
 */
export interface InventoryIndex {
  entries: readonly InventoryEntry[];
}

export function buildInventoryIndex(items: readonly ListItem[]): InventoryIndex {
  const entries: InventoryEntry[] = [];
  for (const item of items) {
    if (item.checked) {
      entries.push({ item, parsed: parseName(item.name) });
    }
  }
  return { entries };
}

/**
 * Ranks two accepted matches: closest tokens first, then the more specific
 * entry with fewer surplus qualifiers, then the more recently updated one, and
 * finally the id so the result never depends on array order.
 */
function isBetterCandidate(
  candidate: NameMatchScore,
  best: NameMatchScore,
  item: ListItem,
  bestItem: ListItem,
): boolean {
  if (candidate.score !== best.score) {
    return candidate.score > best.score;
  }
  if (candidate.leftoverQualifiers !== best.leftoverQualifiers) {
    return candidate.leftoverQualifiers < best.leftoverQualifiers;
  }
  if (item.updatedAt !== bestItem.updatedAt) {
    return item.updatedAt > bestItem.updatedAt;
  }
  return item.id < bestItem.id;
}

/**
 * Best inventory match for a name being added, or `{ status: "none" }`.
 *
 * Only checked items count as inventory: the List and Inventory tabs are two
 * views of the same snapshot, so this needs no extra data.
 */
export function matchInventoryName(name: string, index: InventoryIndex): InventoryMatch {
  const draft = parseName(name);
  if (draft.tokens.length === 0) {
    return NO_MATCH;
  }

  let best: InventoryMatch = NO_MATCH;
  let bestScore: NameMatchScore = NO_NAME_MATCH;
  for (const entry of index.entries) {
    const candidate = scoreCandidate(draft, entry.parsed);
    if (candidate.score <= 0) {
      continue;
    }
    if (
      best.item !== undefined &&
      !isBetterCandidate(candidate, bestScore, entry.item, best.item)
    ) {
      continue;
    }

    bestScore = candidate;
    best = { status: "likely", reason: matchReason(draft, entry.parsed), item: entry.item };
  }

  return best;
}

/** Message naming the inventory entry a candidate appears to duplicate. */
export function inventoryMatchMessage(match: InventoryMatch): string {
  const item = match.item;
  if (!item) {
    return "";
  }

  const measure = item.quantity > 0 ? `${item.quantity} ${item.unit}` : item.unit;
  return `Already in inventory: ${item.name} (${measure})`;
}
