import { generateWithGemini, ADOBE_CATEGORIES, extractAndParseJSON } from "./gemini";
import { sanitizePromptOrKeywords, sanitizeStringArray } from "./sanitizer";
import { type ImageAnalysisResult, type ScoreBreakdown, type VisualDNA, type ReleaseInfo } from "../types";

// ════════════════════════════════════════════════════════════
// ADOBE BANNED KEYWORDS — Extended List (2025)
// ════════════════════════════════════════════════════════════
const ADOBE_BANNED_KEYWORDS = [
  // Media descriptors
  "video", "clip", "footage", "motion", "animation", "cinematography",
  "timelapse", "time-lapse", "hyperlapse", "slow motion", "slowmotion",
  // Resolution & technical
  "4k", "8k", "hd", "uhd", "ultra hd", "high-resolution", "high resolution",
  "ai-generated", "ai generated", "artificial intelligence generated",
  // Subjective adjectives
  "beautiful", "stunning", "amazing", "perfect", "gorgeous", "incredible",
  "spectacular", "breathtaking", "masterpiece", "exclusive", "cinematic",
  "awesome", "fantastic", "wonderful", "magnificent", "superb",
  "best", "top", "great", "excellent", "finest",
  // Commercial / Source
  "stock", "adobe", "shutterstock", "getty", "istock", "royalty free",
  "royalty-free", "free", "download", "buy", "sale", "editorial",
  // Design / Technical
  "template", "sample", "preview", "watermark", "render", "3d render",
  "photo", "photograph", "image", "picture", "wallpaper", "background image",
  // Generic low-value
  "new", "latest", "trending", "popular", "viral", "modern",
];

// ════════════════════════════════════════════════════════════
// MARKET TREND INTELLIGENCE — Updated 2025/2026
// ════════════════════════════════════════════════════════════
const RISING_TRENDS = [
  "ai human interaction", "sustainable lifestyle", "mental health awareness",
  "remote work lifestyle", "digital nomad", "neurodiversity representation",
  "gen z aesthetics", "y2k revival", "analog nostalgia", "solarpunk",
  "dark academia", "cottagecore", "urban farming", "creator economy",
  "climate anxiety", "micro living", "longevity wellness", "biohacking",
  "community building", "cultural identity", "gender fluidity", "artisanal craft"
];

const OVERSATURATED_TOPICS = [
  "sunset over mountains", "coffee on desk", "handshake in office",
  "person typing on laptop", "generic city skyline", "autumn leaves falling",
  "hot air balloon cappadocia", "eiffel tower paris", "santorini greece",
  "generic yoga on beach", "business team meeting", "doctor in white coat",
];

// ════════════════════════════════════════════════════════════
// THE PROFESSIONAL PROMPT — Anti-Similarity System
// ════════════════════════════════════════════════════════════
const buildPrompt = (): string => `
You are a Senior Adobe Stock Intelligence Specialist — combining 15+ years of stock 
curation with deep knowledge of market gaps and emerging buyer trends. 
Your mission: generate metadata that MAXIMIZES discovery while MINIMIZING similarity score.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 1 — VISUAL DNA EXTRACTION (think before writing anything)
□ uniqueVisualElement: identify the SINGLE most specific detail that differentiates this frame (e.g., "rim lighting creating orange halo around wet cobblestones" not "street")
□ colorPalette: 2-3 precise colors (e.g., "desaturated sage green", "oxidized copper")
□ lightingCharacter: precise description (e.g., "harsh fluorescent overhead cast")
□ emotionalRegister: the primary mood in 3-5 words
□ trendAlignment: pick matching trends from this list: ${RISING_TRENDS.join(", ")}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 2 — TITLE ENGINEERING
• Exactly 55-70 characters (NEVER shorter)
• Formula: [Specific Subject + Action] [Rare Visual Detail] [Commercial Context]
• MUST include: one color/tone descriptor, one lighting/atmosphere descriptor
• MUST target commercial buyer searches (e.g., Creative Directors)
Good Example: "Exhausted Female Doctor Reviewing Charts Under Harsh Fluorescent Light"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 3 — ANTI-SIMILARITY KEYWORDS (47-49 words exactly)
Layer A (1-12): Visual Fingerprint — 3-5 word phrases of exact details. (e.g., "diffused window light casting soft elongated shadows")
Layer B (13-22): Subject Identity — who, age, ethnicity, state. (e.g., "middle-aged south asian woman concentrating")
Layer C (23-32): Environment — hyper-specific place. (e.g., "cluttered creative studio with exposed brick wall" not "office")
Layer D (33-42): Trend & Commercial — ربط بالترندات الصاعدة + cases ("website hero image", "editorial illustration")
Layer E (43-49): Concepts & Emotions — "resilience", "quiet ambition", "unseen labor"

MANDATORY: NO single-word generic terms like "nature", "people", "business".

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 4 — HONEST COMPETITIVE SCORING
Compare to Adobe's actual 400M+ asset library:
uniqueness (1-10): 10 = exists in <100 assets; 1 = exists in >5,000,000 assets (generic).
commercialValue, subjectClarity, marketSaturation (1-10 each).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 5 — IP & RELEASE ANALYSIS
Check for humans, private property, trademarked landmarks, brand logos, artworks.
 releases: { modelRelease, propertyRelease, editorialOnly, copyrightConcern, releaseNote, avoidanceHint }

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RESPOND WITH ONLY THIS JSON:
{
  "visualDNA": {
    "uniqueVisualElement": "string",
    "colorPalette": "string",
    "lightingCharacter": "string",
    "emotionalRegister": "string",
    "trendAlignment": ["string"]
  },
  "title": "string 55-70 chars",
  "description": "2-3 sentences",
  "keywords": ["array of 47-49"],
  "category": "exact name from official list",
  "competitiveGap": "1-2 sentences explaining market gap",
  "scoring": {
    "uniqueness": 0, "commercialValue": 0, "subjectClarity": 0, "marketSaturation": 0, "reasoning": "string"
  },
  "releases": {
    "modelRelease": false, "propertyRelease": false, "editorialOnly": false, "copyrightConcern": false,
    "releaseNote": "string", "avoidanceHint": "string"
  }
}`;

