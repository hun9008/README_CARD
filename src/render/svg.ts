import type { GitHubProfileStats, ThemeName } from "../types.js";

interface ThemePalette {
  background: string;
  panel: string;
  border: string;
  text: string;
  muted: string;
  accent: string;
  success: string;
}

const themes: Record<ThemeName, ThemePalette> = {
  terminal: {
    background: "#0d1117",
    panel: "#161b22",
    border: "#30363d",
    text: "#e6edf3",
    muted: "#7d8590",
    accent: "#3fb950",
    success: "#2ea043"
  },
  dark: {
    background: "#111827",
    panel: "#1f2937",
    border: "#374151",
    text: "#f9fafb",
    muted: "#9ca3af",
    accent: "#22c55e",
    success: "#16a34a"
  },
  light: {
    background: "#f8fafc",
    panel: "#ffffff",
    border: "#cbd5e1",
    text: "#0f172a",
    muted: "#475569",
    accent: "#15803d",
    success: "#16a34a"
  }
};

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function escapeUsername(username: string | undefined): string {
  return escapeXml(username && username.trim() ? username : "unknown");
}

function renderBar(value: number, max = 100): string {
  const filled = Math.max(0, Math.min(20, Math.round((value / max) * 20)));
  return `${"█".repeat(filled)}${"░".repeat(20 - filled)}`;
}

function splitLanguagesIntoTwoLines(languages: string[]): [string, string] {
  if (languages.length === 0) {
    return ["No dominant language", ""];
  }

  if (languages.length === 1) {
    return [languages[0], ""];
  }

  const separator = " · ";
  let firstLine = languages[0];
  let secondLine = "";

  for (let index = 1; index < languages.length; index += 1) {
    const language = languages[index];
    const nextFirstLine = `${firstLine}${separator}${language}`;
    if (firstLine.length <= secondLine.length) {
      firstLine = nextFirstLine;
      continue;
    }

    secondLine = secondLine ? `${secondLine}${separator}${language}` : language;
  }

  return [firstLine, secondLine];
}

function getRepoBarMax(repoCount: number): number {
  return Math.max(100, Math.ceil(Math.max(repoCount, 1) / 100) * 100);
}

export function renderStatsCard(stats: GitHubProfileStats, themeName: ThemeName): string {
  const theme = themes[themeName] ?? themes.terminal;
  const [firstLanguageLine, secondLanguageLine] = splitLanguagesIntoTwoLines(stats.topLanguages);
  const commitCount = stats.commitsThisYear ?? 0;
  const commitValue = commitCount.toLocaleString("en-US");
  const commitMax = Math.max(stats.commitsLastYear ?? 0, 1);
  const repoMax = getRepoBarMax(stats.repoCount);
  const repoProgress = `${stats.repoCount.toLocaleString("en-US")} / ${repoMax.toLocaleString("en-US")}`;
  const commitProgress = `${commitCount.toLocaleString("en-US")} / ${(stats.commitsLastYear ?? 0).toLocaleString("en-US")}`;
  const commitBar = renderBar(Math.min(commitCount, commitMax), commitMax);
  const repoBar = renderBar(stats.repoCount, repoMax);
  const width = 580;
  const height = 330;
  const labelX = 36;
  const valueX = 122;
  const barX = 214;
  const metaX = 404;

  return `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="title desc">
  <title id="title">${escapeXml(stats.username)} GitHub Stats</title>
  <desc id="desc">Dynamic GitHub stats card rendered as terminal-style SVG.</desc>
  <rect width="${width}" height="${height}" rx="18" fill="${theme.background}" />
  <rect x="16" y="16" width="${width - 32}" height="${height - 32}" rx="14" fill="${theme.panel}" stroke="${theme.border}" />
  <text x="36" y="52" fill="${theme.accent}" font-family="'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace" font-size="19">$ github-stats --user ${escapeXml(stats.username)}</text>
  <text x="36" y="84" fill="${theme.text}" font-family="'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace" font-size="26">${escapeXml(stats.displayName)}</text>
  <text x="36" y="110" fill="${theme.muted}" font-family="'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace" font-size="15">${escapeXml(stats.profileUrl)}</text>

  <text x="${labelX}" y="154" fill="${theme.muted}" font-family="'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace" font-size="15">repos</text>
  <text x="${valueX}" y="154" fill="${theme.text}" font-family="'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace" font-size="15">${stats.repoCount.toLocaleString("en-US")}</text>
  <text x="${barX}" y="154" fill="${theme.success}" font-family="'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace" font-size="15">${repoBar}</text>
  <text x="${metaX}" y="154" fill="${theme.muted}" font-family="'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace" font-size="12">${escapeXml(repoProgress)}</text>

  <text x="${labelX}" y="186" fill="${theme.muted}" font-family="'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace" font-size="15">commits</text>
  <text x="${valueX}" y="186" fill="${theme.text}" font-family="'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace" font-size="15">${escapeXml(commitValue)}</text>
  <text x="${barX}" y="186" fill="${theme.success}" font-family="'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace" font-size="15">${commitBar}</text>
  <text x="${metaX}" y="186" fill="${theme.muted}" font-family="'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace" font-size="12">${escapeXml(commitProgress)}</text>

  <text x="${labelX}" y="220" fill="${theme.muted}" font-family="'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace" font-size="15">langs</text>
  <text x="${valueX}" y="220" fill="${theme.text}" font-family="'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace" font-size="15">${stats.languageCount}</text>
  <text x="${barX}" y="220" fill="${theme.text}" font-family="'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace" font-size="13">${escapeXml(firstLanguageLine)}</text>
  <text x="${barX}" y="240" fill="${theme.text}" font-family="'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace" font-size="13">${escapeXml(secondLanguageLine)}</text>

  <text x="${labelX}" y="296" fill="${theme.muted}" font-family="'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace" font-size="13">${escapeXml(stats.repoSummary)}</text>

</svg>`.trim();
}

export function renderErrorCard(
  username: string | undefined,
  themeName: ThemeName,
  message = "GitHub API temporarily unavailable"
): string {
  const theme = themes[themeName] ?? themes.terminal;
  const width = 720;
  const height = 220;

  return `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="title desc">
  <title id="title">${escapeUsername(username)} GitHub Stats Error</title>
  <desc id="desc">GitHub stats card could not be loaded right now.</desc>
  <rect width="${width}" height="${height}" rx="18" fill="${theme.background}" />
  <rect x="16" y="16" width="${width - 32}" height="${height - 32}" rx="14" fill="${theme.panel}" stroke="${theme.border}" />
  <text x="36" y="56" fill="${theme.accent}" font-family="'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace" font-size="20">$ github-stats --user ${escapeUsername(username)}</text>
  <text x="36" y="98" fill="${theme.text}" font-family="'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace" font-size="24">Unable to load stats</text>
  <text x="36" y="132" fill="${theme.muted}" font-family="'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace" font-size="15">${escapeXml(message)}</text>
  <text x="36" y="164" fill="${theme.muted}" font-family="'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace" font-size="15">Check GitHub token env vars or GitHub API rate limits, then retry.</text>
</svg>`.trim();
}
