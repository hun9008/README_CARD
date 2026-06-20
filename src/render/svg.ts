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

function summarizeLanguages(languages: string[], maxLength: number): string {
  if (languages.length === 0) {
    return "No dominant language";
  }

  const separator = " · ";
  let summary = "";
  let shownCount = 0;

  for (const language of languages) {
    const nextValue = summary ? `${summary}${separator}${language}` : language;
    if (nextValue.length > maxLength) {
      break;
    }

    summary = nextValue;
    shownCount += 1;
  }

  if (shownCount === languages.length) {
    return summary;
  }

  const remainingCount = languages.length - shownCount;
  const moreLabel = ` +${remainingCount} more`;
  if (!summary) {
    return languages[0];
  }

  if (`${summary}${moreLabel}`.length <= maxLength) {
    return `${summary}${moreLabel}`;
  }

  return summary;
}

export function renderStatsCard(stats: GitHubProfileStats, themeName: ThemeName): string {
  const theme = themes[themeName] ?? themes.terminal;
  const languages = stats.topLanguages.length > 0 ? stats.topLanguages.join(" · ") : "No dominant language";
  const displayLanguages = summarizeLanguages(stats.topLanguages, 34);
  const commitCount = stats.commitsLastYear ?? 0;
  const commitValue = commitCount.toLocaleString("en-US");
  const commitBar = renderBar(commitCount, 3000);
  const repoBar = renderBar(Math.min(stats.repoCount, 100), 100);
  const openSourceBar = renderBar(stats.openSourceRatio, 100);
  const width = 720;
  const height = 320;

  return `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="title desc">
  <title id="title">${escapeXml(stats.username)} GitHub Stats</title>
  <desc id="desc">Dynamic GitHub stats card rendered as terminal-style SVG.</desc>
  <rect width="${width}" height="${height}" rx="18" fill="${theme.background}" />
  <rect x="16" y="16" width="${width - 32}" height="${height - 32}" rx="14" fill="${theme.panel}" stroke="${theme.border}" />
  <text x="36" y="52" fill="${theme.accent}" font-family="'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace" font-size="20">$ github-stats --user ${escapeXml(stats.username)}</text>
  <text x="36" y="84" fill="${theme.text}" font-family="'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace" font-size="26">${escapeXml(stats.displayName)}</text>
  <text x="36" y="110" fill="${theme.muted}" font-family="'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace" font-size="15">${escapeXml(stats.profileUrl)}</text>

  <text x="36" y="154" fill="${theme.muted}" font-family="'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace" font-size="15">repos</text>
  <text x="140" y="154" fill="${theme.text}" font-family="'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace" font-size="15">${stats.repoCount.toLocaleString("en-US")}</text>
  <text x="230" y="154" fill="${theme.success}" font-family="'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace" font-size="15">${repoBar}</text>

  <text x="36" y="184" fill="${theme.muted}" font-family="'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace" font-size="15">commits</text>
  <text x="140" y="184" fill="${theme.text}" font-family="'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace" font-size="15">${escapeXml(commitValue)}</text>
  <text x="230" y="184" fill="${theme.success}" font-family="'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace" font-size="15">${commitBar}</text>

  <text x="36" y="214" fill="${theme.muted}" font-family="'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace" font-size="15">langs</text>
  <text x="140" y="214" fill="${theme.text}" font-family="'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace" font-size="15">${stats.languageCount}</text>
  <text x="230" y="214" fill="${theme.text}" font-family="'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace" font-size="15">${escapeXml(displayLanguages)}<title>${escapeXml(languages)}</title></text>

  <text x="36" y="244" fill="${theme.muted}" font-family="'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace" font-size="15">open src</text>
  <text x="140" y="244" fill="${theme.text}" font-family="'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace" font-size="15">${stats.openSourceRatio}%</text>
  <text x="230" y="244" fill="${theme.success}" font-family="'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace" font-size="15">${openSourceBar}</text>

  <text x="36" y="286" fill="${theme.muted}" font-family="'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace" font-size="14">${escapeXml(stats.commitSummary)}</text>
  <text x="510" y="286" text-anchor="end" fill="${theme.muted}" font-family="'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace" font-size="14">${escapeXml(stats.repoSummary)}</text>
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
