import Fuse, { type FuseIndex, type IFuseOptions } from "fuse.js";

import { serviceProviders, type ServiceMapping, type ServiceProvider } from "@/data/services";

export type ServiceSearchScope = "service" | "provider" | "category" | "description";
type SearchScope = ServiceSearchScope;
type SearchFieldKind = SearchScope | "alias";

export interface SearchField {
  kind: SearchFieldKind;
  normalizedText: string;
  tokens: readonly string[];
}

interface IndexedService {
  fields: readonly SearchField[];
  service: ServiceMapping;
  sourceIndex: number;
}

interface ScoredSearchResult extends ServiceSearchResult {
  sourceIndex: number;
}

export interface FuzzySearchDocument {
  kind: SearchFieldKind;
  normalizedText: string;
  sourceIndex: number;
}

/** An immutable, reusable search index for the static service catalog. */
export interface ServiceSearchIndex {
  entries: readonly IndexedService[];
  fuzzyIndex: Fuse<FuzzySearchDocument>;
}

/** JSON-safe search data generated from the static catalog during the build. */
export interface SerializedServiceSearchIndex {
  fieldsByService: readonly (readonly SearchField[])[];
  fuzzyDocuments: readonly FuzzySearchDocument[];
  fuseIndex: ReturnType<FuseIndex<FuzzySearchDocument>["toJSON"]>;
}

/** A ranked service result returned by the catalog search engine. */
export interface ServiceSearchResult {
  matchedTerms: readonly string[];
  score: number;
  service: ServiceMapping;
}

const fieldWeights = {
  service: 100,
  provider: 80,
  alias: 80,
  category: 60,
  description: 20,
} satisfies Record<SearchFieldKind, number>;

const minimumFuzzyTokenLength = 4;
const fuzzyMatchThreshold = 0.4;
const fuzzyScoreMultiplier = 0.75;
const maximumFuzzyDistanceRatio = 0.35;
const fuzzySearchOptions: IFuseOptions<FuzzySearchDocument> = {
  ignoreLocation: true,
  includeScore: true,
  keys: ["normalizedText"],
  minMatchCharLength: minimumFuzzyTokenLength,
  threshold: fuzzyMatchThreshold,
};

const searchAliases = new Map<string, readonly string[]>([
  ["aks", ["kubernetes", "k8s"]],
  ["cloud functions", ["serverless", "faas"]],
  ["cloud run gke", ["kubernetes", "k8s"]],
  ["dms", ["database migration"]],
  ["eks", ["kubernetes", "k8s"]],
  ["ecs eks", ["kubernetes", "k8s"]],
  ["functions", ["serverless", "faas"]],
  ["gke", ["kubernetes", "k8s"]],
  ["lambda", ["serverless", "faas"]],
  ["oci functions", ["serverless", "faas"]],
  ["oke", ["kubernetes", "k8s"]],
  ["rds", ["relational database", "sql"]],
  ["workers", ["serverless", "faas"]],
]);

const searchScopeAliases = new Map<string, SearchScope>([
  ["categories", "category"],
  ["category", "category"],
  ["description", "description"],
  ["descriptions", "description"],
  ["provider", "provider"],
  ["providers", "provider"],
  ["service", "service"],
  ["services", "service"],
]);

