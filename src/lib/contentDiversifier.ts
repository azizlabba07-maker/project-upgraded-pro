/**
 * Content Diversifier - يقدم اقتراحات وتحسينات لجعل المحتوى أكثر تميزاً
 * يركز على التنويع والابتكار والاستفادة من الفجوات في السوق
 */

import Cache from "./Cache";

export interface DiversificationStrategy {
  originalConcept: string;
  variations: ContentVariation[];
  niches: NicheOpportunity[];
  uniqueAngles: UniqueAngle[];
  marketGaps: MarketGap[];
  recommendations: string[];
}

export interface ContentVariation {
  title: string;
  description: string;
  angle: string;
  targetAudience: string;
  uniqueElements: string[];
  estimatedDemand: "low" | "medium" | "high";
}

export interface NicheOpportunity {
  niche: string;
  description: string;
  targetMarket: string;
  competitionLevel: "low" | "medium" | "high";
  estimatedRevenue: "low" | "medium" | "high";
  keywords: string[];
}

export interface UniqueAngle {
  angle: string;
  description: string;
  differentiators: string[];
  implementationDifficulty: "easy" | "medium" | "hard";
}

export interface MarketGap {
  gap: string;
  description: string;
  relatedKeywords: string[];
  estimatedDemand: string;
  suggests: string;
}

/**
 * توليد استراتيجية تنويع المحتوى الشامل
 */
export async function generateDiversificationStrategy(
  originalConcept: string,
  keywords: string[],
  contentType: "image" | "video"
): Promise<DiversificationStrategy> {
  const cacheKey = `diversification_${originalConcept}_${contentType}`;
  const cached = Cache.get<DiversificationStrategy>(cacheKey);
  if (cached) return cached;

  try {
    const variations = generateContentVariations(
      originalConcept,
      keywords,
      contentType
    );
    const niches = identifyNicheOpportunities(originalConcept, keywords);
    const angles = generateUniqueAngles(originalConcept, contentType);
    const gaps = identifyMarketGaps(originalConcept, keywords);
    const recommendations = synthesizeRecommendations(
      variations,
      niches,
      angles
    );

    const strategy: DiversificationStrategy = {
      originalConcept,
      variations,
      niches,
      uniqueAngles: angles,
      marketGaps: gaps,
      recommendations,
    };

    Cache.set(cacheKey, strategy, 2 * 60 * 60 * 1000); // Cache for 2 hours
    return strategy;
  } catch (error) {
    console.error("[Content Diversifier] Error:", error);
    return getDefaultStrategy(originalConcept);
  }
}

function generateContentVariations(
  concept: string,
  keywords: string[],
  contentType: "image" | "video"
): ContentVariation[] {
  const variations: ContentVariation[] = [];

  // 1. Micro-niche variation
  variations.push({
    title: `Premium ${concept} - Luxury Edition`,
    description: `High-end, luxurious interpretation focusing on exclusivity and premium aesthetics`,
    angle: "الفئة الفاخرة والمتطورة",
    targetAudience: "Luxury brands, high-end businesses, premium storytelling",
    uniqueElements: ["premium color grading", "luxury aesthetics", "exclusive feel"],
    estimatedDemand: "high",
  });

  // 2. Eco-conscious variation
  variations.push({
    title: `Sustainable ${concept} - Eco-Friendly`,
    description: `Eco-conscious approach highlighting sustainability and environmental awareness`,
    angle: "الاستدامة والوعي البيئي",
    targetAudience: "Eco-conscious brands, sustainability initiatives, green businesses",
    uniqueElements: [
      "sustainable practices",
      "natural materials",
      "environmental focus",
    ],
    estimatedDemand: "high",
  });

  // 3. Tech-forward variation
  variations.push({
    title: `Future-Ready ${concept} - Tech Innovation`,
    description: `Modern, tech-forward interpretation blending digital innovation with the concept`,
    angle: "الابتكار التكنولوجي والحداثة",
    targetAudience: "Tech startups, innovation-focused brands, digital platforms",
    uniqueElements: ["tech aesthetics", "digital innovation", "futuristic elements"],
    estimatedDemand: "medium",
  });

  // 4. Diverse representation variation
  variations.push({
    title: `Inclusive ${concept} - Diverse Cultures`,
    description: `Celebration of diverse cultures, ages, abilities and backgrounds in the concept`,
    angle: "التنوع والشمول الثقافي",
    targetAudience: "Inclusive brands, global audiences, diversity-focused organizations",
    uniqueElements: [
      "diverse representation",
      "cultural inclusion",
      "universal appeal",
    ],
    estimatedDemand: "high",
  });

  // 5. Slow-living variation
  variations.push({
    title: `Mindful ${concept} - Slow Living`,
    description: `Meditative, slow-paced approach emphasizing presence and mindfulness`,
    angle: "العيش البطيء والوعي الحاضر",
    targetAudience: "Wellness brands, meditation apps, lifestyle coaching",
    uniqueElements: [
      "slow-paced",
      "meditative quality",
      "mindfulness focus",
    ],
    estimatedDemand: "medium",
  });

  // 6. Hyper-local variation
  variations.push({
    title: `${concept} - Local Heritage & Traditions`,
    description: `Celebrating local traditions, craftsmanship, and cultural heritage`,
    angle: "التراث المحلي والحرف التقليدية",
    targetAudience: "Local businesses, tourism, cultural preservation",
    uniqueElements: [
      "local traditions",
      "heritage craftsmanship",
      "cultural authenticity",
    ],
    estimatedDemand: "medium",
  });

  return variations;
}

