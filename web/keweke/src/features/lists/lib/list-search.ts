import type { ListSummary } from "@jfa.dev/common/lists";
import Fuse, { type IFuseOptions } from "fuse.js";

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

export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

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

function getEditDistance(left: string, right: string): number {
  const distances = Array.from({ length: left.length + 1 }, (_leftValue, leftIndex) =>
    Array.from({ length: right.length + 1 }, (_rightValue, rightIndex) =>
      leftIndex === 0 ? rightIndex : rightIndex === 0 ? leftIndex : 0,
    ),
  );

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const substitutionCost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      distances[leftIndex][rightIndex] = Math.min(
        distances[leftIndex - 1][rightIndex] + 1,
        distances[leftIndex][rightIndex - 1] + 1,
        distances[leftIndex - 1][rightIndex - 1] + substitutionCost,
      );

      if (
        leftIndex > 1 &&
        rightIndex > 1 &&
        left[leftIndex - 1] === right[rightIndex - 2] &&
        left[leftIndex - 2] === right[rightIndex - 1]
      ) {
        distances[leftIndex][rightIndex] = Math.min(
          distances[leftIndex][rightIndex],
          distances[leftIndex - 2][rightIndex - 2] + 1,
        );
      }
    }
  }

  return distances[left.length][right.length];
}

function getFuzzyMatchQuality(token: string, normalizedText: string): number {
  const bestQuality = Math.max(
    ...tokenize(normalizedText).map((fieldToken) => {
      const exactDistance = getEditDistance(token, fieldToken);
      const substringDistance = getApproximateSubstringDistance(token, fieldToken);
      const distance = Math.min(exactDistance, substringDistance);
      const distanceRatio = distance / Math.max(token.length, fieldToken.length);

      return distanceRatio <= maximumFuzzyDistanceRatio ? 1 - distanceRatio : 0;
    }),
    0,
  );

  return bestQuality;
}

/** Minimum edit distance between `token` and any substring of `text`. */
function getApproximateSubstringDistance(token: string, text: string): number {
  let bestDistance = Number.POSITIVE_INFINITY;

  for (let start = 0; start < text.length; start += 1) {
    for (let end = start + 1; end <= text.length; end += 1) {
      bestDistance = Math.min(bestDistance, getEditDistance(token, text.slice(start, end)));
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
