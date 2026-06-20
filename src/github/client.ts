const githubApiBase = "https://api.github.com";
const githubGraphqlUrl = "https://api.github.com/graphql";
const githubProfileBase = "https://github.com";

export interface GitHubUser {
  login: string;
  name: string | null;
  html_url: string;
  avatar_url: string;
  public_repos: number;
  total_private_repos?: number;
}

export interface GitHubRepo {
  name: string;
  fork: boolean;
  stargazers_count: number;
  language: string | null;
}

export interface GitHubOrganization {
  login: string;
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

interface DateRange {
  from: Date;
  to: Date;
}

export interface ContributionMetrics {
  currentYearCount: number | null;
  previousYearCount: number | null;
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

  async getOrganizations(username: string): Promise<GitHubOrganization[]> {
    return this.request<GitHubOrganization[]>(`/users/${username}/orgs?per_page=100`);
  }

  async getContributionMetrics(username: string): Promise<ContributionMetrics> {
    const currentYearRange = this.getCurrentYearRange();
    const previousYearRange = this.getPreviousYearRange();

    const currentYearGraphql = await this.getGraphqlContributionCount(username, currentYearRange);
    const previousYearGraphql = await this.getGraphqlContributionCount(username, previousYearRange);
    const currentYearPublic = currentYearGraphql ?? await this.getPublicContributionCount(username, currentYearRange);
    const previousYearPublic =
      previousYearGraphql ?? await this.getPublicContributionCount(username, previousYearRange);

    if (currentYearGraphql !== null || currentYearPublic !== null) {
      return {
        currentYearCount: currentYearGraphql ?? currentYearPublic,
        previousYearCount: previousYearGraphql ?? previousYearPublic,
        summary: "public contributions this year"
      };
    }

    const recentPublicCommitCount = await this.getRecentPublicCommitCount(username, currentYearRange.from);
    if (recentPublicCommitCount !== null) {
      return {
        currentYearCount: recentPublicCommitCount,
        previousYearCount: previousYearGraphql ?? previousYearPublic,
        summary: "recent public push events this year"
      };
    }

    return {
      currentYearCount: null,
      previousYearCount: previousYearGraphql ?? previousYearPublic,
      summary: "public contribution data unavailable"
    };
  }

  private async getGraphqlContributionCount(username: string, range: DateRange): Promise<number | null> {
    if (!this.token) {
      return null;
    }

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
          from: range.from.toISOString(),
          to: range.to.toISOString()
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

  private async getPublicContributionCount(username: string, range: DateRange): Promise<number | null> {
    const from = this.formatDate(range.from);
    const to = this.formatDate(range.to);
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

  private async getRecentPublicCommitCount(username: string, since: Date): Promise<number | null> {
    try {
      const events = await this.request<GitHubPublicEvent[]>(
        `/users/${username}/events/public?per_page=100`
      );

      let commitCount = 0;

      for (const event of events) {
        if (event.type !== "PushEvent") {
          continue;
        }

        const createdAt = new Date(event.created_at);
        if (createdAt < since) {
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
    const counts = [...html.matchAll(/data-count="(\d+)"/g)].map((match) => Number(match[1]));
    if (counts.length > 0) {
      return counts.reduce((sum, value) => sum + value, 0);
    }

    const ariaLabelCounts = [...html.matchAll(/aria-label="(\d+)\s+contributions?\s+on/gi)].map((match) =>
      Number(match[1])
    );
    if (ariaLabelCounts.length > 0) {
      return ariaLabelCounts.reduce((sum, value) => sum + value, 0);
    }

    const titleCounts = [...html.matchAll(/title="(\d+)\s+contributions?\s+on/gi)].map((match) =>
      Number(match[1])
    );
    if (titleCounts.length > 0) {
      return titleCounts.reduce((sum, value) => sum + value, 0);
    }

    const tooltipCounts = [...html.matchAll(/>(\d+)\s+contributions?\s+on[^<]*</gi)].map((match) =>
      Number(match[1])
    );
    if (tooltipCounts.length > 0) {
      return tooltipCounts.reduce((sum, value) => sum + value, 0);
    }

    const summaryMatch =
      html.match(/>\s*([0-9][0-9,]*)\s+contributions?\s*</i) ??
      html.match(/([0-9][0-9,]*)\s+contributions?/i);
    if (summaryMatch?.[1]) {
      const numericValue = Number(summaryMatch[1].replaceAll(",", ""));
      if (Number.isFinite(numericValue)) {
        return numericValue;
      }
    }

    return null;
  }

  private getCurrentYearRange(): DateRange {
    const now = new Date();
    return {
      from: new Date(Date.UTC(now.getUTCFullYear(), 0, 1, 0, 0, 0, 0)),
      to: now
    };
  }

  private getPreviousYearRange(): DateRange {
    const now = new Date();
    const year = now.getUTCFullYear() - 1;
    return {
      from: new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0)),
      to: new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999))
    };
  }

  private formatDate(date: Date): string {
    return date.toISOString().slice(0, 10);
  }
}
