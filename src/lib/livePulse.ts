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

  return TRACKED_SOURCES.map((source, i) => {
    const trend = topTopics[i % Math.max(1, topTopics.length)] || trends[0];
    const impactBase = trend ? Math.round((trend.profitability + (trend.searches / 15000) * 100) / 2) : 70;
    const impact = clamp(impactBase, 10, 95);

    const delta = trend && trend.demand === "high" ? 15 : trend?.demand === "medium" ? 5 : -5;
    const trendDirection: "up" | "down" | "stable" = delta > 5 ? "up" : delta < -5 ? "down" : "stable";

    const confidence = trend && trend.competition === "low" ? 90 : 70;

    return {
      name: source.name,
      url: source.url,
      status: "live",
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
  // إزالة التلاعب العشوائي؛ نحن نعتمد الآن على البيانات كما هي إلى أن يتم التحديث عبر AI.
  return trends;
}

