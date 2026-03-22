import type { MarketTrend } from "@/data/marketData";

const MARKET_PULSE_URL = (import.meta as any).env?.VITE_MARKET_PULSE_URL as string | undefined;

export interface SourcePulse {
  name: string;
  url: string;
  status: "live" | "delayed" | "manual";
  impact: number; // 0-100
  delta: number; // +/- percentage
  detectedTopic: string;
  lastChecked: string;
  trend: "up" | "down" | "stable";
  confidence: number; // 0-100
}

export const TRACKED_SOURCES: Array<{ name: string; url: string; category: string }> = [
  { name: "Adobe Stock Contributor", url: "https://stock.adobe.com/contributor", category: "Direct" },
  { name: "Google Trends", url: "https://trends.google.com", category: "Trends" },
  { name: "Pinterest Trends", url: "https://www.pinterest.com/trends/", category: "Social" },
  { name: "Behance", url: "https://www.behance.net", category: "Creative" },
  { name: "EyeEm Market", url: "https://www.eyeem.com/market", category: "Mobile" },
  { name: "Shutterstock", url: "https://www.shutterstock.com/contribute", category: "Competitor" },
  { name: "Freepik", url: "https://www.freepik.com/sell", category: "Competitor" },
  { name: "Unsplash", url: "https://unsplash.com", category: "Free" },
  { name: "Pexels", url: "https://www.pexels.com", category: "Free" },
  { name: "Dribbble", url: "https://dribbble.com", category: "Design" },
];

function timeSeed(): number {
  // Changes every minute to create pulse-like behavior.
  return Math.floor(Date.now() / 60000);
}

function seededRandom(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export async function fetchMarketPulseFromBackend(): Promise<MarketTrend[] | null> {
  if (!MARKET_PULSE_URL) return null;

  try {
    const response = await fetch(MARKET_PULSE_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return Array.isArray(data.trends) ? data.trends : null;
  } catch (error) {
    console.warn("Failed to fetch market pulse from backend:", error);
    return null;
  }
}

export function createSourcePulse(trends: MarketTrend[]): SourcePulse[] {
  const topTopics = [...trends].sort((a, b) => b.searches - a.searches).slice(0, 10);
  const seed = timeSeed();
  const rnd = seededRandom(seed);

  return TRACKED_SOURCES.map((source, i) => {
    const trend = topTopics[i % Math.max(1, topTopics.length)] || trends[0];
    const impactBase = trend ? Math.round((trend.profitability + (trend.searches / 15000) * 100) / 2) : 70;
    const impact = clamp(impactBase + Math.round((rnd() - 0.5) * 20), 10, 95);

    const deltaRoll = rnd();
    const delta = deltaRoll > 0.6 ? Math.round((rnd() - 0.5) * 40) :
                 deltaRoll > 0.3 ? Math.round((rnd() - 0.5) * 20) :
                 Math.round((rnd() - 0.5) * 10);

    const trendDirection: "up" | "down" | "stable" =
      delta > 5 ? "up" : delta < -5 ? "down" : "stable";

    const confidence = clamp(Math.round(70 + (rnd() - 0.5) * 30), 50, 95);

    const statusRoll = rnd();
    const status: SourcePulse["status"] =
      statusRoll > 0.78 ? "manual" : statusRoll > 0.58 ? "delayed" : "live";

    return {
      name: source.name,
      url: source.url,
      status,
      impact,
      delta,
      detectedTopic: trend?.topic || "Market Opportunity",
      lastChecked: new Date().toLocaleTimeString("ar-EG"),
      trend: trendDirection,
      confidence
    };
  });
}

export function pulseLocalTrends(trends: MarketTrend[]): MarketTrend[] {
  const seed = timeSeed();
  const rnd = seededRandom(seed + 99);

  return trends.map((t) => {
    const demandBoost = t.demand === "high" ? 1.05 : t.demand === "medium" ? 1.0 : 0.95;
    const competitionFactor = t.competition === "low" ? 1.07 : t.competition === "medium" ? 1.0 : 0.92;

    const noise = 0.94 + rnd() * 0.14;
    const newSearches = Math.round(t.searches * demandBoost * competitionFactor * noise);
    const newProfit = clamp(Math.round((t.profitability * 0.7) + ((newSearches / 15000) * 30) + (rnd() - 0.5) * 8), 50, 99);

    return { ...t, searches: newSearches, profitability: newProfit };
  });
}

