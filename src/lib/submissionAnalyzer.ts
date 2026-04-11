/**
 * Pre-Submission Analyzer - يقيم احتمالية قبول الفيديو/الصورة قبل الرفع
 * يجمع بين Similarity Detector و IP Rights Checker و المقاييس الإضافية
 */

import {
  analyzeSimilarity,
  type SimilarityResult,
} from "./similarityDetector";
import { checkIPRights, type IPCheckResult } from "./ipRightsChecker";
import Cache from "./Cache";

export interface SubmissionAnalysis {
  overallAcceptanceProbability: number; // 0-100 (0 = رفض مؤكد, 100 = قبول مؤكد)
  riskLevel: "very_low" | "low" | "moderate" | "high" | "very_high";
  recommendation:
    | "submit_immediately"
    | "submit_with_improvements"
    | "major_revisions_needed"
    | "do_not_submit";
  breakdown: {
    similarity: number;
    ipRights: number;
    quality: number;
    trend: number;
    metadata: number;
  };
  detailedAnalysis: {
    similarity: SimilarityResult;
    ipRights: IPCheckResult;
  };
  actionItems: string[];
  estimatedRejectionReasons: string[];
  improvementSuggestions: string[];
  estimatedApprovalTime?: string; // e.g., "1-3 days"
}

/**
 * تحليل شامل قبل الرفع
 */
export async function analyzeBeforeSubmission(
  data: {
    title: string;
    description: string;
    keywords: string[];
    concept: string;
    contentType: "image" | "video";
    duration?: number; // في ثواني
    hasMusic?: boolean;
    hasIdentifiablePeople?: boolean;
    hasPrivateLocations?: boolean;
    resolutionQuality?: "4k" | "1080p" | "720p" | "lower";
    framerate?: number; // fps
    soundQuality?: "professional" | "good" | "acceptable" | "poor";
  }
): Promise<SubmissionAnalysis> {
  // ✅ Fixed cache key - now includes ALL inputs for unique analysis
  const cacheKey = `submission_${data.title}_${data.description}_${data.keywords.join('_')}_${data.concept}_${data.contentType}`;
  const cached = Cache.get<SubmissionAnalysis>(cacheKey);
  if (cached) return cached;

  try {
    // 1. Similarity Check
    const similarityResult = await analyzeSimilarity(
      data.title,
      data.description,
      data.keywords,
      data.concept,
      data.contentType
    );

    // 2. IP Rights Check
    const ipRightsResult = await checkIPRights(
      data.title,
      data.description,
      data.keywords,
      data.concept,
      data.hasMusic,
      data.hasIdentifiablePeople,
      data.hasPrivateLocations
    );

    // 3. Quality Assessment
    const qualityScore = assessQuality(data);

    // 4. Trend Analysis
    const trendScore = assessTrendViability(data.keywords, data.concept);

    // 5. Metadata Quality
    const metadataScore = assessMetadata(
      data.title,
      data.description,
      data.keywords
    );

    // Calculate overall probability
    const similarities = (100 - similarityResult.overallScore) * 0.25; // Lower similarity = better
    const ipSafety = (100 - ipRightsResult.overallRisk) * 0.25; // Lower risk = better
    const quality = qualityScore * 0.25;
    const trend = trendScore * 0.15;
    const metadata = metadataScore * 0.1;

    const overallAcceptanceProbability = Math.round(
      similarities + ipSafety + quality + trend + metadata
    );

    // Determine risk level
    const riskLevel = determineRiskLevel(
      overallAcceptanceProbability,
      similarityResult,
      ipRightsResult
    );

    // Recommendation
    const recommendation = getRecommendation(
      overallAcceptanceProbability,
      riskLevel,
      ipRightsResult
    );

    // Action items
    const actionItems = generateActionItems(
      similarityResult,
      ipRightsResult,
      qualityScore,
      data
    );

    // Estimated rejection reasons
    const rejectionReasons = estimateRejectionReasons(
      similarityResult,
      ipRightsResult,
      qualityScore,
      data
    );

    // Improvement suggestions
    const improvements = generateImprovements(
      similarityResult,
      ipRightsResult,
      data
    );

    const analysis: SubmissionAnalysis = {
      overallAcceptanceProbability,
      riskLevel,
      recommendation,
      breakdown: {
        similarity: 100 - similarityResult.overallScore,
        ipRights: 100 - ipRightsResult.overallRisk,
        quality: qualityScore,
        trend: trendScore,
        metadata: metadataScore,
      },
      detailedAnalysis: {
        similarity: similarityResult,
        ipRights: ipRightsResult,
      },
      actionItems,
      estimatedRejectionReasons: rejectionReasons,
      improvementSuggestions: improvements,
      estimatedApprovalTime: estimateApprovalTime(
        overallAcceptanceProbability
      ),
    };

    Cache.set(cacheKey, analysis, 60 * 60 * 1000); // Cache for 1 hour
    return analysis;
  } catch (error) {
    console.error("[Pre-Submission Analyzer] Error:", error);
    return getDefaultAnalysis();
  }
}

