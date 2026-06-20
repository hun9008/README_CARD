const githubApiBase = "https://api.github.com";
const githubGraphqlUrl = "https://api.github.com/graphql";
const githubProfileBase = "https://github.com";

export interface GitHubUser {
  login: string;
  name: string | null;
  html_url: string;
  avatar_url: string;
  public_repos: number;
}

export interface GitHubRepo {
  name: string;
  fork: boolean;
  stargazers_count: number;
  language: string | null;
}

interface GitHubRepoContributor {
  login?: string;
  contributions: number;
}

interface GraphQLContributionsResponse {
  data?: {
    user: {
      contributionsCollection: {
        contributionCalendar: {
          totalContributions: number;
        };
      };
    } | null;
  };
  errors?: Array<{ message: string }>;
}

interface GitHubPublicEvent {
  type: string;
  created_at: string;
  payload?: {
    commits?: Array<unknown>;
  };
}

export interface ContributionCount {
  count: number | null;
  summary: string;
}

function resolveGitHubToken(): string | undefined {
  return (
    process.env.GITHUB_TOKEN ??
    process.env.GH_TOKEN ??
    process.env.GITHUB_PAT ??
    process.env.GITHUB_ACCESS_TOKEN
  );
}

export class GitHubClient {
  constructor(private readonly token = resolveGitHubToken()) {}

  async getUser(username: string): Promise<GitHubUser> {
    return this.request<GitHubUser>(`/users/${username}`);
  }

  async getOwnedRepos(username: string): Promise<GitHubRepo[]> {
    const repos: GitHubRepo[] = [];
    let page = 1;

    while (true) {
      const batch = await this.request<GitHubRepo[]>(
        `/users/${username}/repos?per_page=100&type=owner&sort=updated&page=${page}`
      );

      repos.push(...batch);

      if (batch.length < 100) {
        return repos;
      }

      page += 1;
    }
  }

  async getContributionCount(username: string, repos: GitHubRepo[]): Promise<ContributionCount> {
    const lastYearCount = await this.getContributionsLastYear(username);
    if (lastYearCount !== null) {
      return {
        count: lastYearCount,
        summary: "last 12 months"
      };
    }

    const publicCalendarCount = await this.getPublicContributionCalendarCount(username);
    if (publicCalendarCount !== null) {
      return {
        count: publicCalendarCount,
        summary: "public contribution calendar"
      };
    }

    if (this.token) {
      const repoContributorCount = await this.getRepoContributorCommitCount(username, repos);
      if (repoContributorCount !== null) {
        return {
          count: repoContributorCount,
          summary: "public repo contributor totals"
        };
      }
    }

    const publicCommitCount = await this.getRecentPublicCommitCount(username);
    if (publicCommitCount !== null) {
      return {
        count: publicCommitCount,
        summary: "recent public push events"
      };
    }

    return {
      count: null,
      summary: "public repo data only"
    };
  }

  private async getContributionsLastYear(username: string): Promise<number | null> {
    if (!this.token) {
      return null;
    }

    const now = new Date();
    const from = new Date(now);
    from.setUTCFullYear(now.getUTCFullYear() - 1);

    const query = `
      query UserContributions($login: String!, $from: DateTime!, $to: DateTime!) {
        user(login: $login) {
          contributionsCollection(from: $from, to: $to) {
            contributionCalendar {
              totalContributions
            }
          }
        }
      }
    `;

    const response = await fetch(githubGraphqlUrl, {
      method: "POST",
      headers: this.buildHeaders(),
      body: JSON.stringify({
        query,
        variables: {
          login: username,
          from: from.toISOString(),
          to: now.toISOString()
        }
      })
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as GraphQLContributionsResponse;
    if (payload.errors?.length) {
      return null;
    }

    return payload.data?.user?.contributionsCollection.contributionCalendar.totalContributions ?? null;
  }

  private async getPublicContributionCalendarCount(username: string): Promise<number | null> {
    const now = new Date();
    const to = now.toISOString().slice(0, 10);
    const fromDate = new Date(now);
    fromDate.setUTCFullYear(now.getUTCFullYear() - 1);
    const from = fromDate.toISOString().slice(0, 10);
    const response = await fetch(
      `${githubProfileBase}/users/${encodeURIComponent(username)}/contributions?from=${from}&to=${to}`,
      {
        headers: {
          "User-Agent": "readme-card",
          Accept: "text/html,application/xhtml+xml"
        }
      }
    ).catch(() => null);

    if (!response?.ok) {
      return null;
    }

    const html = await response.text();
    const count = this.extractContributionCountFromHtml(html);
    return count;
  }

  private async getRepoContributorCommitCount(
    username: string,
    repos: GitHubRepo[]
  ): Promise<number | null> {
    const ownedNonForkRepos = repos.filter((repo) => !repo.fork);
    if (ownedNonForkRepos.length === 0) {
      return 0;
    }

    const normalizedUsername = username.toLowerCase();
    let total = 0;
    let completed = 0;

    for (let index = 0; index < ownedNonForkRepos.length; index += 8) {
      const batch = ownedNonForkRepos.slice(index, index + 8);
      const results = await Promise.all(
        batch.map(async (repo) => {
          try {
            const contributors = await this.request<GitHubRepoContributor[]>(
              `/repos/${username}/${repo.name}/contributors?per_page=100`
            );

            const userContribution = contributors.find(
              (contributor) => contributor.login?.toLowerCase() === normalizedUsername
            );

            completed += 1;
            return userContribution?.contributions ?? 0;
          } catch {
            completed += 1;
            return 0;
          }
        })
      );

      total += results.reduce((sum, value) => sum + value, 0);
    }

    return completed > 0 ? total : null;
  }

  private async getRecentPublicCommitCount(username: string): Promise<number | null> {
    try {
      const events = await this.request<GitHubPublicEvent[]>(
        `/users/${username}/events/public?per_page=100`
      );

      let commitCount = 0;

      for (const event of events) {
        if (event.type !== "PushEvent") {
          continue;
        }

        commitCount += event.payload?.commits?.length ?? 0;
      }

      return commitCount;
    } catch {
      return 0;
    }
  }

  private async request<T>(path: string): Promise<T> {
    const response = await fetch(`${githubApiBase}${path}`, {
      headers: this.buildHeaders()
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`GitHub request failed (${response.status}): ${body}`);
    }

    return (await response.json()) as T;
  }

  private buildHeaders(): HeadersInit {
    return {
      Accept: "application/vnd.github+json",
      "User-Agent": "readme-card",
      ...(this.token ? { Authorization: `Bearer ${this.token}` } : {})
    };
  }

  private extractContributionCountFromHtml(html: string): number | null {
    const patterns = [
      /([0-9][0-9,]*)\s+contributions?\s+in\s+the\s+last\s+year/i,
      /([0-9][0-9,]*)\s+contributions?/i
    ];

    for (const pattern of patterns) {
      const matched = html.match(pattern);
      if (!matched?.[1]) {
        continue;
      }

      const numericValue = Number(matched[1].replaceAll(",", ""));
      if (Number.isFinite(numericValue)) {
        return numericValue;
      }
    }

    return null;
  }
}
