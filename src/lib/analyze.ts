import { generateWithGemini, ADOBE_CATEGORIES, extractAndParseJSON } from "./gemini";
import { sanitizePromptOrKeywords, sanitizeStringArray } from "./sanitizer";
import { type ImageAnalysisResult, type ScoringCriteria } from "../types";

const ADOBE_BANNED_KEYWORDS = [
  // Media descriptors
  "video", "clip", "footage", "motion", "animation", "cinematography",
  "timelapse", "time-lapse", "slow motion", "slow-motion", "hyperlapse",
  // Resolution & technical
  "4k", "8k", "hd", "uhd", "ultra hd", "high-resolution", "high resolution",
  "ai-generated", "ai generated", "artificial intelligence generated",
  // Forbidden subjective adjectives
  "beautiful", "stunning", "amazing", "perfect", "gorgeous", "incredible",
  "spectacular", "breathtaking", "masterpiece", "exclusive", "cinematic",
  "awesome", "fantastic", "wonderful", "magnificent", "superb",
  "best", "top", "great", "excellent",
  // Commercial/Source
  "stock", "adobe", "shutterstock", "getty", "istock", "royalty free",
  "royalty-free", "free", "download", "buy", "sale", "editorial",
  // Technical/Design
  "template", "sample", "preview", "watermark", "render", "3d render",
  "realistic render", "photo", "photograph", "image", "picture",
  "wallpaper", "background image", "design",
  // Generic low-value
  "new", "latest", "trending", "popular", "viral", "modern", "contemporary",
];