function assessQuality(data: {
  resolutionQuality?: string;
  framerate?: number;
  soundQuality?: string;
  duration?: number;
  title?: string;
  description?: string;
}): number {
  let score = 40; // Lower base score for more variation

  // Resolution - more granular scoring
  if (data.resolutionQuality === "4k") score += 30;
  else if (data.resolutionQuality === "1080p") score += 22;
  else if (data.resolutionQuality === "720p") score += 12;
  else score += 5; // Even lower quality still gets some credit

  // Framerate - more nuanced
  if (data.framerate) {
    if (data.framerate >= 60) score += 15;
    else if (data.framerate >= 50) score += 12;
    else if (data.framerate >= 30) score += 8;
    else if (data.framerate >= 24) score += 4;
  } else {
    score += 3; // Default if not specified
  }

  // Sound quality - varies more
  if (data.soundQuality === "professional") score += 18;
  else if (data.soundQuality === "good") score += 12;
  else if (data.soundQuality === "acceptable") score += 6;
  else score += 2; // Even poor sound gets some credit

  // Duration variation - contextual scoring
  if (data.duration) {
    if (data.duration >= 5 && data.duration <= 30) score += 12; // Ideal
    else if (data.duration > 30 && data.duration <= 60) score += 8; // Acceptable
    else if (data.duration > 60) score += 4; // Long format
    else if (data.duration < 5) score += 3; // Very short
  } else {
    score += 2; // Default
  }

  // Content completeness bonus
  const hasTitle = !!data.title && data.title.trim().length > 5;
  const hasDescription = !!data.description && data.description.trim().length > 20;
  
  if (hasTitle && hasDescription) score += 8;
  else if (hasTitle || hasDescription) score += 4;

  return Math.min(score, 100);
}

function assessTrendViability(keywords: string[], concept: string): number {
  let score = 35; // Lower base for more variation

  // ✅ Expanded niche keywords for better detection
  const niche_keywords = [
    "microlearning", "neuromatic", "ethereal", "sustainable", "adaptive",
    "immersive", "biomimicry", "solarpunk", "cottagecore", "maximalist",
    "minimalist", "biophilic", "circular", "regenerative", "mindful",
    "wellness", "holistic", "ancestral", "heritage", "artisanal", "bespoke",
    "zero-waste", "slow-fashion", "eco-conscious", "carbon-neutral"
  ];

  // Count niche keywords found
  let nicheKeywordCount = 0;
  keywords.forEach(k => {
    niche_keywords.forEach(nk => {
      if (k.toLowerCase().includes(nk.toLowerCase())) nicheKeywordCount++;
    });
  });

  // Graduated scoring based on count
  if (nicheKeywordCount >= 3) score += 28;
  else if (nicheKeywordCount === 2) score += 20;
  else if (nicheKeywordCount === 1) score += 12;

  // ✅ Expanded emerging trends
  const emergingTrends = [
    "ai assisted", "hybrid work", "wellness tech", "circular economy",
    "digital wellbeing", "metaverse", "web3", "nft", "crypto",
    "mental health", "neurodiversity", "inclusive design", "accessibility",
    "climate action", "regenerative agriculture", "vertical farming",
    "lab-grown", "precision fermentation", "citizen science"
  ];

  let trendCount = 0;
  [...keywords, concept].forEach(item => {
    emergingTrends.forEach(t => {
      if (item.toLowerCase().includes(t.toLowerCase())) trendCount++;
    });
  });

  // Graduated scoring for trends
  if (trendCount >= 3) score += 22;
  else if (trendCount === 2) score += 16;
  else if (trendCount === 1) score += 10;

  // Concept depth analysis
  if (concept && concept.length > 10) score += 5;
  if (concept && concept.split(' ').length >= 3) score += 5; // Multi-word concepts

  // Keyword diversity bonus
  const uniqueKeywords = new Set(keywords.map(k => k.toLowerCase()));
  if (uniqueKeywords.size >= 5) score += 8;
  else if (uniqueKeywords.size >= 3) score += 4;

  return Math.min(score, 100);
}

function assessMetadata(
  title: string,
  description: string,
  keywords: string[]
): number {
  let score = 50;

  // Title quality
  if (title.length >= 10 && title.length <= 100) score += 15;

  // Description quality
  if (description.length >= 50 && description.length <= 800) score += 15;

  // Keywords quality
  if (keywords.length >= 5 && keywords.length <= 20) score += 15;

  // No spammy keywords
  const spammyKeywords = [
    "free",
    "download",
    "best",
    "top",
    "awesome",
    "amazing",
  ];
  const hasSpammy = keywords.some((k) =>
    spammyKeywords.includes(k.toLowerCase())
  );

  if (!hasSpammy) score += 5;

  return Math.min(score, 100);
}