function identifyNicheOpportunities(
  concept: string,
  keywords: string[]
): NicheOpportunity[] {
  const niches: NicheOpportunity[] = [];
  const conceptLower = concept.toLowerCase();

  // Based on concept type
  if (
    conceptLower.includes("health") ||
    conceptLower.includes("wellness") ||
    conceptLower.includes("fitness")
  ) {
    niches.push(
      {
        niche: "Adaptive Fitness",
        description:
          "Fitness content tailored to people with disabilities and different abilities",
        targetMarket: "Inclusive fitness platforms, adaptive sports",
        competitionLevel: "low",
        estimatedRevenue: "high",
        keywords: [
          "adaptive fitness",
          "inclusive exercise",
          "accessible workouts",
        ],
      },
      {
        niche: "Mental Health Tech",
        description:
          "Integration of mental wellness with technology and mindfulness",
        targetMarket: "Mental health apps, corporate wellness",
        competitionLevel: "medium",
        estimatedRevenue: "high",
        keywords: ["mental health", "stress relief", "digital wellness"],
      }
    );
  }

  if (
    conceptLower.includes("work") ||
    conceptLower.includes("office") ||
    conceptLower.includes("business")
  ) {
    niches.push(
      {
        niche: "Hybrid Work Spaces",
        description:
          "Modern scenarios combining office and remote work environments",
        targetMarket: "Corporate training, SaaS platforms",
        competitionLevel: "medium",
        estimatedRevenue: "high",
        keywords: [
          "hybrid work",
          "flexible workspace",
          "digital collaboration",
        ],
      },
      {
        niche: "Neurodiversity in Workplace",
        description:
          "Professional environments supporting neurodivergent individuals",
        targetMarket: "HR platforms, diversity initiatives",
        competitionLevel: "low",
        estimatedRevenue: "medium",
        keywords: ["neurodiversity", "inclusive workplace", "ADHD friendly"],
      }
    );
  }

  if (
    conceptLower.includes("food") ||
    conceptLower.includes("cooking") ||
    conceptLower.includes("kitchen")
  ) {
    niches.push(
      {
        niche: "Fermented & Preserved Foods",
        description: "Traditional fermentation and food preservation techniques",
        targetMarket: "Health food brands, culinary platforms",
        competitionLevel: "low",
        estimatedRevenue: "medium",
        keywords: ["fermentation", "preservation", "probiotics"],
      },
      {
        niche: "Heritage Recipes & Cooking",
        description: "Traditional cooking methods and ancestral recipes",
        targetMarket: "Cultural platforms, cooking education",
        competitionLevel: "medium",
        estimatedRevenue: "medium",
        keywords: ["heritage recipe", "traditional cooking", "family recipes"],
      }
    );
  }

  return niches;
}

function generateUniqueAngles(
  concept: string,
  contentType: "image" | "video"
): UniqueAngle[] {
  const angles: UniqueAngle[] = [];

  if (contentType === "video") {
    angles.push(
      {
        angle: "Reverse Engineering Narrative",
        description:
          "Start with the end result and reverse chronologically to the beginning",
        differentiators: [
          "uncommon narrative structure",
          "memorable approach",
          "stands out in feed",
        ],
        implementationDifficulty: "medium",
      },
      {
        angle: "Multi-perspective POV",
        description:
          "Show the same scenario from multiple different perspectives simultaneously",
        differentiators: ["dynamic", "complex storytelling", "viewer engagement"],
        implementationDifficulty: "hard",
      },
      {
        angle: "ASMR Documentary Style",
        description:
          "Documentary-style narration with ASMR audio elements for immersion",
        differentiators: [
          "sensory engagement",
          "trending audio style",
          "intimate feel",
        ],
        implementationDifficulty: "medium",
      },
      {
        angle: "Prompt-to-Reality Evolution",
        description: "Show AI-generated concepts evolving into real photography",
        differentiators: [
          "unique concept",
          "shows technology integration",
          "innovative",
        ],
        implementationDifficulty: "hard",
      }
    );
  } else {
    angles.push(
      {
        angle: "Macro Detail Composition",
        description:
          "Extreme close-up revealing hidden details and textures rarely seen",
        differentiators: [
          "unusual perspective",
          "visual discovery",
          "artistic value",
        ],
        implementationDifficulty: "easy",
      },
      {
        angle: "Negative Space Storytelling",
        description: "Use majority negative space to tell a story through absence",
        differentiators: [
          "minimalist",
          "professional",
          "thought-provoking",
        ],
        implementationDifficulty: "medium",
      },
      {
        angle: "Cross-Cultural Juxtaposition",
        description: "Blend traditional and modern elements from different cultures",
        differentiators: [
          "culturally rich",
          "globally appealing",
          "unique perspective",
        ],
        implementationDifficulty: "medium",
      }
    );
  }

  return angles;
}

