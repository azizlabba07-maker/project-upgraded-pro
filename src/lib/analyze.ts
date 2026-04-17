import { generateWithGemini, extractAndParseJSON } from "./gemini";
import { type AnalysisResult, type ScoreBreakdown, type ReleaseInfo } from "../types";
import { 
  ADOBE_CATEGORIES, 
  ADOBE_BANNED_KEYWORDS, 
  RISING_TRENDS_2026,
  MIN_KEYWORDS,
  OPTIMAL_TITLE_MIN,
  MAX_KEYWORDS
} from "./constants";

// Use a Set for ultra-fast word-boundary matching
const BANNED_WORDS_SET = new Set(ADOBE_BANNED_KEYWORDS.map(w => w.toLowerCase()));

/**
 * Filter keywords using strict word-boundary matching to prevent partial matches.
 * e.g., "hd" will be caught, but "shade" will not.
 */
function filterBannedKeywords(keywords: string[]): { filtered: string[]; removed: string[] } {
  const removed: string[] = [];
  const filtered = keywords.filter((kw) => {
    // Normalization for matching: remove extra spaces and common symbols used for evasion
    const normalized = kw.toLowerCase().replace(/[-\s]+/g, "");
    const words = kw.toLowerCase().split(/[\s,._-]+/);
    
    const isBanned = words.some((w) => BANNED_WORDS_SET.has(w)) || BANNED_WORDS_SET.has(normalized);
    
    if (isBanned) removed.push(kw);
    return !isBanned;
  });
  return { filtered, removed };
}