const buildPrompt = (categories: string[]) => `
You are a Senior Adobe Stock Content Specialist with 15+ years reviewing submissions.
Your job: analyze this video frame and generate metadata that MAXIMIZES acceptance probability.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ADOBE OFFICIAL CATEGORIES (pick EXACTLY one):
${categories.map((c, i) => `${i + 1}. ${c}`).join("\n")}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

══ TITLE RULES (critical for search ranking) ══
• Max 70 characters — use ALL of them, never leave it short
• Formula: [Specific Subject doing Action] [in/at/with Descriptor] [Context/Setting]
• MUST include: season/time of day if visible, dominant color/tone, environment type
• MUST target commercial buyer searches — think: "what would a designer search for?"
• GOOD: "Young Professional Woman Working on Laptop in Bright Modern Office"
• GOOD: "Golden Autumn Leaves Falling on Wet Cobblestone Street at Dusk"
• GOOD: "Fresh Organic Vegetables Arranged on Rustic Wooden Table Overhead View"
• BAD: "Nature Scene" / "Business Meeting" / "Food on Table" (too generic, rejected)
• BAD: Any word from the FORBIDDEN list below
• NO subjective adjectives: beautiful, stunning, amazing, perfect, breathtaking

══ KEYWORD STRATEGY — Generate EXACTLY 45-49 keywords ══
LAYER 1 — Hyper-specific visual descriptors (12-15 keywords):
Describe EXACTLY what you see: specific colors ("warm amber", "deep forest green"), 
lighting quality ("golden hour backlight", "soft diffused shadow", "harsh midday sun"),
textures & materials ("weathered oak wood", "polished concrete", "rough burlap"),
composition ("rule of thirds", "leading lines", "shallow depth of field", "symmetrical")

LAYER 2 — Subject & action (8-10 keywords):
Who/what is the main subject? What are they doing?
Include synonyms: child/children/kid/youth, woman/female/lady, man/male/gentleman
Include states: "resting", "active", "focused", "candid", "posed"

LAYER 3 — Context & environment (8-10 keywords):
Location type, architecture style, natural setting, indoor/outdoor, time of day, season

LAYER 4 — Commercial use cases (8-10 keywords):
HOW will buyers use this? Think: "website header", "social media post", "print advertisement",
"corporate presentation", "blog illustration", "app background", "annual report",
"health brochure", "real estate listing", "travel website"

LAYER 5 — Emotional & conceptual (6-8 keywords):
The mood/feeling: "serene", "energetic", "melancholic", "hopeful", "tense", 
Concepts: "freedom", "teamwork", "sustainability", "innovation", "growth", "wellness"

FORBIDDEN KEYWORDS — these cause IMMEDIATE rejection or score penalty:
video, clip, footage, motion, animation, timelapse, slow motion, 4k, 8k, hd, uhd,
high-resolution, ai-generated, beautiful, stunning, amazing, perfect, gorgeous,
incredible, spectacular, breathtaking, masterpiece, exclusive, cinematic,
awesome, fantastic, wonderful, magnificent, superb, best, top, great,
stock, adobe, shutterstock, getty, royalty free, free, download, buy, sale,
template, sample, preview, watermark, render, 3d render, photo, photograph,
wallpaper, design, new, latest, trending, popular, viral, modern
DO NOT use any brand names (Nike, Apple, Coca-Cola, etc.)

══ UNIQUENESS STRATEGY ══
Before scoring, identify: what is the ONE visual element in this frame that 
fewer than 1% of similar videos on Adobe Stock would have?
Use that element as the FIRST keyword and in the title.
If no unique element exists → uniqueness score must be ≤ 4.

══ IP & RELEASE ANALYSIS ══
Carefully check for:
1. Human faces (recognizable) → "Model Release Required"
2. Private property interiors, named buildings → "Property Release Required"
3. Famous landmarks built after 1927 (Eiffel Tower lit at night, Sydney Opera House) → "Property Release Required"
4. Brand logos, product labels, trademarks → "Editorial Use Only" or "Property Release"
5. Artworks, murals, sculptures → "Copyright Concern"
6. Famous landmarks built before 1927 → generally safe, note "Historic Landmark — likely public domain"

If any concern exists, suggest a specific camera angle or crop that would ELIMINATE the concern.

══ SCORING — Be brutally honest (these affect real upload decisions) ══
uniqueness (1-10): Compare to Adobe Stock's 400M+ assets. 
  10=nobody else has this exact scene; 5=thousands of similar; 1=millions of identical
commercialValue (1-10): Would a marketing agency pay $79 for this specific frame?
  10=perfect for multiple industries; 5=limited use; 1=decorative only, zero commercial use
subjectClarity (1-10): Is the main subject immediately obvious in first 0.5 seconds?
  10=crystal clear; 5=needs context; 1=cluttered/blurry/unclear
marketSaturation (1-10): How crowded is this exact niche on Adobe?
  10=unique gap in market; 5=moderate competition; 1=Cappadocia/sunset/coffee level saturation

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Respond with ONLY this JSON — absolutely no markdown or extra text:
{
  "title": "string max 70 chars, targeting commercial searches",
  "description": "2-3 sentences, commercial language, includes intended use, no banned words",
  "keywords": ["exactly 45-49", "ordered by relevance", "most specific first"],
  "uniqueElement": "the ONE thing that makes this frame stand out from millions of similar assets",
  "category": "exact name from the official list above",
  "scoring": {
    "uniqueness": number (1-10),
    "commercialValue": number (1-10),
    "subjectClarity": number (1-10),
    "marketSaturation": number (1-10),
    "reasoning": "3-4 honest sentences: what makes this score high/low, comparison to market"
  },
  "releases": {
    "modelRelease": boolean,
    "propertyRelease": boolean,
    "releaseNote": "what requires release and why, or empty string",
    "avoidanceHint": "specific camera angle or crop to avoid the IP issue, or empty string"
  },
  "ipConcern": boolean,
  "ipNote": "string or empty string"
}
`;