function normalizeSearchText(value: string): string {
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

/** Parsed scope and terms from a service search query. */
export interface ParsedServiceSearchQuery {
  normalizedQuery: string;
  queryTokens: readonly string[];
  scope?: SearchScope;
}

/** Parses an optional service:, provider:, category:, or description: query prefix. */
export function parseServiceSearchQuery(query: string): ParsedServiceSearchQuery {
  const trimmedQuery = query.trim();
  const scopeMatch = trimmedQuery.match(/^([a-z]+):\s*/i);
  const scope = scopeMatch ? searchScopeAliases.get(scopeMatch[1].toLowerCase()) : undefined;
  const queryText = scope && scopeMatch ? trimmedQuery.slice(scopeMatch[0].length) : trimmedQuery;
  const normalizedQuery = normalizeSearchText(queryText);

  return {
    normalizedQuery,
    queryTokens: [...new Set(tokenize(normalizedQuery))],
    scope,
  };
}

/** Returns the selected provider when a query exactly names a known provider. */
export function getProviderFromSearchQuery(query: string): ServiceProvider | undefined {
  const parsedQuery = parseServiceSearchQuery(query);

  if (parsedQuery.scope !== "provider") {
    return undefined;
  }

  return serviceProviders.find(
    ({ label }) => normalizeSearchText(label) === parsedQuery.normalizedQuery,
  )?.key;
}

function createSearchField(kind: SearchFieldKind, value: string): SearchField | null {
  const normalizedText = normalizeSearchText(value);

  if (!normalizedText) {
    return null;
  }

  return {
    kind,
    normalizedText,
    tokens: tokenize(normalizedText),
  };
}

function createServiceFields(service: ServiceMapping): readonly SearchField[] {
  const fields: SearchField[] = [];
  const serviceNames = [
    ["AWS", service.aws],
    ["Azure", service.azure],
    ["GCP", service.gcp],
    ["Oracle", service.oracle],
    ["Cloudflare", service.cloudflare],
  ] as const;

  const addField = (kind: SearchFieldKind, value: string): void => {
    const field = createSearchField(kind, value);

    if (field) {
      fields.push(field);
    }
  };

  for (const [provider, serviceName] of serviceNames) {
    addField("provider", provider);
    addField("service", serviceName);

    const aliases = searchAliases.get(normalizeSearchText(serviceName)) ?? [];
    for (const alias of aliases) {
      addField("alias", alias);
    }
  }

  addField("category", service.category);
  addField("category", service.categoryName.en);
  addField("category", service.categoryName.es);
  addField("description", service.description.en);
  addField("description", service.description.es);

  return fields;
}

/** Generates the JSON-safe Fuse index consumed by the static catalog. */
export function buildServiceSearchArtifact(
  services: readonly ServiceMapping[],
): SerializedServiceSearchIndex {
  const fieldsByService = services.map((service) => createServiceFields(service));
  const fuzzyDocuments = fieldsByService.flatMap((fields, sourceIndex) =>
    fields.map(({ kind, normalizedText }) => ({ kind, normalizedText, sourceIndex })),
  );

  return {
    fieldsByService,
    fuzzyDocuments,
    fuseIndex: Fuse.createIndex(["normalizedText"], fuzzyDocuments).toJSON(),
  };
}

/** Hydrates the prebuilt static artifact without indexing catalog text in the browser. */
export function hydrateServiceSearchIndex(
  services: readonly ServiceMapping[],
  artifact: SerializedServiceSearchIndex,
): ServiceSearchIndex {
  if (services.length !== artifact.fieldsByService.length) {
    throw new Error("The generated service search index is out of date");
  }

  return {
    entries: services.map((service, sourceIndex) => ({
      fields: artifact.fieldsByService[sourceIndex],
      service,
      sourceIndex,
    })),
    fuzzyIndex: new Fuse(
      artifact.fuzzyDocuments,
      fuzzySearchOptions,
      Fuse.parseIndex<FuzzySearchDocument>(artifact.fuseIndex),
    ),
  };
}

/** Builds an in-memory index for callers searching an arbitrary, non-catalog data set. */
export function buildServiceSearchIndex(services: readonly ServiceMapping[]): ServiceSearchIndex {
  return hydrateServiceSearchIndex(services, buildServiceSearchArtifact(services));
}

function isFieldInScope(kind: SearchFieldKind, scope?: SearchScope): boolean {
  return !scope || kind === scope || (scope === "service" && kind === "alias");
}

function scoreField(field: SearchField, token: string, scope?: SearchScope): number {
  if (!isFieldInScope(field.kind, scope)) {
    return 0;
  }

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
  return Math.max(
    ...tokenize(normalizedText).map((fieldToken) => {
      const distance = getEditDistance(token, fieldToken);
      const distanceRatio = distance / Math.max(token.length, fieldToken.length);

      return distanceRatio <= maximumFuzzyDistanceRatio ? 1 - distanceRatio : 0;
    }),
    0,
  );
}

function buildFuzzyTokenScores(
  index: ServiceSearchIndex,
  token: string,
  scope?: SearchScope,
): ReadonlyMap<number, number> {
  const scores = new Map<number, number>();

  if (token.length < minimumFuzzyTokenLength) {
    return scores;
  }

  for (const result of index.fuzzyIndex.search(token)) {
    const { kind, sourceIndex } = result.item;

    if (!isFieldInScope(kind, scope)) {
      continue;
    }

    const matchQuality = getFuzzyMatchQuality(token, result.item.normalizedText);

    if (matchQuality === 0) {
      continue;
    }

    const fuzzyScore = Math.max(
      1,
      Math.round(fieldWeights[kind] * matchQuality * fuzzyScoreMultiplier),
    );
    const previousScore = scores.get(sourceIndex) ?? 0;

    if (fuzzyScore > previousScore) {
      scores.set(sourceIndex, fuzzyScore);
    }
  }

  return scores;
}

function scoreEntry(
  entry: IndexedService,
  normalizedQuery: string,
  queryTokens: readonly string[],
  fuzzyTokenScores: ReadonlyMap<string, ReadonlyMap<number, number>>,
  scope?: SearchScope,
): number | null {
  let score = 0;

  for (const token of queryTokens) {
    const exactTokenScore = Math.max(
      ...entry.fields.map((field) => scoreField(field, token, scope)),
      0,
    );
    const fuzzyTokenScore = fuzzyTokenScores.get(token)?.get(entry.sourceIndex) ?? 0;
    const tokenScore = Math.max(exactTokenScore, fuzzyTokenScore);

    if (tokenScore === 0) {
      return null;
    }

    score += tokenScore;
  }

  const scopedFields = scope
    ? entry.fields.filter(
        (field) => field.kind === scope || (scope === "service" && field.kind === "alias"),
      )
    : entry.fields;

  if (scopedFields.some((field) => field.normalizedText === normalizedQuery)) {
    score += 100;
  } else if (scopedFields.some((field) => field.normalizedText.includes(normalizedQuery))) {
    score += 35;
  }

  return score;
}

function compareSearchResults(left: ScoredSearchResult, right: ScoredSearchResult): number {
  return right.score - left.score || left.sourceIndex - right.sourceIndex;
}

/** Searches the index with normalized, multi-word matching and stable relevance ranking. */
export function searchServiceIndex(
  index: ServiceSearchIndex,
  query: string,
): readonly ServiceSearchResult[] {
  const { normalizedQuery, queryTokens, scope } = parseServiceSearchQuery(query);

  if (queryTokens.length === 0) {
    return index.entries.map(({ service }) => ({
      matchedTerms: [],
      score: 0,
      service,
    }));
  }

  const fuzzyTokenScores = new Map(
    queryTokens.map((token) => [token, buildFuzzyTokenScores(index, token, scope)]),
  );

  const matches = index.entries
    .map((entry): ScoredSearchResult | null => {
      const score = scoreEntry(entry, normalizedQuery, queryTokens, fuzzyTokenScores, scope);

      if (score === null) {
        return null;
      }

      return {
        matchedTerms: queryTokens,
        score,
        service: entry.service,
        sourceIndex: entry.sourceIndex,
      };
    })
    .filter((result): result is ScoredSearchResult => result !== null);
  const rankedMatches: typeof matches = [];

  for (const match of matches) {
    const insertionIndex = rankedMatches.findIndex(
      (rankedMatch) => compareSearchResults(match, rankedMatch) < 0,
    );

    if (insertionIndex === -1) {
      rankedMatches.push(match);
    } else {
      rankedMatches.splice(insertionIndex, 0, match);
    }
  }

  return rankedMatches.map(({ matchedTerms, score, service }) => ({
    matchedTerms,
    score,
    service,
  }));
}

/** Builds a temporary index and searches the supplied mappings in one operation. */
export function searchServices(
  services: readonly ServiceMapping[],
  query: string,
): readonly ServiceSearchResult[] {
  return searchServiceIndex(buildServiceSearchIndex(services), query);
}