function deduplicateKeywords(keywords: string[]): string[] {
  const seen = new Set<string>();
  return keywords.filter((kw) => {
    const normalized = kw.toLowerCase().trim();
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

function filterBannedKeywords(keywords: string[]): { filtered: string[]; removed: string[] } {
  const removed: string[] = [];
  const filtered = keywords.filter((kw) => {
    const lower = kw.toLowerCase();
    const isBanned = ADOBE_BANNED_KEYWORDS.some((b) => lower.includes(b.toLowerCase()));
    if (isBanned) removed.push(kw);
    return !isBanned;
  });
  return { filtered, removed };
}

function calculateReadinessScore(
  title: string,
  keywords: string[],
  removedKeywords: string[],
  category: string,
  criteria: any,
  releases: ReleaseInfo,
  hasCompetitiveGap: boolean,
  trendAlignmentCount: number
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

  const contentScore = Math.round(
    (criteria.uniqueness   * 0.30 +
     criteria.commercialValue * 0.30 +
     criteria.subjectClarity  * 0.20 +
     criteria.marketSaturation * 0.20) * 10
  );

  if (removedKeywords.length > 0) {
    metadataPenalty += removedKeywords.length * 12;
    issues.push(`${removedKeywords.length} banned keyword(s) removed`);
  }

  // Raise short title limit: 40 chars penalty
  if (title.length < 40) {
    metadataPenalty += 18;
    issues.push("Title too short (<40 chars)");
  } else if (title.length < 55) {
    metadataPenalty += 8;
    issues.push("Title length below optimal 55-70 chars");
  }

  // Raise word limit
  if (keywords.length < 40) {
    metadataPenalty += 20;
    issues.push(`Low keyword count (${keywords.length}) — target 47-49`);
  } else if (keywords.length < 45) {
    metadataPenalty += 8;
    issues.push("Almost at optimal keyword range");
  }

  if (keywords.length > 49) {
    metadataPenalty += 10;
    issues.push("Keywords exceed Adobe max of 49");
  }

  if (releases.modelRelease) issues.push("⚠️ Model Release required");
  if (releases.propertyRelease) issues.push("⚠️ Property Release required");
  if (releases.editorialOnly) issues.push("⚠️ Editorial Only — logos detected");
  if (releases.copyrightConcern) issues.push("⚠️ Copyright Concern detected");

  // Bonuses
  if (hasCompetitiveGap) bonuses += 5;
  if (trendAlignmentCount >= 2) bonuses += 5;
  else if (trendAlignmentCount >= 1) bonuses += 3;

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
      uniqueness: criteria.uniqueness * 10,
      commercialValue: criteria.commercialValue * 10,
      subjectClarity: criteria.subjectClarity * 10,
      marketSaturation: criteria.marketSaturation * 10,
      metadataPenalty: -metadataPenalty,
      bonuses,
    },
  };
}

export async function analyzeImageForStock(
  file: File,
  base64Data: string
): Promise<ImageAnalysisResult> {
  const prompt = buildPrompt();

  const isVideo = file.type.startsWith("video/");
  const result = await generateWithGemini(prompt, 0.4, {
    base64: base64Data,
    mimeType: isVideo ? "image/jpeg" : (file.type || "image/jpeg")
  });

  const parsed = extractAndParseJSON<any>(result, {});

  const deduped = deduplicateKeywords(parsed.keywords || []);
  const { filtered: cleanKeywords, removed: removed } = filterBannedKeywords(deduped);
  
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
    parsed.category || "Technology",
    parsed.scoring || { uniqueness: 5, commercialValue: 5, subjectClarity: 5, marketSaturation: 5 },
    releases,
    hasGap,
    trendCount
  );

  return {
    filename: file.name,
    title: sanitizePromptOrKeywords(parsed.title || file.name),
    keywords: cleanKeywords.slice(0, 49),
    rejectedKeywords: removed,
    thumbnail: base64Data,
    prompt: sanitizePromptOrKeywords(parsed.description || ""), 
    colorPalette: parsed.visualDNA?.colorPalette || "",
    estimatedAcceptance: readiness.estimatedAcceptance,
    uniquenessReview: parsed.scoring?.reasoning || "",
    adobeReadinessScore: readiness.score,
    adobeReadinessStatus: readiness.status,
    adobeReadinessIssues: readiness.issues,
    category: parsed.category || "Technology",
    uniqueElement: parsed.visualDNA?.uniqueVisualElement || "",
    visualDNA: parsed.visualDNA,
    competitiveGap: parsed.competitiveGap,
    releases,
    ipConcern: releases.modelRelease || releases.propertyRelease || releases.editorialOnly || releases.copyrightConcern,
    ipNote: releases.releaseNote || "",
    scoreBreakdown: readiness.breakdown
  };
}
