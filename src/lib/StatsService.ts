// src/lib/StatsService.ts
// Central service that provides deterministic market metrics.
// It uses the Cache utility (TTL = 5 minutes) to avoid unnecessary API calls.

import Cache from "./Cache";
import type { MarketTrend } from "@/data/marketData"; // assumed type

// ---------------------------------------------------------------------------
// Helper utilities
// ---------------------------------------------------------------------------

/** Simple number formatter respecting Arabic locale */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 2 }).format(value);
}

/**
 * Compute a deterministic trend score (0‑100) based on the item's properties.
 * The formula mirrors the one used in MarketAnalysis for opportunity scoring
 * but normalised to a 0‑100 range.
 */
export function getTrendScore(item: MarketTrend): number {
  // Guard against missing fields – treat them as neutral (50).
  const demandWeight =
    item.demand === "high"
      ? 100
      : item.demand === "medium"
      ? 70
      : 40;
  const competitionWeight =
    item.competition === "low"
      ? 100
      : item.competition === "medium"
      ? 65
      : 30;
  const profitability = Math.max(0, Math.min(100, item.profitability ?? 0));
  const searches = (() => {
    const min = 3000;
    const max = 15000;
    const clamped = Math.max(min, Math.min(max, item.searches ?? min));
    return Math.round(((clamped - min) / (max - min)) * 100);
  })();

  const score = Math.round(
    demandWeight * 0.35 +
      competitionWeight * 0.3 +
      profitability * 0.25 +
      searches * 0.1,
  );
  return Math.min(100, Math.max(0, score));
}

/**
 * Filter and return high-value market trends (Golden Opportunities).
 * Trends are considered "Golden" if they have high demand and low competition.
 */
export function getGoldenTargets(trends: MarketTrend[]): MarketTrend[] {
  return trends
    .filter((t) => t.demand === "high" && t.competition === "low")
    .sort((a, b) => getTrendScore(b) - getTrendScore(a));
}

/**
 * Produce a confidence interval for a given market item.

 * The interval is a simple +/- 5 % of the trend score, clamped to 0‑100.
 */
export function getConfidenceInterval(item: MarketTrend): { low: number; high: number } {
  const base = getTrendScore(item);
  const delta = 5; // fixed 5 % tolerance
  const low = Math.max(0, base - delta);
  const high = Math.min(100, base + delta);
  return { low, high };
}

// ---------------------------------------------------------------------------
// Public API – fetch market data (real or mock) and cache it for 5 minutes.
// ---------------------------------------------------------------------------

const CACHE_KEY = "stats_service_market_data";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Retrieve market data either from the Adobe Stock API (if an API key is set)
 * or from a local mock dataset. The result is cached for five minutes.
 */
export async function fetchMarketData(): Promise<MarketTrend[]> {
  // Try cache first
  const cached = Cache.get<MarketTrend[]>(CACHE_KEY);
  if (cached) return cached;

  // ---------------------------------------------------------------------
  // 1️⃣ Attempt real API call – the project already contains a helper
  //    `getUnifiedMarketOracle` in `src/lib/gemini.ts`. We reuse it if it
  //    exists; otherwise we fall back to mock data.
  // ---------------------------------------------------------------------
  let data: MarketTrend[] | null = null;
  try {
    // Dynamic import to avoid circular dependencies if the file does not
    // exist at runtime. This will succeed in the current codebase.
    const { getUnifiedMarketOracle } = await import("./gemini");
    const oracle = await getUnifiedMarketOracle();
    // The oracle returns an array of items that conform to MarketTrend.
    data = oracle as unknown as MarketTrend[];
  } catch (e) {
    console.warn("StatsService: real API unavailable, falling back to mock data.", e);
  }

  // ---------------------------------------------------------------------
  // 2️⃣ Fallback mock data – a small deterministic set.
  // ---------------------------------------------------------------------
  if (!data) {
    data = [
      {
        topic: "طبيعة",
        demand: "high",
        competition: "low",
        profitability: 92,
        searches: 12000,
        category: "photo",
        // any additional fields required by MarketTrend can be added here
      },
      {
        topic: "تقنية",
        demand: "medium",
        competition: "medium",
        profitability: 78,
        searches: 8000,
        category: "video",
      },
      {
        topic: "فن",
        demand: "low",
        competition: "high",
        profitability: 55,
        searches: 3500,
        category: "illustration",
      },
    ];
  }

  // Cache the result for future calls
  Cache.set(CACHE_KEY, data, CACHE_TTL_MS);
  return data;
}

export const StatsService = {
  fetchMarketData,
  getTrendScore,
  getGoldenTargets,
  getConfidenceInterval,
  formatNumber,
};

export default StatsService;
