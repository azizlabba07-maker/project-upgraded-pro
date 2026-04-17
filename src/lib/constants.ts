export const ADOBE_CATEGORIES = [
  "Animals", "Buildings and Architecture", "Business", "Drinks", "Environment",
  "States of Mind", "Food", "Graphic Resources", "Hobbies and Leisure",
  "Industry", "Landscapes", "Lifestyle", "People", "Plants and Flowers",
  "Culture and Religion", "Science", "Social Issues", "Sports", "Technology",
  "Transport and Infrastructure", "Travel",
] as const;

/**
 * كلمات محظورة في عناوين وكلمات Adobe Stock.
 * ملاحظة: "photo" و"photograph" محذوفتان لأنهما مصطلحان مشروعان.
 * للقائمة الكاملة للعلامات التجارية، راجع sanitizer.ts → ADOBE_STOCK_BLACKLIST
 */
export const ADOBE_BANNED_KEYWORDS = [
  // مصطلحات تقنية للفيديو
  "video", "clip", "footage", "motion", "animation", "cinematography",
  "timelapse", "hyperlapse", "slowmotion", "slow motion",
  // دقة
  "4k", "8k", "hd", "uhd", "high resolution", "high-resolution",
  // ذكاء اصطناعي
  "ai-generated", "ai generated", "created by ai", "made with ai",
  "midjourney", "dall-e", "dalle", "stable diffusion", "chatgpt",
  "openai", "gemini ai", "adobe firefly", "leonardo ai",
  // وصفية ترويجية
  "beautiful", "stunning", "amazing", "perfect", "gorgeous", "incredible",
  "spectacular", "breathtaking", "masterpiece", "exclusive", "cinematic",
  "awesome", "fantastic", "wonderful", "magnificent", "superb",
  "best", "top", "great", "excellent", "finest", "quality", "premium",
  "must see", "award winning", "world class", "top rated",
  // مواقع منافسة
  "stock", "adobe", "shutterstock", "getty", "istock", "royaltyfree",
  "royalty free", "free", "download", "buy", "sale",
  // عناصر غير مقبولة
  "editorial", "template", "sample", "preview", "watermark",
  "render", "wallpaper", "design", "new", "latest", "trending",
  "popular", "viral", "sharp focus", "highly detailed",
  "hyper realistic", "photorealistic", "unreal engine",
  "octane render", "redshift", "vray",
];

export const MAX_KEYWORDS   = 49;
export const MIN_KEYWORDS   = 47;
export const OPTIMAL_TITLE_MIN = 55;
export const MAX_TITLE_LENGTH  = 70;

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
];
