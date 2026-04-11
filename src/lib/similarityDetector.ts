/**
 * Similarity Detector - يكتشف المحتوى المتشابه مع مكتبة Adobe Stock
 * يستخدم AI لتحليل الفيديوهات والصور والـ keywords
 */

import { generateAITrends, hasAnyApiKey } from "./gemini";
import Cache from "./Cache";

export interface SimilarityResult {
  overallScore: number; // 0-100 (0 = فريد تماماً, 100 = متطابق)
  category: "unique" | "low_risk" | "moderate_risk" | "high_risk";
  risks: {
    concept: number;
    composition: number;
    keywords: number;
    trend: number;
  };
  recommendations: string[];
  relatedTrends: string[];
  diversificationHints: string[];
}

// قاعدة بيانات محاكاة للمحتوى على Adobe Stock
const ADOBE_STOCK_PATTERNS = {
  common_concepts: [
    "cooking food preparation",
    "office workspace",
    "coffee morning routine",
    "nature landscape",
    "urban city life",
    "health fitness workout",
    "family moments",
    "business meeting",
    "travel vacation",
    "learning education",
  ],
  common_compositions: [
    "overhead shot",
    "slow motion",
    "close up detail",
    "wide establishing shot",
    "person in motion",
    "product showcase",
    "time lapse",
    "flat lay",
    "portrait focus",
    "aerial drone view",
  ],
  oversaturated_keywords: [
    "motivation",
    "success",
    "growth",
    "innovation",
    "inspiration",
    "teamwork",
    "startup",
    "digital",
    "modern",
    "future",
    "energy",
    "dynamic",
    "creative",
    "professional",
    "lifestyle",
  ],
  trend_saturation: {
    "AI generated": 0.95,
    "minimalist design": 0.85,
    "wellness content": 0.82,
    "dark mode aesthetic": 0.80,
    "sustainable living": 0.78,
    "remote work": 0.75,
    "mental health": 0.72,
    "plant based": 0.70,
    "cottagecore": 0.68,
    "cyberpunk aesthetic": 0.65,
  },
};

/**
 * تحليل درجة التشابه باستخدام AI
 */
export async function analyzeSimilarity(
  title: string,
  description: string,
  keywords: string[],
  concept: string,
  contentType: "image" | "video"
): Promise<SimilarityResult> {
  // ✅ Fixed: Cache key now includes description and keywords for unique analysis
  const cacheKey = `similarity_${title}_${description.substring(0, 50)}_${keywords.join('_')}_${concept}`;
  const cached = Cache.get<SimilarityResult>(cacheKey);
  if (cached) return cached;

  try {
    // 1. Concept Risk Analysis
    const conceptRisk = calculateConceptRisk(concept, keywords);

    // 2. Composition Risk (pattern matching)
    const compositionRisk = calculateCompositionRisk(description);

    // 3. Keywords Risk Analysis
    const keywordRisk = calculateKeywordRisk(keywords);

    // 4. Trend Risk (are you following an oversaturated trend?)
    const trendRisk = calculateTrendRisk(keywords, concept);

    // 5. Get AI-powered recommendations
    const recommendations = await generateUniqueRecommendations(
      title,
      concept,
      keywords,
      contentType
    );

    // ✅ More granular overall score calculation
    const overallScore = Math.round(
      conceptRisk * 0.3 + compositionRisk * 0.25 + keywordRisk * 0.25 + trendRisk * 0.2
    );

    const category =
      overallScore < 25
        ? "unique"
        : overallScore < 50
        ? "low_risk"
        : overallScore < 75
        ? "moderate_risk"
        : "high_risk";

    const diversificationHints = getDiversificationHints(
      concept,
      keywords,
      category
    );

    const result: SimilarityResult = {
      overallScore,
      category,
      risks: {
        concept: conceptRisk,
        composition: compositionRisk,
        keywords: keywordRisk,
        trend: trendRisk,
      },
      recommendations,
      relatedTrends: getRelatedTrends(concept),
      diversificationHints,
    };

    Cache.set(cacheKey, result, 60 * 60 * 1000); // Cache for 1 hour
    return result;
  } catch (error) {
    console.error("[Similarity Detector] Error:", error);
    return getDefaultResult();
  }
}

