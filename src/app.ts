import Fastify from "fastify";
import { MemoryCache } from "./cache/memory-cache.js";
import { GitHubClient } from "./github/client.js";
import { StatsAggregator } from "./github/stats.js";
import { renderErrorCard, renderStatsCard } from "./render/svg.js";
import type { ThemeName } from "./types.js";

export function buildServer() {
  const app = Fastify({
    logger: true
  });

  const cache = new MemoryCache<string>(24 * 60 * 60 * 1000);
  const inflightRequests = new Map<string, Promise<string>>();
  const githubClient = new GitHubClient();
  const statsAggregator = new StatsAggregator(githubClient);
  const supportedThemes = new Set<ThemeName>(["terminal", "dark", "light"]);

  app.get("/health", async () => ({
    ok: true
  }));

  app.get("/api/github-stats", async (request, reply) => {
    const query = request.query as {
      username?: string;
      theme?: ThemeName;
      refresh?: string;
    };

    if (!query.username) {
      reply.code(400);
      return {
        error: "username query parameter is required"
      };
    }

    const theme = supportedThemes.has(query.theme ?? "terminal")
      ? (query.theme ?? "terminal")
      : "terminal";
    const forceRefresh = query.refresh === "1" || query.refresh === "true";
    const cacheKey = `v4:${query.username}:${theme}`;
    const cachedEntry = cache.getEntry(cacheKey);
    const cached = !forceRefresh && cachedEntry && !cachedEntry.isExpired ? cachedEntry.value : null;

    if (cached) {
      reply
        .header("Content-Type", "image/svg+xml; charset=utf-8")
        .header("Cache-Control", "public, max-age=86400, s-maxage=86400, stale-while-revalidate=3600")
        .header("X-Cache", "HIT");
      return cached;
    }

    try {
      const svg = await getOrCreateSvg(cacheKey, async () => {
        const stats = await statsAggregator.getProfileStats(query.username!);
        const rendered = renderStatsCard(stats, theme);
        cache.set(cacheKey, rendered);
        return rendered;
      });

      reply
        .header("Content-Type", "image/svg+xml; charset=utf-8")
        .header("Cache-Control", "public, max-age=86400, s-maxage=86400, stale-while-revalidate=3600")
        .header("X-Cache", cachedEntry?.isExpired ? "REFRESH" : "MISS");

      return svg;
    } catch (error) {
      request.log.error(error);
      if (cachedEntry?.value) {
        reply
          .header("Content-Type", "image/svg+xml; charset=utf-8")
          .header("Cache-Control", "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400")
          .header("X-Cache", "STALE");

        return cachedEntry.value;
      }

      const message =
        error instanceof Error && error.message.includes("GitHub request failed (403)")
          ? "GitHub API rate limit or token issue"
          : "GitHub API temporarily unavailable";
      const svg = renderErrorCard(query.username, theme, message);

      reply
        .code(502)
        .header("Content-Type", "image/svg+xml; charset=utf-8")
        .header("Cache-Control", "no-store")
        .header("X-Cache", "BYPASS");

      return svg;
    }
  });

  function getOrCreateSvg(key: string, loader: () => Promise<string>): Promise<string> {
    const existing = inflightRequests.get(key);
    if (existing) {
      return existing;
    }

    const pending = loader().finally(() => {
      inflightRequests.delete(key);
    });

    inflightRequests.set(key, pending);
    return pending;
  }

  return app;
}
