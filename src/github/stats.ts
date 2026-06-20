import { GitHubClient } from "./client.js";
import type { GitHubProfileStats } from "../types.js";

const excludedLanguages = new Set(["JavaScript", "Jupyter Notebook"]);

export class StatsAggregator {
  constructor(private readonly githubClient: GitHubClient) {}

  async getProfileStats(username: string): Promise<GitHubProfileStats> {
    const user = await this.githubClient.getUser(username);
    const repos = await this.githubClient.getOwnedRepos(username).catch(() => []);
    const contributionCount =
      repos.length > 0
        ? await this.githubClient.getContributionCount(username, repos).catch(() => ({
            count: null,
            summary: "public repo data unavailable"
          }))
        : {
            count: null,
            summary: user.public_repos > 0 ? "public repo data unavailable" : "no public repos"
          };

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

    const publicRepoCount = repos.length;
    const openSourceRatio = publicRepoCount === 0 ? 0 : 100;
    const totalStars = nonForkRepos.reduce((sum, repo) => sum + repo.stargazers_count, 0);

    return {
      username: user.login,
      displayName: user.name ?? user.login,
      profileUrl: user.html_url,
      avatarUrl: user.avatar_url,
      repoCount: user.public_repos,
      languageCount: languages.size,
      topLanguages,
      totalStars,
      openSourceRatio,
      commitsLastYear: contributionCount.count ?? 0,
      commitSummary: contributionCount.count === null ? "commit count unavailable, showing 0" : contributionCount.summary,
      contributionsSummary: contributionCount.summary,
      repoSummary:
        repos.length === 0 && user.public_repos > 0
          ? "public repo data unavailable"
          : totalStars === 0
            ? "building in public"
            : `${totalStars} stars across public repos`
    };
  }
}
