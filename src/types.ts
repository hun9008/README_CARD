export type ThemeName = "terminal" | "dark" | "light";

export interface GitHubProfileStats {
  username: string;
  displayName: string;
  profileUrl: string;
  avatarUrl: string;
  repoCount: number;
  organizationCount: number;
  languageCount: number;
  topLanguages: string[];
  totalStars: number;
  commitsThisYear: number | null;
  commitsLastYear: number | null;
  commitSummary: string;
  contributionsSummary: string;
  repoSummary: string;
}
