import { GitHubClient } from "./client.js";
import type { GitHubProfileStats } from "../types.js";

const excludedLanguages = new Set(["JavaScript", "Jupyter Notebook"]);

export class StatsAggregator {
  constructor(private readonly githubClient: GitHubClient) {}

  async getProfileStats(username: string): Promise<GitHubProfileStats> {
    const user = await this.githubClient.getUser(username);
    const repos = await this.githubClient.getOwnedRepos(username).catch(() => []);
    const organizations = await this.githubClient.getOrganizations(username).catch(() => []);
    const contributionMetrics = await this.githubClient.getContributionMetrics(username).catch(() => ({
      currentYearCount: null,
      previousYearCount: null,
      summary: user.public_repos > 0 ? "public contribution data unavailable" : "no public repos"
    }));

    const nonForkRepos = repos.filter((repo) => !repo.fork);
    const languages = new Map<string, number>();

    for (const repo of nonForkRepos) {
      if (!repo.language || excludedLanguages.has(repo.language)) {
        continue;
      }

      languages.set(repo.language, (languages.get(repo.language) ?? 0) + 1);
    }

    const topLanguages = [...languages.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([language]) => language);

    const totalStars = nonForkRepos.reduce((sum, repo) => sum + repo.stargazers_count, 0);
    const contributionSummary = `${(contributionMetrics.currentYearCount ?? 0).toLocaleString("en-US")} contributions`;
    const starSummary =
      totalStars === 0
        ? "0 starred repos"
        : `${totalStars.toLocaleString("en-US")} starred repos`;

    return {
      username: user.login,
      displayName: user.name ?? user.login,
      profileUrl: user.html_url,
      avatarUrl: user.avatar_url,
      repoCount: user.public_repos,
      organizationCount: organizations.length,
      languageCount: languages.size,
      topLanguages,
      totalStars,
      commitsThisYear: contributionMetrics.currentYearCount ?? 0,
      commitsLastYear: contributionMetrics.previousYearCount ?? 0,
      commitSummary: contributionSummary,
      contributionsSummary: contributionMetrics.summary,
      repoSummary:
        repos.length === 0 && user.public_repos > 0
          ? "public repo data unavailable"
          : starSummary
    };
  }
}