function filterBannedKeywords(keywords: string[]): { filtered: string[]; removed: string[] } {
  const removed: string[] = [];
  const filtered = keywords.filter((kw) => {
    const isBanned = ADOBE_BANNED_KEYWORDS.some((b) =>
      kw.toLowerCase().includes(b.toLowerCase())
    );
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
  criteria: ScoringCriteria,
  releases: { modelRelease: boolean; propertyRelease: boolean },
  uniqueElement: string
): { score: number; status: "ready"|"review"|"rejected"; issues: string[]; breakdown: Record<string,number>; estimatedAcceptance: number } {
  const issues: string[] = [];
  let metadataPenalty = 0;

  const contentScore = Math.round(
    (criteria.uniqueness * 0.30 +
     criteria.commercialValue * 0.30 +
     criteria.subjectClarity * 0.20 +
     criteria.marketSaturation * 0.20) * 10
  );

  if (removedKeywords.length > 0) {
    metadataPenalty += removedKeywords.length * 12; // Adjusted from 15 to 12 as per req
    issues.push(`${removedKeywords.length} banned keyword(s) removed: ${removedKeywords.join(", ")}`);
  }
  if (title.length < 40) { // Increased from 30 to 40
    metadataPenalty += 15;
    issues.push("Title too short — loses search visibility, target 50-70 chars");
  }
  if (keywords.length < 40) { // Increased from 25 to 40
    metadataPenalty += 20;
    issues.push(`Only ${keywords.length} keywords — target 45-49 for max discoverability`);
  }
  if (keywords.length > 49) {
    metadataPenalty += 10;
    issues.push(`${keywords.length} keywords — Adobe max is 49, excess cut automatically`);
  }
  
  const titleBanned = ADOBE_BANNED_KEYWORDS.filter((b) => title.toLowerCase().includes(b.toLowerCase()));
  if (titleBanned.length > 0) {
    metadataPenalty += 25;
    issues.push(`Banned word(s) in title: ${titleBanned.join(", ")}`);
  }
  if (!category) {
    metadataPenalty += 10;
    issues.push("No category assigned — required field on Adobe Stock");
  }

  // Release warnings (no penalty as requested)
  if (releases.modelRelease) {
    issues.push("⚠️ Model Release required — recognizable face(s) detected");
  }
  if (releases.propertyRelease) {
    issues.push("⚠️ Property Release required — private property or protected landmark");
  }

  if (criteria.marketSaturation <= 3)
    issues.push("Highly saturated niche — differentiate with unique angle or rare lighting");
  if (criteria.uniqueness <= 3)
    issues.push("Low uniqueness — very similar assets already on Adobe Stock, likely rejected");

  // Bonus for unique element
  const uniqueBonus = uniqueElement && uniqueElement.length > 10 ? 5 : 0;

  const finalScore = Math.max(0, Math.min(100, contentScore - metadataPenalty + uniqueBonus));
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
    breakdown: {
      uniqueness: criteria.uniqueness * 10,
      commercialValue: criteria.commercialValue * 10,
      subjectClarity: criteria.subjectClarity * 10,
      marketSaturation: criteria.marketSaturation * 10,
      metadataPenalty: -metadataPenalty,
      uniqueBonus,
    },
    estimatedAcceptance,
  };
}

export async function analyzeImageForStock(
  file: File,
  base64Data: string
): Promise<ImageAnalysisResult> {
  const prompt = buildPrompt(ADOBE_CATEGORIES);

  const isVideo = file.type.startsWith("video/");
  const result = await generateWithGemini(prompt, 0.4, {
    base64: base64Data,
    mimeType: isVideo ? "image/jpeg" : (file.type || "image/jpeg")
  });

  interface RawAnalysisResponse {
    title: string;
    description: string;
    keywords: string[];
    uniqueElement: string;
    category: string;
    scoring: {
      uniqueness: number;
      commercialValue: number;
      subjectClarity: number;
      marketSaturation: number;
      reasoning: string;
    };
    releases: {
      modelRelease: boolean;
      propertyRelease: boolean;
      releaseNote: string;
      avoidanceHint: string;
    };
    ipConcern: boolean;
    ipNote: string;
  }
  
  const parsed = extractAndParseJSON<RawAnalysisResponse>(result, {
    title: "Untitled Stock Element",
    description: "",
    keywords: [],
    uniqueElement: "",
    category: "Technology",
    scoring: { uniqueness: 5, commercialValue: 5, subjectClarity: 5, marketSaturation: 5, reasoning: "" },
    releases: { modelRelease: false, propertyRelease: false, releaseNote: "", avoidanceHint: "" },
    ipConcern: false,
    ipNote: ""
  });

  const rawKeywords = sanitizeStringArray(parsed.keywords || []).map(k => k.trim().toLowerCase());
  const { filtered: cleanKeywords, removed: rejected } = filterBannedKeywords(rawKeywords);
  
  const readiness = calculateReadinessScore(
    parsed.title,
    cleanKeywords,
    rejected,
    parsed.category,
    parsed.scoring,
    parsed.releases,
    parsed.uniqueElement
  );

  return {
    filename: file.name,
    title: sanitizePromptOrKeywords(parsed.title),
    keywords: cleanKeywords.slice(0, 49),
    rejectedKeywords: rejected,
    thumbnail: base64Data,
    prompt: sanitizePromptOrKeywords(parsed.description), 
    colorPalette: "",
    deformationScore: readiness.score < 60 ? 100 : 0, 
    estimatedAcceptance: readiness.estimatedAcceptance,
    uniquenessReview: parsed.scoring.reasoning,
    adobeReadinessScore: readiness.score,
    category: parsed.category,
    uniqueElement: parsed.uniqueElement,
    releases: parsed.releases
  };
}
