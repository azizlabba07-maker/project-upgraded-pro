/**
 * ثوابت Adobe Stock — موحّدة ومحدّثة
 * ═══════════════════════════════════
 * المصدر: Adobe Stock Submission Guidelines + Contributor Help Center
 * https://helpx.adobe.com/stock/contributor/help/submission-guidelines.html
 */

export const ADOBE_CATEGORIES = [
  "Animals", "Buildings and Architecture", "Business", "Drinks", "Environment",
  "States of Mind", "Food", "Graphic Resources", "Hobbies and Leisure",
  "Industry", "Landscapes", "Lifestyle", "People", "Plants and Flowers",
  "Culture and Religion", "Science", "Social Issues", "Sports", "Technology",
  "Transport and Infrastructure", "Travel",
] as const;

/**
 * كلمات محظورة في عناوين وكلمات Adobe Stock.
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * ملاحظة: "photo" و"photograph" محذوفتان لأنهما مصطلحان مشروعان.
 * للقائمة الكاملة للعلامات التجارية، راجع sanitizer.ts → ADOBE_STOCK_BLACKLIST
 * وأيضاً adobeStockCompliance.ts → GLOBAL_IP_BLACKLIST
 */
export const ADOBE_BANNED_KEYWORDS = [
  // ─── مصطلحات تقنية للفيديو ───
  "video", "clip", "footage", "motion", "animation", "cinematography",
  "timelapse", "hyperlapse", "slowmotion", "slow motion",
  "motion graphic", "motion graphics", "b-roll", "b roll",

  // ─── دقة ───
  "4k", "8k", "hd", "uhd", "high resolution", "high-resolution",
  "full hd", "ultra hd", "1080p", "2160p", "resolution",

  // ─── ذكاء اصطناعي ───
  "ai-generated", "ai generated", "created by ai", "made with ai",
  "midjourney", "dall-e", "dalle", "stable diffusion", "chatgpt",
  "openai", "gemini ai", "adobe firefly", "leonardo ai",
  "runway ml", "pika labs", "sora", "kling ai", "flux",

  // ─── وصفية ترويجية ───
  "beautiful", "stunning", "amazing", "perfect", "gorgeous", "incredible",
  "spectacular", "breathtaking", "masterpiece", "exclusive", "cinematic",
  "awesome", "fantastic", "wonderful", "magnificent", "superb",
  "best", "top", "great", "excellent", "finest", "quality", "premium",
  "must see", "award winning", "world class", "top rated",
  "eye-catching", "jaw-dropping", "mind-blowing", "show-stopping",

  // ─── مواقع منافسة ───
  "stock", "adobe", "shutterstock", "getty", "istock", "royaltyfree",
  "royalty free", "free", "download", "buy", "sale",
  "dreamstime", "alamy", "depositphotos", "123rf", "pond5",

  // ─── عناصر غير مقبولة ───
  "editorial", "template", "sample", "preview", "watermark",
  "render", "wallpaper", "design", "new", "latest", "trending",
  "popular", "viral", "sharp focus", "highly detailed",
  "hyper realistic", "photorealistic", "unreal engine",
  "octane render", "redshift", "vray",
  "raw file", "placeholder", "mockup", "mock-up",
  "generic", "generic term", "operating system",
];

export const MAX_KEYWORDS   = 49;
export const MIN_KEYWORDS   = 47;
export const OPTIMAL_TITLE_MIN = 55;
export const MAX_TITLE_LENGTH  = 70;

/**
 * اتجاهات 2025-2026 — مبنية على بيانات حقيقية
 * المصادر: Adobe Creative Trends 2025, Shutterstock, Pinterest Predicts, Google Trends
 */
export const RISING_TRENDS_2026 = [
  "ai human collaboration", "sustainable lifestyle", "mental wellness ritual",
  "remote work culture", "digital nomad life", "neurodiversity representation",
  "gen-z aesthetic", "y2k nostalgia", "analog film aesthetic",
  "solarpunk design", "dark academia style", "cottagecore lifestyle",
  "urban micro-farming", "creator economy hustle", "climate activism",
  "micro-living intentional", "longevity biohacking", "cold plunge recovery",
  "community third-place", "cultural diaspora identity", "gender fluid fashion",
  "artisanal slow craft", "solopreneur workspace", "quiet luxury aesthetic",
  "dopamine dressing color", "coastal grandmother style", "old money aesthetic",
  "biophilic interior", "mushroom foraging culture", "fermentation revival",
];

/**
 * مفاهيم عامة جداً تسبب رفض "Similar Content"
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * المصدر: https://helpx.adobe.com/stock/contributor/help/similar-vs-spamming.html
 * هذه المفاهيم ليست "محظورة" لكن يجب إضافة زاوية فريدة لها
 */
export const GENERIC_CONCEPT_WARNINGS = [
  "empty office", "abstract background", "lush plant",
  "colorful dips", "seeds in water", "person smiling",
  "sunset over ocean", "coffee cup on desk", "laptop on table",
  "handshake business", "green leaves close-up", "city skyline night",
  "bokeh lights", "water splash", "paint splatter",
  "keyboard typing", "phone screen", "social media icons",
];
