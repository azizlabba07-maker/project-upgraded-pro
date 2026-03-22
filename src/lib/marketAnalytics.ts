import type { MarketTrend } from "./marketData";

/**
 * تحليلات متقدمة للسوق - تحديث تلقائي وذكي
 */
export interface MarketAnalytics {
  trend: MarketTrend;
  growthRate: number;
  seasonalFactor: number;
  competitorDensity: number;
  emergingKeywords: string[];
  predictedPeak: string; // تاريخ الذروة المتوقع
  riskLevel: "low" | "medium" | "high";
  opportunityScore: number; // 0-100
  timeToMarket: number; // أيام
  viralPotential: number; // 0-100
}

export interface CompetitorAnalysis {
  platform: string;
  marketShare: number;
  averagePrice: number;
  contentQuality: number;
  uploadFrequency: string;
  topPerformers: string[];
  weaknesses: string[];
}

export const COMPETITOR_ANALYSIS: CompetitorAnalysis[] = [
  {
    platform: "Adobe Stock",
    marketShare: 35,
    averagePrice: 29.99,
    contentQuality: 95,
    uploadFrequency: "Daily",
    topPerformers: ["Nature", "Business", "Technology"],
    weaknesses: ["High competition", "Strict guidelines"]
  },
  {
    platform: "Shutterstock",
    marketShare: 28,
    averagePrice: 25.99,
    contentQuality: 88,
    uploadFrequency: "Daily",
    topPerformers: ["Lifestyle", "Food", "Travel"],
    weaknesses: ["Lower quality threshold", "Watermark issues"]
  },
  {
    platform: "Freepik",
    marketShare: 15,
    averagePrice: 19.99,
    contentQuality: 82,
    uploadFrequency: "Weekly",
    topPerformers: ["Icons", "Templates", "Mockups"],
    weaknesses: ["Limited categories", "Quality variations"]
  },
  {
    platform: "EyeEm",
    marketShare: 8,
    averagePrice: 22.99,
    contentQuality: 90,
    uploadFrequency: "Daily",
    topPerformers: ["Mobile photography", "Street photography"],
    weaknesses: ["Mobile only", "Limited reach"]
  },
  {
    platform: "Unsplash",
    marketShare: 14,
    averagePrice: 0,
    contentQuality: 85,
    uploadFrequency: "Daily",
    topPerformers: ["Free stock", "Community driven"],
    weaknesses: ["No monetization", "Copyright issues"]
  }
];

export function calculateOpportunityScore(trend: MarketTrend): number {
  const searchScore = Math.min(trend.searches / 10000, 50); // Max 50 points
  const profitScore = trend.profitability * 0.3; // Max 30 points
  const competitionScore = (100 - trend.competition) * 0.2; // Max 20 points

  return Math.round(searchScore + profitScore + competitionScore);
}

export function predictTrendPeak(trend: MarketTrend): string {
  const baseDate = new Date();
  const monthsToAdd = Math.max(1, Math.min(6, trend.competition / 20));
  baseDate.setMonth(baseDate.getMonth() + monthsToAdd);

  return baseDate.toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

export function assessRiskLevel(trend: MarketTrend): "low" | "medium" | "high" {
  const competition = trend.competition;
  const profitability = trend.profitability;

  if (competition < 30 && profitability > 80) return "low";
  if (competition < 60 && profitability > 60) return "medium";
  return "high";
}

export function estimateTimeToMarket(trend: MarketTrend): number {
  // Estimated days based on complexity and competition
  const baseTime = 7; // أسبوع أساسي
  const complexityFactor = trend.category === "Technology" ? 1.5 : 1;
  const competitionFactor = trend.competition / 100;

  return Math.round(baseTime * complexityFactor * (1 + competitionFactor));
}

export function calculateViralPotential(trend: MarketTrend): number {
  // Based on search volume and uniqueness
  const searchFactor = Math.min(trend.searches / 5000, 50);
  const uniquenessFactor = (100 - trend.competition) * 0.5;

  return Math.round(searchFactor + uniquenessFactor);
}

export function generateMarketAnalytics(trend: MarketTrend): MarketAnalytics {
  return {
    trend,
    growthRate: Math.round((trend.searches / 1000) * (Math.random() * 0.5 + 0.75)),
    seasonalFactor: Math.round(Math.random() * 40 + 60), // 60-100%
    competitorDensity: trend.competition,
    emergingKeywords: generateEmergingKeywords(trend),
    predictedPeak: predictTrendPeak(trend),
    riskLevel: assessRiskLevel(trend),
    opportunityScore: calculateOpportunityScore(trend),
    timeToMarket: estimateTimeToMarket(trend),
    viralPotential: calculateViralPotential(trend)
  };
}

function generateEmergingKeywords(trend: MarketTrend): string[] {
  const baseKeywords = trend.topic.toLowerCase().split(' ');
  const emerging = [
    "2026", "future", "innovative", "cutting-edge", "next-gen",
    "trending", "viral", "premium", "professional", "high-quality"
  ];

  return [
    ...baseKeywords,
    ...emerging.slice(0, 3),
    trend.category.toLowerCase(),
    "stock",
    "commercial"
  ].filter((v, i, a) => a.indexOf(v) === i); // Remove duplicates
}

export function getTopCompetitors(limit: number = 3): CompetitorAnalysis[] {
  return COMPETITOR_ANALYSIS
    .sort((a, b) => b.marketShare - a.marketShare)
    .slice(0, limit);
}

export function getBestPlatformsForCategory(category: string): CompetitorAnalysis[] {
  return COMPETITOR_ANALYSIS.filter(platform =>
    platform.topPerformers.some(performer =>
      performer.toLowerCase().includes(category.toLowerCase())
    )
  );
}