function determineRiskLevel(
  probability: number,
  similarityResult: SimilarityResult,
  ipRightsResult: IPCheckResult
): "very_low" | "low" | "moderate" | "high" | "very_high" {
  // Critical IP issues = very high risk
  if (ipRightsResult.status === "critical") return "very_high";

  if (probability > 80) return "very_low";
  if (probability > 60) return "low";
  if (probability > 40) return "moderate";
  if (probability > 20) return "high";
  return "very_high";
}

function getRecommendation(
  probability: number,
  riskLevel: string,
  ipRightsResult: IPCheckResult
):
  | "submit_immediately"
  | "submit_with_improvements"
  | "major_revisions_needed"
  | "do_not_submit" {
  if (ipRightsResult.status === "critical") return "do_not_submit";

  if (probability > 75) return "submit_immediately";
  if (probability > 55) return "submit_with_improvements";
  if (probability > 30) return "major_revisions_needed";
  return "do_not_submit";
}

function generateActionItems(
  similarityResult: SimilarityResult,
  ipRightsResult: IPCheckResult,
  qualityScore: number,
  data: any
): string[] {
  const items: string[] = [];

  if (similarityResult.category === "high_risk") {
    items.push(
      "🔴 إعادة تصور المحتوى - درجة التشابه عالية جداً"
    );
  }

  if (ipRightsResult.issues.length > 0) {
    ipRightsResult.issues.forEach((issue) => {
      items.push(`⚠️ ${issue.type}: ${issue.element} - ${issue.solution}`);
    });
  }

  if (qualityScore < 60) {
    items.push("📹 تحسين جودة الفيديو/الصورة");
  }

  if (!data.keywords || data.keywords.length < 5) {
    items.push("🏷️ إضافة المزيد من الكلمات المفتاحية الدقيقة");
  }

  return items;
}

function estimateRejectionReasons(
  similarityResult: SimilarityResult,
  ipRightsResult: IPCheckResult,
  qualityScore: number,
  data: any
): string[] {
  const reasons: string[] = [];

  if (similarityResult.overallScore > 70) {
    reasons.push(
      "محتوى متشابه جداً مع أصول موجودة على Adobe Stock"
    );
  }

  if (ipRightsResult.status === "critical") {
    reasons.push("انتهاك محتمل لحقوق الملكية الفكرية");
  }

  if (qualityScore < 50) {
    reasons.push("جودة المحتوى لا تفي بمعايير Adobe Stock");
  }

  if (!data.description || data.description.length < 30) {
    reasons.push("وصف ناقص أو غير كافٍ");
  }

  return reasons;
}

function generateImprovements(
  similarityResult: SimilarityResult,
  ipRightsResult: IPCheckResult,
  data: any
): string[] {
  const suggestions: string[] = [];

  suggestions.push(...similarityResult.diversificationHints);
  suggestions.push(...ipRightsResult.guidance);

  suggestions.push(
    "اختبر المحتوى على مجموعات مستخدمين مختلفة للتأكد من الجاذبية"
  );

  suggestions.push(
    "قارن محتواك مع أفضل الأداء على Adobe Stock في نفس الفئة"
  );

  return suggestions.slice(0, 5);
}

function estimateApprovalTime(probability: number): string {
  if (probability > 80) return "1-2 أيام";
  if (probability > 60) return "2-5 أيام";
  if (probability > 40) return "5-10 أيام";
  if (probability > 20) return "10-30 يوم";
  return "قد يكون الرفض محتملاً";
}

function getDefaultAnalysis(): SubmissionAnalysis {
  return {
    overallAcceptanceProbability: 50,
    riskLevel: "moderate",
    recommendation: "submit_with_improvements",
    breakdown: {
      similarity: 50,
      ipRights: 50,
      quality: 50,
      trend: 50,
      metadata: 50,
    },
    detailedAnalysis: {
      similarity: {
        overallScore: 50,
        category: "moderate_risk",
        risks: {
          concept: 50,
          composition: 50,
          keywords: 50,
          trend: 50,
        },
        recommendations: [],
        relatedTrends: [],
        diversificationHints: [],
      },
      ipRights: {
        overallRisk: 50,
        status: "warning",
        issues: [],
        guidance: [],
        requiresManualReview: false,
      },
    },
    actionItems: [],
    estimatedRejectionReasons: [],
    improvementSuggestions: [],
  };
}

/**
 * Batch analysis for multiple submissions
 */
export async function batchAnalyzeSubmissions(
  items: Parameters<typeof analyzeBeforeSubmission>[0][]
): Promise<SubmissionAnalysis[]> {
  return Promise.all(items.map((item) => analyzeBeforeSubmission(item)));
}
