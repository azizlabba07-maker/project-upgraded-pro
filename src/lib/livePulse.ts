// src/lib/livePulse.ts
import type { MarketTrend } from "@/data/marketData";
import { StatsService } from "./StatsService";

export interface SourcePulse {
  name: string;
  url: string;
  status: "live" | "delayed" | "manual";
  impact: number;
  delta: number;
  detectedTopic: string;
  lastChecked: string;
  trend: "up" | "down" | "stable";
  confidence: number;
}

export const TRACKED_SOURCES = [
  { name: "Adobe Stock Intelligence", url: "https://stock.adobe.com/contributor" },
  { name: "Google Trends Realtime", url: "https://trends.google.com" },
  { name: "Pinterest Visual Pulse", url: "https://www.pinterest.com/trends/" },
  { name: "Behance Discovery", url: "https://www.behance.net" },
  { name: "Shutterstock Live", url: "https://www.shutterstock.com/contribute" },
  { name: "Freepik Contributor", url: "https://www.freepik.com/sell" },
  { name: "Unsplash Market", url: "https://unsplash.com" },
  { name: "Dribbble Trends", url: "https://dribbble.com" },
];

/**
 * Creates mapping between global tracked sources and actual market trends.
 * Grounded in deterministic StatsService scores.
 */
export function createSourcePulse(trends: MarketTrend[]): SourcePulse[] {
  if (!trends || trends.length === 0) return [];

  const sortedTrends = [...trends].sort((a, b) => StatsService.getTrendScore(b) - StatsService.getTrendScore(a));

  return TRACKED_SOURCES.map((source, i) => {
    const trend = sortedTrends[i % sortedTrends.length];
    const score = StatsService.getTrendScore(trend);
    
    // Impact is directly linked to deterministic opportunity score
    const impact = Math.round(score * 0.95 + (i % 5)); 
    
    // Delta based on demand
    const delta = trend.demand === "high" ? 15 : trend.demand === "medium" ? 5 : -5;
    const trendDirection: "up" | "down" | "stable" = delta > 10 ? "up" : delta < 0 ? "down" : "stable";
    
    // Confidence interval from StatsService
    const { high: confidence } = StatsService.getConfidenceInterval(trend);

    return {
      name: source.name,
      url: source.url,
      status: "live",
      impact: Math.min(99, impact),
      delta,
      detectedTopic: trend.topic,
      lastChecked: new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }),
      trend: trendDirection,
      confidence
    };
  });
}

export function pulseLocalTrends(trends: MarketTrend[]): MarketTrend[] {
  // Return deterministic trends, but keep the "pulse" feeling with tiny search variance
  return trends.map(t => ({
    ...t,
    searches: Math.round(t.searches * (0.999 + Math.random() * 0.002))
  }));
}

export async function fetchMarketPulseFromBackend(): Promise<MarketTrend[] | null> {
  // In the future, this will hit a real endpoint.
  // For now, StatsService handles the "reality" layer.
  return null;
}


