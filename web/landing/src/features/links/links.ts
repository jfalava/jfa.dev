import { createServerFn } from "@tanstack/react-start";
import * as Result from "effect/Result";
import * as Schema from "effect/Schema";

const GITHUB_REPOSITORIES_URL =
  "https://api.github.com/users/jfalava/repos?sort=pushed&direction=desc&per_page=12&type=owner";
const MAX_REPOSITORIES = 6;

export interface RepositoryLink {
  name: string;
  url: string;
}

const githubRepositorySchema = Schema.Struct({
  name: Schema.String,
  html_url: Schema.String,
  archived: Schema.optional(Schema.Boolean),
  fork: Schema.optional(Schema.Boolean),
});
const githubRepositoriesSchema = Schema.Array(githubRepositorySchema);
type GitHubRepository = Schema.Schema.Type<typeof githubRepositorySchema>;

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
 * Returns the owner's most recently pushed public repositories. GitHub's
 * pushed sort is used as the lightweight signal for "currently working on".
 */
export const getRepositoryLinks = createServerFn({ method: "GET" }).handler(
  async (): Promise<RepositoryLink[]> => {
    try {
      const response = await fetch(GITHUB_REPOSITORIES_URL, {
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "jfa.dev landing page",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      });

      if (!response.ok) {
        return [fallbackRepository];
      }

      const parsed = Schema.decodeUnknownResult(githubRepositoriesSchema)(await response.json());
      if (Result.isFailure(parsed)) {
        return [fallbackRepository];
      }

      const repositories = parsed.success
        .map(parseRepository)
        .filter((repository): repository is RepositoryLink => repository !== null)
        .slice(0, MAX_REPOSITORIES);

      return repositories.length > 0 ? repositories : [fallbackRepository];
    } catch {
      return [fallbackRepository];
    }
  },
);
