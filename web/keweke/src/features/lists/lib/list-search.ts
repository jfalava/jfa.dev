import type { ListSummary } from "@jfa.dev/common/lists";
import { distance } from "fastest-levenshtein";
import Fuse, { type IFuseOptions } from "fuse.js";

import { normalizeSearchText } from "@/features/lists/lib/normalize-text";

export interface ListSearchResult {
  list: ListSummary;
  score: number;
}

export interface ListSearchIndex {
  lists: readonly ListSummary[];
  fuzzyIndex: Fuse<ListSummary>;
}

const fieldWeights = {
  alias: 100,
  title: 40,
} as const;

const minimumFuzzyTokenLength = 4;
const fuzzyMatchThreshold = 0.4;
const maximumFuzzyDistanceRatio = 0.35;

const fuzzySearchOptions: IFuseOptions<ListSummary> = {
  ignoreLocation: true,
  includeScore: true,
  keys: [
    { name: "alias", weight: fieldWeights.alias },
    { name: "title", weight: fieldWeights.title },
  ],
  minMatchCharLength: minimumFuzzyTokenLength,
  threshold: fuzzyMatchThreshold,
};

export { normalizeSearchText } from "./normalize-text";

/** Splits already-normalized text; every caller has run `normalizeSearchText`. */
function tokenize(value: string): readonly string[] {
  return value ? value.split(" ") : [];
}

interface SearchField {
  kind: "alias" | "title";
  normalizedText: string;
  tokens: readonly string[];
}

function createSearchField(kind: "alias" | "title", value: string): SearchField | null {
  const normalizedText = normalizeSearchText(value);

  if (!normalizedText) {
    return null;
  }

  return { kind, normalizedText, tokens: tokenize(normalizedText) };
}

function scoreField(field: SearchField, token: string): number {
  const weight = fieldWeights[field.kind];

  if (field.tokens.includes(token)) {
    return weight + 20;
  }

  if (token.length >= 2 && field.tokens.some((fieldToken) => fieldToken.startsWith(token))) {
    return weight + 8;
  }

  if (token.length >= 3 && field.normalizedText.includes(token)) {
    return weight;
  }

  return 0;
}

function getFuzzyMatchQuality(token: string, normalizedText: string): number {
  const bestQuality = Math.max(
    ...tokenize(normalizedText).map((fieldToken) => {
      // Widened by one so the scan bound can never exclude a candidate the
      // ratio test would have accepted.
      const maximumDistance = Math.ceil(
        maximumFuzzyDistanceRatio * Math.max(token.length, fieldToken.length),
      );
      const matchDistance = getBoundedSubstringDistance(token, fieldToken, maximumDistance);
      const distanceRatio = matchDistance / Math.max(token.length, fieldToken.length);

      return distanceRatio <= maximumFuzzyDistanceRatio ? 1 - distanceRatio : 0;
    }),
    0,
  );

  return bestQuality;
}

/**
 * Minimum edit distance between `token` and any substring of `text`.
 *
 * The whole string counts as one of its own substrings, so this already covers
 * the plain token-to-token distance and needs no separate comparison.
 *
 * Levenshtein distance is at least the difference in lengths, so only
 * substrings within `maximumDistance` of the token's length can beat that
 * bound. Scanning just that band returns the same minimum as scanning every
 * substring, without the cubic blow-up on long names.
 */
function getBoundedSubstringDistance(token: string, text: string, maximumDistance: number): number {
  const minimumLength = Math.max(1, token.length - maximumDistance);
  const maximumLength = Math.min(text.length, token.length + maximumDistance);
  let bestDistance = Number.POSITIVE_INFINITY;

  for (let start = 0; start + minimumLength <= text.length; start += 1) {
    const end = Math.min(text.length, start + maximumLength);
    for (let nextEnd = Math.min(end, start + minimumLength); nextEnd <= end; nextEnd += 1) {
      bestDistance = Math.min(bestDistance, distance(token, text.slice(start, nextEnd)));
      if (bestDistance === 0) {
        return 0;
      }
    }
  }

  return bestDistance;
}

function buildFuzzyTokenScores(index: ListSearchIndex, token: string): ReadonlyMap<string, number> {
  const scores = new Map<string, number>();

  if (token.length < minimumFuzzyTokenLength) {
    return scores;
  }

  for (const result of index.fuzzyIndex.search(token)) {
    const list = result.item;
    const aliasText = list.alias ? normalizeSearchText(list.alias) : "";
    const titleText = normalizeSearchText(list.title);
    const bestQuality = Math.max(
      aliasText ? getFuzzyMatchQuality(token, aliasText) : 0,
      titleText ? getFuzzyMatchQuality(token, titleText) : 0,
    );

    if (bestQuality === 0) {
      continue;
    }

    const fuzzyScore = Math.max(
      1,
      Math.round(Math.max(fieldWeights.alias, fieldWeights.title) * bestQuality),
    );
    const previousScore = scores.get(list.id) ?? 0;

    if (fuzzyScore > previousScore) {
      scores.set(list.id, fuzzyScore);
    }
  }

  return scores;
}

function scoreEntry(
  fields: readonly SearchField[],
  list: ListSummary,
  normalizedQuery: string,
  queryTokens: readonly string[],
  fuzzyTokenScores: ReadonlyMap<string, ReadonlyMap<string, number>>,
): number | null {
  let score = 0;

  for (const token of queryTokens) {
    const exactTokenScore = Math.max(...fields.map((field) => scoreField(field, token)), 0);
    const fuzzyTokenScore = fuzzyTokenScores.get(token)?.get(list.id) ?? 0;
    const tokenScore = Math.max(exactTokenScore, fuzzyTokenScore);

    if (tokenScore === 0) {
      return null;
    }

    score += tokenScore;
  }

  if (fields.some((field) => field.normalizedText === normalizedQuery)) {
    score += 100;
  } else if (fields.some((field) => field.normalizedText.includes(normalizedQuery))) {
    score += 35;
  }

  return score;
}

export function buildListSearchIndex(lists: readonly ListSummary[]): ListSearchIndex {
  return {
    lists,
    fuzzyIndex: new Fuse(lists, fuzzySearchOptions),
  };
}

export function searchListIndex(
  index: ListSearchIndex,
  query: string,
): readonly ListSearchResult[] {
  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedQuery) {
    return index.lists.map((list) => ({ list, score: 0 }));
  }

  const queryTokens = [...new Set(tokenize(normalizedQuery))];
  const entries = index.lists.map((list) => ({
    fields: [
      createSearchField("alias", list.alias ?? ""),
      createSearchField("title", list.title),
    ].filter((field): field is SearchField => field !== null),
    list,
  }));
  const fuzzyTokenScores = new Map(
    queryTokens.map((token) => [token, buildFuzzyTokenScores(index, token)]),
  );

  return entries
    .map(({ fields, list }) => {
      const score = scoreEntry(fields, list, normalizedQuery, queryTokens, fuzzyTokenScores);

      if (score === null) {
        return null;
      }

      return { list, score };
    })
    .filter((result): result is ListSearchResult => result !== null)
    .toSorted(
      (left, right) =>
        right.score - left.score || right.list.updatedAt.localeCompare(left.list.updatedAt),
    );
}
