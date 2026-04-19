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
import { ADOBE_AI_PROMPT_RULES } from "./adobeStockCompliance";
import { sanitizeStringArray, sanitizePromptOrKeywords } from "./sanitizer";

// Set للكشف السريع عن الكلمات المحظورة البسيطة
const BANNED_WORDS_SET = new Set(ADOBE_BANNED_KEYWORDS.map(w => w.toLowerCase()));

/**
 * فلترة الكلمات المحظورة مع دعم المصطلحات المركّبة (multi-word).
 */
function filterBannedKeywords(keywords: string[]): { filtered: string[]; removed: string[] } {
  const removed: string[] = [];
  const filtered = keywords.filter((kw) => {
    const normalized = kw.toLowerCase().trim();
    
    // 1. تحقق من المصطلح كاملاً
    const normalizedNoDash = normalized.replace(/[-\s]+/g, "");
    if (BANNED_WORDS_SET.has(normalized) || BANNED_WORDS_SET.has(normalizedNoDash)) {
      removed.push(kw);
      return false;
    }
    
    // 2. تحقق من كل كلمة منفردة
    const words = normalized.split(/[\s,._-]+/).filter(Boolean);
    const isBanned = words.some((w) => BANNED_WORDS_SET.has(w));
    
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

  const uniqueness = criteria.uniqueness || 3;
  const commercial = criteria.commercialValue || 3;
  const quality    = criteria.visualQuality || (criteria as any).subjectClarity || 3;
  const saturation = criteria.marketSaturation || 3;

  const contentScore = Math.round(
    (uniqueness  * 0.25 +
     commercial  * 0.25 +
     quality     * 0.35 +
     saturation  * 0.15) * 10
  );

  // ── عقوبات (تمت معايرتها لتكون واقعية)
  if (removedKeywords.length > 0) {
    metadataPenalty += removedKeywords.length * 4; // تقليل العقوبة من 12 إلى 4
    issues.push(`${removedKeywords.length} كلمة مفتاحية غير مناسبة تم حذفها`);
  }

  if (title.length < 30) {
    metadataPenalty += 12;
    issues.push(`العنوان قصير جداً (${title.length} حرف)`);
  } else if (title.length < 50) {
    metadataPenalty += 5;
    issues.push(`العنوان (${title.length} حرف) يمكن تحسينه بإضافة تفاصيل`);
  }

  if (keywords.length < 25) {
    metadataPenalty += 15;
    issues.push(`عدد الكلمات قليل جداً (${keywords.length})`);
  } else if (keywords.length < MIN_KEYWORDS) {
    metadataPenalty += 5;
    issues.push(`عدد الكلمات (${keywords.length}) جيد ولكن يفضل الوصول لـ 49`);
  }

  if (keywords.length > MAX_KEYWORDS) {
    metadataPenalty += 5;
    issues.push(`عدد الكلمات يتجاوز الحد (49)`);
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

  if (saturation <= 2) {
    metadataPenalty += 10;
    issues.push("High Saturation — Very high competition, needs a unique angle");
  }

  if (quality <= 3) {
    metadataPenalty += 40;
    issues.push("🚨 Technical Quality Issue: AI artifacts or distortions detected");
  }

  if (uniqueness <= 2) {
    metadataPenalty += 15;
    issues.push("Similar Content — Too similar to existing Adobe Stock assets");
  }

  // ── تحذيرات الحقوق (عقوبات صارمة)
  if (releases.modelRelease) {
    metadataPenalty += 20;
    issues.push("⚠️ Model Release Required");
  }
  if (releases.propertyRelease) {
    metadataPenalty += 20;
    issues.push("⚠️ Property Release Required");
  }
  if (releases.editorialOnly) {
    metadataPenalty += 50; // Force rejection
    issues.push("⚠️ Editorial Use Only — Brand/Logo detected");
  }
  if (releases.copyrightConcern) {
    metadataPenalty += 60; // Force immediate rejection
    issues.push("⚠️ Copyright Concern — Protected work visible (Logo/Text)");
  }

  // ── مكافآت استراتيجية
  if (hasCompetitiveGap) bonuses += 5;
  if (trendCount >= 2)   bonuses += 5;
  else if (trendCount === 1) bonuses += 3;

  const finalScore = Math.max(0, Math.min(100, contentScore - metadataPenalty + bonuses));
  const status = finalScore >= 80 ? "ready" : finalScore >= 55 ? "review" : "rejected";

  const estimatedAcceptance = Math.round(
    finalScore >= 85 ? 80 + (finalScore - 85) * 1.3 :
    finalScore >= 70 ? 60 + (finalScore - 70) * 1.3 :
    finalScore >= 40 ? 30 + (finalScore - 40) * 1.0 :
    finalScore * 0.75
  );

  return {
    score: finalScore,
    status,
    issues,
    estimatedAcceptance,
    breakdown: {
      uniqueness:      uniqueness * 10,
      commercialValue: commercial * 10,
      visualQuality:   quality    * 10,
      marketSaturation: saturation * 10,
      metadataPenalty: -metadataPenalty,
      bonuses,
    },
  };
}

const buildPrompt = (batchContext?: string): string => `
You are a Senior Adobe Stock Intelligence Specialist — 15+ years curating, approving and 
rejecting submissions. Your mission: generate metadata that MAXIMIZES buyer discovery 
while MINIMIZING similarity with the 400M+ assets already on Adobe Stock.
Today: ${new Date().toISOString().slice(0, 10)}

${batchContext ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BATCH CONTEXT (PREVIOUS ASSETS IN THIS FOLDER):
${batchContext}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
` : ""}

${ADOBE_AI_PROMPT_RULES}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨 VISUAL QUALITY & IP TRAP-HUNTING (CRITICAL):
Adobe Stock has ZERO TOLERANCE for text, logos, or AI artifacts.
- IP TRAP: Look for ANY letters, numbers, or symbols on products (e.g., "GO" on a glass, "NI" on a shoe).
- If ANY text/logo is visible: set 'copyrightConcern: true', 'editorialOnly: true', and 'visualQuality: 1'.
- Hallucinations: Check for distorted anatomy, warped textures, or gravity-defying objects.
- If artifacts found: set 'visualQuality: 1'.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

STEP 1 — VISUAL DNA
• uniqueVisualElement: the ONE detail in this frame that <0.5% of similar assets share.
• colorPalette: 2-3 exact descriptors (e.g., "desaturated sage green", "warm ochre").
• lightingCharacter: precise description (e.g., "harsh overhead fluorescent", "chiaroscuro").
• emotionalRegister: primary mood in 3-5 words.
• trendAlignment: pick from 2025-2026 trends: ${RISING_TRENDS_2026.join(", ")}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 2 — COMPETITIVE GAP & QUALITY AUDIT
Identify:
1. Market Hole: What does this fill?
2. AI Artifacts: Any hallucinations or distortions? (Mention specifically).
3. IP Audit: Any visible logos or brands?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 3 — TITLE (55-70 characters)
Formula: [Hyper-specific Subject + State] + [Rare Visual Detail] + [Commercial Signal]
MUST include: 1 color/tone + 1 lighting descriptor + 1 commercial context.
NEVER use: "design", "quality", "HD", "4K", "video", "footage", "brochure", "clip", "amazing", "stunning".
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 4 — KEYWORDS (EXACTLY 49)
⚠️ CRITICAL ORDERING RULE: Keywords MUST be ordered from STRONGEST buyer-intent to WEAKEST.
ORDERED LAYERS:
Positions 1-10  (HIGHEST BUYER INTENT): Exact phrases.
Positions 11-40 (MEDIUM INTENT): Subject/Action/Context.
Positions 41-49 (CONCEPTUAL): Emotion/Mood.
FORBIDDEN: "design", "quality", "brochure", "template", "stock", "ai", "video", "footage", "4k", "hd".
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 5 — REAL-WORLD SCORING (1-10 each)
uniqueness: 10=Golden Gap | 7=Differentiated | 5=Average | 1=SPAM/SIMILAR
commercialValue: How likely buyers pay for this?
visualQuality: 10=Perfect | 5=Minor AI artifacts | 1=Major Hallucinations (REJECT)
marketSaturation: 10=Very niche | 5=Moderate competition | 1=Millions of similar assets
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 6 — RELEASES & IP
Check faces, branded property, trademarks, copyrighted artworks.
Provide avoidanceHint for any concerns.
ADOBE OFFICIAL CATEGORIES (pick exact name):
${ADOBE_CATEGORIES.join(", ")}
RESPOND WITH ONLY VALID JSON — NO MARKDOWN:
{
  "visualDNA": {
    "uniqueVisualElement": "string",
    "colorPalette": "string",
    "lightingCharacter": "string",
    "emotionalRegister": "string",
    "trendAlignment": ["matching 2025-2026 trends only"]
  },
  "qualityAudit": {
    "artifactsDetected": "string",
    "ipConcerns": "string",
    "commercialViability": "string"
  },
  "title": "55-70 chars, no banned words",
  "description": "2-3 sensory commercial sentences",
  "keywords": ["EXACTLY 47-49 keywords, ORDERED BY BUYER INTENT — strongest first"],
  "category": "exact Adobe category name",
  "scoring": {
    "uniqueness": 0,
    "commercialValue": 0,
    "visualQuality": 0,
    "marketSaturation": 0,
    "reasoning": "1-2 sentences"
  },
  "releases": {
    "modelRelease": false,
    "propertyRelease": false,
    "editorialOnly": false,
    "copyrightConcern": false,
    "releaseNote": "string",
    "avoidanceHint": "string"
  }
} `.trim();

export async function analyzeImageForStock(
  file: File,
  base64Data: string,
  batchContext?: string
): Promise<AnalysisResult> {
  const prompt = buildPrompt(batchContext);
  const isVideo = file.type.startsWith("video/");

  const result = await generateWithGemini(prompt, 0.4, {
    base64: base64Data,
    mimeType: isVideo ? "image/jpeg" : (file.type || "image/jpeg")
  });

  const parsed = extractAndParseJSON<any>(result, {});

  const sanitizedFirst = sanitizeStringArray(parsed.keywords || []);
  const deduped = deduplicateKeywords(sanitizedFirst);
  const { filtered: cleanKeywords, removed } = filterBannedKeywords(deduped);

  const cleanTitle = sanitizePromptOrKeywords(parsed.title || file.name);

  const trendCount = (parsed.visualDNA?.trendAlignment ?? []).length;
  const hasGap = !!(parsed.competitiveGap && parsed.competitiveGap.length > 20);

  const releases: ReleaseInfo = {
    modelRelease:     !!parsed.releases?.modelRelease,
    propertyRelease:  !!parsed.releases?.propertyRelease,
    editorialOnly:    !!parsed.releases?.editorialOnly,
    copyrightConcern: !!parsed.releases?.copyrightConcern,
    releaseNote:   parsed.releases?.releaseNote  || "",
    avoidanceHint: parsed.releases?.avoidanceHint || "",
  };

  const readiness = calculateReadinessScore(
    cleanTitle,
    cleanKeywords.slice(0, MAX_KEYWORDS),
    removed,
    parsed.category || "Unknown",
    parsed.scoring || {},
    releases,
    !!parsed.qualityAudit,
    trendCount
  );

  // Add quality audit issues to readiness
  if (parsed.qualityAudit?.artifactsDetected && parsed.qualityAudit.artifactsDetected !== "none") {
    readiness.issues.push(`Visual Issue: ${parsed.qualityAudit.artifactsDetected}`);
  }
  if (parsed.qualityAudit?.ipConcerns && parsed.qualityAudit.ipConcerns !== "none") {
    readiness.issues.push(`IP Risk: ${parsed.qualityAudit.ipConcerns}`);
  }

  return {
    id: Date.now().toString(36),
    name: file.name,
    title: cleanTitle,
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