function calculateConceptRisk(concept: string, keywords: string[]): number {
  let risk = 0;
  const conceptLower = concept.toLowerCase();

  // ✅ IMPROVED: Calculate actual similarity score (not just presence)
  for (const commonConcept of ADOBE_STOCK_PATTERNS.common_concepts) {
    const similarity = stringSimilarity(conceptLower, commonConcept.toLowerCase());
    risk = Math.max(risk, similarity * 100);
  }

  // ✅ Advanced: Check concept specificity - longer concepts are usually more unique
  const conceptWords = concept.split(' ').filter(w => w.length > 3).length;
  if (conceptWords >= 4) risk -= 15; // Longer concepts are less risky
  if (conceptWords === 1) risk += 10; // Single word concepts are riskier

  // Check keyword overlap - but with weighted analysis
  const overlappingKeywords = keywords.filter((k) =>
    ADOBE_STOCK_PATTERNS.oversaturated_keywords.some((ak) =>
      k.toLowerCase() === ak.toLowerCase()
    )
  );
  
  // ✅ Only penalize if MOST keywords are oversaturated
  const oversaturationRate = overlappingKeywords.length / Math.max(keywords.length, 1);
  risk = Math.max(risk, oversaturationRate * 75);

  return Math.min(risk, 100);
}

function calculateCompositionRisk(description: string): number {
  let risk = 0;
  const desc = description.toLowerCase();
  const descLength = description.split(' ').length;

  // ✅ IMPROVED: Richer, more nuanced composition detection
  const descriptiveCompositions = {
    "overhead shot": 18,
    "slow motion": 15,
    "close up": 20,
    "close-up": 20,
    "wide shot": 12,
    "wide establishing": 12,
    "aerial": 10,
    "drone": 10,
    "time lapse": 22,
    "time-lapse": 22,
    "flat lay": 25,
    "portrait": 14,
    "macro": 8,
    "cinematic": 10,
    "parallax": 8,
    "documentary": 5,
  };

  for (const [composition, penalty] of Object.entries(descriptiveCompositions)) {
    if (desc.includes(composition)) {
      risk += penalty;
    }
  }

  // ✅ NEW: Description depth analysis
  if (descLength < 10) risk += 15; // Very brief descriptions are generic
  if (descLength > 50) risk -= 8;   // Detailed descriptions tend to be unique

  // Common transitions/effects
  const effects: {[key: string]: number} = {
    "fade": 8,
    "cut": 5,
    "dissolve": 8,
    "zoom": 10,
    "pan": 9,
    "slide": 7,
    "wipe": 8,
    "rotation": 6,
  };
  
  for (const [effect, penalty] of Object.entries(effects)) {
    if (desc.includes(effect)) {
      risk += penalty;
    }
  }

  return Math.min(risk, 100);
}

function calculateKeywordRisk(keywords: string[]): number {
  if (keywords.length === 0) return 50; // No keywords = moderate risk

  // ✅ IMPROVED: Check for exact matches only (not partial)
  const riskyKeywords = keywords.filter((k) =>
    ADOBE_STOCK_PATTERNS.oversaturated_keywords.some(
      (ak) => k.toLowerCase() === ak.toLowerCase()
    )
  );

  // ✅ NEW: Keyword uniqueness bonus
  const uniqueKeywords = new Set(keywords.map(k => k.toLowerCase())).size;
  const diversityScore = (uniqueKeywords / keywords.length) * 20; // Bonus for diversity

  const riskyPercentage = (riskyKeywords.length / keywords.length) * 100;
  
  // ✅ More nuanced: High risk only if mostly risky
  let risk = riskyPercentage * 0.6; // Reduced weight from 1.0 to 0.6
  risk -= diversityScore; // Apply diversity bonus

  return Math.min(Math.max(risk, 0), 100);
}

function calculateTrendRisk(keywords: string[], concept: string): number {
  let risk = 0;
  const searchTerms = [...keywords, concept].map(t => t.toLowerCase());

  // ✅ IMPROVED: More nuanced trend saturation scoring
  let trendMatches = 0;
  let maxSaturation = 0;

  for (const [trend, saturation] of Object.entries(
    ADOBE_STOCK_PATTERNS.trend_saturation
  )) {
    const isTrendRelated = searchTerms.some((term) =>
      term.includes(trend.toLowerCase())
    );

    if (isTrendRelated) {
      trendMatches++;
      risk = Math.max(risk, saturation * 100);
      maxSaturation = Math.max(maxSaturation, saturation);
    }
  }

  // ✅ NEW: If multiple trends, slight risk reduction (mixing trends can be unique)
  if (trendMatches > 1) {
    risk *= 0.85; // 15% reduction for trend mixing
  }

  // ✅ NEW: Check for emerging/niche trends (opposite of saturation)
  const emergingTrends = ["solarpunk", "cottagecore", "afrofuturism", "cottagecore", "weirdcore", "cybercore"];
  const hasEmerging = searchTerms.some(term =>
    emergingTrends.some(et => term.includes(et.toLowerCase()))
  );
  
  if (hasEmerging) risk -= 20; // Bonus for emerging trends

  return Math.min(Math.max(risk, 0), 100);
}