function deduplicateKeywords(keywords: string[]): string[] {
  const seen = new Set<string>();
  return keywords.filter((kw) => {
    const key = kw.toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function calculateReadinessScore(
  title: string,
  keywords: string[],
  removedKeywords: string[],
  category: string,
  criteria: any,
  releases: ReleaseInfo,
  hasCompetitiveGap: boolean,
  trendCount: number,
): {
  score: number;
  status: "ready" | "review" | "rejected";
  issues: string[];
  breakdown: ScoreBreakdown;
  estimatedAcceptance: number;
} {
  const issues: string[] = [];
  let metadataPenalty = 0;
  let bonuses = 0;

  // Mid-range conservative fallback
  const uniqueness = criteria.uniqueness || 3;
  const commercial = criteria.commercialValue || 3;
  const clarity = criteria.subjectClarity || 3;
  const saturation = criteria.marketSaturation || 3;

  const contentScore = Math.round(
    (uniqueness   * 0.30 +
     commercial * 0.30 +
     clarity  * 0.20 +
     saturation * 0.20) * 10
  );

  // ── Penalties
  if (removedKeywords.length > 0) {
    metadataPenalty += removedKeywords.length * 12;
    issues.push(`${removedKeywords.length} كلمة مفتاحية محظورة تم حذفها: ${removedKeywords.join(", ")}`);
  }

  if (title.length < 40) {
    metadataPenalty += 18;
    issues.push(`العنوان قصير جداً (${title.length} حرف) — استهدف 55-70 حرفاً لزيادة ظهورك في البحث`);
  } else if (title.length < OPTIMAL_TITLE_MIN) {
    metadataPenalty += 8;
    issues.push(`العنوان (${title.length} حرف) — أضف المزيد من التفاصيل (الهدف 55-70)`);
  }

  if (keywords.length < 40) {
    metadataPenalty += 20;
    issues.push(`عدد الكلمات قليل (${keywords.length}) — استهدف 47-49 كلمة لأقصى قدر من الانتشار`);
  } else if (keywords.length < MIN_KEYWORDS) {
    metadataPenalty += 8;
    issues.push(`عدد الكلمات (${keywords.length}) — أضف المزيد للوصول للنطاق المثالي`);
  }

  if (keywords.length > MAX_KEYWORDS) {
    metadataPenalty += 10;
    issues.push(`عدد الكلمات (${keywords.length}) يتجاوز الحد المسموح به في Adobe (49)`);
  }

  const titleWords = title.toLowerCase().split(/[\s,._-]+/);
  const titleBanned = titleWords.filter(w => BANNED_WORDS_SET.has(w));
  if (titleBanned.length > 0) {
    metadataPenalty += 25;
    issues.push(`يحتوي العنوان على كلمات محظورة: ${titleBanned.join(", ")}`);
  }

  if (!category || category === "Unknown") {
    metadataPenalty += 10;
    issues.push("لم يتم تحديد الفئة — مطلوب من Adobe Stock");
  }

  // Visual/Saturation warnings
  if (saturation <= 2) {
    metadataPenalty += 10;
    issues.push("تشبع عالي جداً — هذا الموضوع يضم ملايين الملفات؛ تحتاج زاوية فريدة جداً");
  }

  if (uniqueness <= 2) {
    metadataPenalty += 10;
    issues.push("تفرد منخفض جداً — من المرجح وجود أصول متطابقة تقريباً، خطر رفض عالٍ");
  }

  // ── Release warnings (Informational only, no points deduction as per request)
  if (releases.modelRelease) issues.push("⚠️ Model Release Required");
  if (releases.propertyRelease) issues.push("⚠️ Property Release Required");
  if (releases.editorialOnly) issues.push("⚠️ Editorial Use Only — Brand/Logo detected");
  if (releases.copyrightConcern) issues.push("⚠️ Copyright Concern — Protected work visible");

  // ── Strategic Bonuses
  if (hasCompetitiveGap) bonuses += 5;
  if (trendCount >= 2) bonuses += 5;
  else if (trendCount === 1) bonuses += 3;

  const finalScore = Math.max(0, Math.min(100, contentScore - metadataPenalty + bonuses));
  const status = finalScore >= 80 ? "ready" : finalScore >= 55 ? "review" : "rejected";

  const estimatedAcceptance = Math.round(
    finalScore >= 80 ? 70 + (finalScore - 80) * 0.75 :
    finalScore >= 55 ? 40 + (finalScore - 55) * 1.2 :
    finalScore * 0.72
  );

  return {
    score: finalScore,
    status,
    issues,
    estimatedAcceptance,
    breakdown: {
      uniqueness: uniqueness * 10,
      commercialValue: commercial * 10,
      subjectClarity: clarity * 10,
      marketSaturation: saturation * 10,
      metadataPenalty: -metadataPenalty,
      bonuses,
    },
  };
}

const buildPrompt = (): string => `
You are a Senior Adobe Stock Intelligence Specialist — 15+ years curating, approving and 
rejecting submissions. Your mission: generate metadata that MAXIMIZES buyer discovery 
while MINIMIZING similarity with the 400M+ assets already on Adobe Stock.

Today: ${new Date().toISOString().slice(0, 10)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 1 — VISUAL DNA (Internal Analysis)
Identify:
• uniqueVisualElement: the ONE detail in this frame that <0.5% of similar assets share.
• colorPalette: 2-3 exact descriptors (e.g., "desaturated sage green", "warm ochre").
• lightingCharacter: precise description (e.g., "harsh overhead fluorescent", "low-key dramatic chiaroscuro").
• emotionalRegister: primary mood in 3-5 words.
• trendAlignment: pick from these 2025-2026 trends: ${RISING_TRENDS_2026.join(", ")}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 2 — COMPETITIVE GAP
Explain in 1-2 sentences what specific market hole this image fills. If none, set uniqueness low.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 3 — TITLE (55-70 characters)
Formula: [Hyper-specific Subject + State] [Rare Visual Detail] [Commercial Signal]
MUST include: 1 color/tone + 1 lighting descriptor + 1 commercial context descriptor.
NO generic adjectives like "beautiful", "stunning".

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 4 — KEYWORDS (EXACTLY 47-49)
Layer A (1-12): Visual Fingerprint — 3-5 word specific details.
Layer B (13-22): Subject Identity — who, age, ethnicity, state, actions.
Layer C (23-32): Environment — hyper-specific context (architectural style, time, season).
Layer D (33-42): Trends & Commercial — alignment with Steps 1-2 + commercial uses.
Layer E (43-49): Concepts & Emotions — "resilience", "unseen labor", "quiet ambition".

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 5 — SCORING (Library-Calibrated)
uniqueness, commercialValue, subjectClarity, marketSaturation (1-10 each).
Scale: 10 = Golden Gap/Elite | 7 = High Quality | 5 = Average | 3 = Generic/Saturated | 1 = Spam risk.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 6 — RELEASES & IP
Check for recognizable faces, property, brands, or artworks.
If concern found, provide an avoidanceHint for cropping.

ADOBE OFFICIAL CATEGORIES (pick exact name):
${ADOBE_CATEGORIES.join(", ")}

RESPOND WITH ONLY JSON:
{
  "visualDNA": {
    "uniqueVisualElement": "string",
    "colorPalette": "string",
    "lightingCharacter": "string",
    "emotionalRegister": "string",
    "trendAlignment": ["array"]
  },
  "competitiveGap": "string",
  "title": "55-70 chars",
  "description": "2-3 sensory and commercial sentences",
  "keywords": ["array of 47-49"],
  "category": "string",
  "scoring": {
    "uniqueness": 0, "commercialValue": 0, "subjectClarity": 0, "marketSaturation": 0, "reasoning": "string"
  },
  "releases": {
    "modelRelease": false, "propertyRelease": false, "editorialOnly": false, "copyrightConcern": false,
    "releaseNote": "string", "avoidanceHint": "string"
  }
}`;

export async function analyzeImageForStock(
  file: File,
  base64Data: string
): Promise<AnalysisResult> {
  const prompt = buildPrompt();
  const isVideo = file.type.startsWith("video/");

  const result = await generateWithGemini(prompt, 0.4, {
    base64: base64Data,
    mimeType: isVideo ? "image/jpeg" : (file.type || "image/jpeg")
  });

  const parsed = extractAndParseJSON<any>(result, {});

  const deduped = deduplicateKeywords(parsed.keywords || []);
  const { filtered: cleanKeywords, removed } = filterBannedKeywords(deduped);

  const trendCount = (parsed.visualDNA?.trendAlignment ?? []).length;
  const hasGap = !!(parsed.competitiveGap && parsed.competitiveGap.length > 20);

  const releases: ReleaseInfo = {
    modelRelease: !!parsed.releases?.modelRelease,
    propertyRelease: !!parsed.releases?.propertyRelease,
    editorialOnly: !!parsed.releases?.editorialOnly,
    copyrightConcern: !!parsed.releases?.copyrightConcern,
    releaseNote: parsed.releases?.releaseNote || "",
    avoidanceHint: parsed.releases?.avoidanceHint || "",
  };

  const readiness = calculateReadinessScore(
    parsed.title || file.name,
    cleanKeywords.slice(0, 49),
    removed,
    parsed.category || "Unknown",
    parsed.scoring || {},
    releases,
    hasGap,
    trendCount
  );

  return {
    id: Date.now().toString(36),
    name: file.name,
    title: parsed.title || file.name,
    description: parsed.description || "",
    keywords: cleanKeywords.slice(0, MAX_KEYWORDS),
    removedKeywords: removed,
    category: parsed.category || "Technology",
    estimatedAcceptance: readiness.estimatedAcceptance,
    adobeReadinessScore: readiness.score,
    adobeReadinessStatus: readiness.status,
    adobeReadinessIssues: readiness.issues,
    scoreBreakdown: readiness.breakdown,
    scoringReasoning: parsed.scoring?.reasoning || "",
    visualDNA: parsed.visualDNA,
    competitiveGap: parsed.competitiveGap,
    releases,
    ipConcern: releases.modelRelease || releases.propertyRelease || releases.editorialOnly || releases.copyrightConcern,
    ipNote: releases.releaseNote || releases.avoidanceHint || ""
  };
}