function identifyMarketGaps(
  concept: string,
  keywords: string[]
): MarketGap[] {
  const gaps: MarketGap[] = [];
  const conceptLower = concept.toLowerCase();

  gaps.push({
    gap: "Intergenerational Content",
    description:
      "Show multiple generations interacting - underrepresented on stock platforms",
    relatedKeywords: ["intergenerational", "grandparents", "multi-generational"],
    estimatedDemand: "High (Advertising, Family-focused brands)",
    suggests: `Create content showing ${concept} across different age groups together`,
  });

  gaps.push({
    gap: "Less-Visible Professions",
    description:
      "Content featuring skilled trades, healthcare workers, creative professionals often underrepresented",
    relatedKeywords: [
      "trades",
      "healthcare",
      "specialized skills",
      "professional",
    ],
    estimatedDemand: "High (B2B, Industry-specific marketing)",
    suggests: `Document ${concept} in less-visible professional contexts`,
  });

  gaps.push({
    gap: "Authentic Moments vs. Perfectly Staged",
    description:
      "Real, unpolished moments are becoming more valued than overly-staged content",
    relatedKeywords: ["authentic", "candid", "real life", "genuine"],
    estimatedDemand: "High (Social media, authentic storytelling)",
    suggests: `Capture genuine, unscripted moments of ${concept}`,
  });

  gaps.push({
    gap: "Seasonal & Holiday Variations",
    description: "Unique seasonal takes on common concepts create year-round value",
    relatedKeywords: ["seasonal", "holiday", "cultural celebration"],
    estimatedDemand: "High (Seasonal marketing, global celebrations)",
    suggests: `Create cultural and seasonal variations of ${concept}`,
  });

  return gaps;
}

function synthesizeRecommendations(
  variations: ContentVariation[],
  niches: NicheOpportunity[],
  angles: UniqueAngle[]
): string[] {
  const recommendations: string[] = [];

  // Pick highest demand variations
  const highDemandVariations = variations.filter((v) => v.estimatedDemand === "high");
  if (highDemandVariations.length > 0) {
    recommendations.push(
      `🎯 أولوية عالية: ركز أولاً على "${highDemandVariations[0].title}"`
    );
  }

  // Recommend low competition niches
  const lowCompetitionNiches = niches.filter((n) => n.competitionLevel === "low");
  if (lowCompetitionNiches.length > 0) {
    recommendations.push(
      `💎 فرصة ذهبية: استكشف نيش "${lowCompetitionNiches[0].niche}" (منافسة منخفضة)`
    );
  }

  // Suggest easy-to-implement angles
  const easyAngles = angles.filter((a) => a.implementationDifficulty === "easy");
  if (easyAngles.length > 0) {
    recommendations.push(
      `✨ للبدء السريع: جرب "${easyAngles[0].angle}" (سهل التطبيق)`
    );
  }

  recommendations.push(
    "📊 قوم بتحليل المنافسة في كل نيش قبل الاستثمار الكامل"
  );
  recommendations.push(
    "🔄 جرب عدة أشكال قبل التوسع بكامل الفريق على أحد الأنماط"
  );

  return recommendations;
}

function getDefaultStrategy(concept: string): DiversificationStrategy {
  return {
    originalConcept: concept,
    variations: [],
    niches: [],
    uniqueAngles: [],
    marketGaps: [],
    recommendations: [
      "قم بتحليل شامل للمحتوى الموجود في فئتك",
      "ابحث عن الفجوات التي لم يتم ملؤها بعد",
      "جرب عدة أنماط مختلفة لقياس الأداء",
    ],
  };
}

/**
 * Strategic content plan generator
 */
export async function generateContentPlan(
  concepts: string[],
  keywords: string[],
  contentType: "image" | "video",
  targetMonthlyOutput: number = 10
): Promise<
  {
    strategyIndex: number;
    strategy: DiversificationStrategy;
    monthlyAllocation: number;
  }[]
> {
  const strategies = await Promise.all(
    concepts.map((concept) =>
      generateDiversificationStrategy(concept, keywords, contentType)
    )
  );

  return strategies.map((strategy, index) => ({
    strategyIndex: index,
    strategy,
    monthlyAllocation: Math.ceil(targetMonthlyOutput / concepts.length),
  }));
}
