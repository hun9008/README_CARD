export type ThemeName = "terminal" | "dark" | "light";

export interface GitHubProfileStats {
  username: string;
  displayName: string;
  profileUrl: string;
  avatarUrl: string;
  repoCount: number;
  languageCount: number;
  topLanguages: string[];
  totalStars: number;
  openSourceRatio: number;
  commitsLastYear: number | null;
  commitSummary: string;
  contributionsSummary: string;
  repoSummary: string;
}