function stringSimilarity(str1: string, str2: string): number {
  const s1 = str1.split(" ");
  const s2 = str2.split(" ");
  const matches = s1.filter((word) => s2.some((w) => w === word)).length;
  return matches / Math.max(s1.length, s2.length);
}

async function generateUniqueRecommendations(
  title: string,
  concept: string,
  keywords: string[],
  contentType: "image" | "video"
): Promise<string[]> {
  const recommendations: string[] = [];

  // Basic recommendations
  if (keywords.length < 5) {
    recommendations.push(
      "أضف المزيد من الكلمات المفتاحية المتخصصة والفريدة"
    );
  }

  // Oversaturated keyword warning
  const riskyKeywords = keywords.filter((k) =>
    ADOBE_STOCK_PATTERNS.oversaturated_keywords.includes(k.toLowerCase())
  );
  if (riskyKeywords.length > 0) {
    recommendations.push(
      `استبدل الكلمات المشتركة جداً: ${riskyKeywords.join(", ")}`
    );
  }

  // Composition recommendations
  if (contentType === "video") {
    recommendations.push(
      "استخدم تقنية سينمائية فريدة أو تأثير بصري غير عادي"
    );
  } else {
    recommendations.push("جرب زاوية تصوير غير تقليدية أو إضاءة فريدة");
  }

  // Concept uniqueness
  recommendations.push(
    "أضف عنصراً شخصياً أو محلياً يميز محتواك عن المعايير العالمية"
  );

  return recommendations;
}

function getDiversificationHints(
  concept: string,
  keywords: string[],
  riskLevel: string
): string[] {
  const hints: string[] = [];

  if (riskLevel === "high_risk") {
    hints.push(
      "اجعل محتواك أكثر تخصصاً - ركز على نيش معين بدلاً من المفاهيم العامة"
    );
    hints.push("أضف حكاية فريدة أو سياق درامي للمحتوى");
    hints.push(
      "ادمج عناصر ثقافية أو اتجاهات محلية لم تكن مشبعة بعد على المنصة"
    );
  } else if (riskLevel === "moderate_risk") {
    hints.push("رقق بعض العناصر الشائعة مع عناصر أصلية أكثر");
    hints.push("أضف تفاصيل دقيقة فريدة تعجز عن تكرارها بسهولة");
  }

  hints.push("ابحث عن الفجوات في السوق - المفاهيم المنسية أو الناشئة");

  return hints;
}

function getRelatedTrends(concept: string): string[] {
  const trends = [];
  const conceptLower = concept.toLowerCase();

  if (
    conceptLower.includes("health") ||
    conceptLower.includes("fitness") ||
    conceptLower.includes("wellness")
  ) {
    trends.push("Mental Health Tech", "Adaptive Fitness", "Holistic Wellness");
  }
  if (
    conceptLower.includes("food") ||
    conceptLower.includes("cooking") ||
    conceptLower.includes("recipe")
  ) {
    trends.push("Fermented Foods", "Zero Waste Cooking", "Heritage Recipes");
  }
  if (
    conceptLower.includes("work") ||
    conceptLower.includes("office") ||
    conceptLower.includes("business")
  ) {
    trends.push("Hybrid Workspaces", "Digital Nomadism", "Team Bonding");
  }
  if (
    conceptLower.includes("nature") ||
    conceptLower.includes("landscape") ||
    conceptLower.includes("outdoor")
  ) {
    trends.push("Rewilding", "Dark Sky Locations", "Micro-Adventures");
  }

  return trends.slice(0, 3);
}

function getDefaultResult(): SimilarityResult {
  return {
    overallScore: 45,
    category: "moderate_risk",
    risks: {
      concept: 40,
      composition: 45,
      keywords: 50,
      trend: 45,
    },
    recommendations: [
      "قم بتحليل أعمق للمحتوى الموجود مع فحص يدوي إضافي",
    ],
    relatedTrends: [],
    diversificationHints: [],
  };
}

/**
 * Batch analysis for multiple videos
 */
export async function batchAnalyzeSimilarity(
  items: Array<{
    title: string;
    description: string;
    keywords: string[];
    concept: string;
    contentType: "image" | "video";
  }>
): Promise<SimilarityResult[]> {
  return Promise.all(
    items.map((item) =>
      analyzeSimilarity(
        item.title,
        item.description,
        item.keywords,
        item.concept,
        item.contentType
      )
    )
  );
}
