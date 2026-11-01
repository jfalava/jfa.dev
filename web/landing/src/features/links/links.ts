import { secretFromBinding } from "@jfa.dev/common/secrets";
import { createServerFn } from "@tanstack/react-start";
import * as Result from "effect/Result";
import * as Schema from "effect/Schema";

const GITHUB_REPOSITORIES_URL =
  "https://api.github.com/users/jfalava/repos?sort=pushed&direction=desc&per_page=12&type=owner";
const MAX_REPOSITORIES = 6;
const REPOSITORY_CACHE_NAME = "github-repositories";
const REPOSITORY_CACHE_SECONDS = 15 * 60;

const repositoryLinkSchema = Schema.Struct({ name: Schema.String, url: Schema.String });
const repositoryLinksSchema = Schema.Array(repositoryLinkSchema);
export type RepositoryLink = Schema.Schema.Type<typeof repositoryLinkSchema>;

const githubRepositorySchema = Schema.Struct({
  name: Schema.String,
  html_url: Schema.String,
  archived: Schema.optional(Schema.Boolean),
  fork: Schema.optional(Schema.Boolean),
});
const githubRepositoriesSchema = Schema.Array(githubRepositorySchema);
type GitHubRepository = Schema.Schema.Type<typeof githubRepositorySchema>;

const githubEnvSchema = Schema.Struct({ GITHUB_TOKEN: Schema.optional(secretFromBinding) });

const fallbackRepository: RepositoryLink = {
  name: "jfa.dev",
  url: "https://github.com/jfalava/jfa.dev",
};

function parseRepository(value: GitHubRepository): RepositoryLink | null {
  if (value.archived === true || value.fork === true) {
    return null;
  }

  let url: URL;
  try {
    url = new URL(value.html_url);
  } catch {
    return null;
  }

  if (url.protocol !== "https:" || url.hostname !== "github.com") {
    return null;
  }

  return { name: value.name, url: url.toString() };
}

/**
 * Reads the `GITHUB_TOKEN` Secrets Store binding. Unauthenticated calls share
 * Cloudflare egress IPs and GitHub's 60/hour per-IP limit, so they fail
 * intermittently; a token gets its own 5,000/hour budget.
 */
async function readGithubToken(): Promise<string> {
  try {
    // @vite-ignore — `cloudflare:workers` only exists in workerd.
    const { env } = await import("cloudflare:workers");
    // Secrets Store keys are not declared on `Env`; the schema is the
    // narrowing boundary and strips every other binding.
    const { GITHUB_TOKEN } = await Schema.decodeUnknownPromise(githubEnvSchema)(env);
    return GITHUB_TOKEN ?? "";
  } catch {
    return "";
  }
}

async function fetchRepositoryLinks(): Promise<readonly RepositoryLink[] | null> {
  const headers = new Headers({
    Accept: "application/vnd.github+json",
    "User-Agent": "jfa.dev landing page",
    "X-GitHub-Api-Version": "2022-11-28",
  });
  const token = await readGithubToken();
  if (token.length === 0) {
    console.warn("GITHUB_TOKEN binding unavailable; using unauthenticated GitHub API");
  } else {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(GITHUB_REPOSITORIES_URL, { headers });

  if (!response.ok) {
    console.warn("GitHub repositories request failed", {
      status: response.status,
      rateLimitRemaining: response.headers.get("x-ratelimit-remaining"),
    });
    return null;
  }

  const parsed = Schema.decodeUnknownResult(githubRepositoriesSchema)(await response.json());
  if (Result.isFailure(parsed)) {
    console.warn("GitHub repositories response did not match schema");
    return null;
  }

  const repositories = parsed.success
    .map(parseRepository)
    .filter((repository): repository is RepositoryLink => repository !== null)
    .slice(0, MAX_REPOSITORIES);

  return repositories.length > 0 ? repositories : null;
}

/**
 * Returns the owner's most recently pushed public repositories. GitHub's
 * pushed sort is used as the lightweight signal for "currently working on".
 * Successful lists are kept in the colo cache so page views do not spend the
 * shared unauthenticated GitHub rate limit; failures are never cached.
 */
export const getRepositoryLinks = createServerFn({ method: "GET" }).handler(
  async (): Promise<readonly RepositoryLink[]> => {
    try {
      const cache = await caches.open(REPOSITORY_CACHE_NAME);
      const cached = await cache.match(GITHUB_REPOSITORIES_URL);
      if (cached !== undefined) {
        return Schema.decodeUnknownSync(repositoryLinksSchema)(await cached.json());
      }

      const repositories = await fetchRepositoryLinks();
      if (repositories === null) {
        return [fallbackRepository];
      }

      await cache.put(
        GITHUB_REPOSITORIES_URL,
        Response.json(repositories, {
          headers: { "Cache-Control": `max-age=${REPOSITORY_CACHE_SECONDS}` },
        }),
      );
      return repositories;
    } catch (error) {
      console.warn("GitHub repositories lookup failed", error);
      return [fallbackRepository];
    }
  },
);
