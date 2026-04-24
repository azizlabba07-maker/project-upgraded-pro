import { GLOBAL_IP_BLACKLIST, ADOBE_BANNED_METADATA_TERMS } from "./adobeStockCompliance";

const EXTRA_BANNED_TERMS = ["design", "quality", "brochure", "template", "mockup", "high res", "high resolution"];

/**
 * Smart Swap Map: Maps high-risk brand names to safe generic synonyms.
 */
const SMART_SWAP_MAP: Record<string, string> = {
  "iphone": "premium smartphone",
  "ipad": "tablet device",
  "macbook": "laptop computer",
  "imac": "desktop computer",
  "airpods": "wireless earbuds",
  "apple watch": "smart watch",
  "samsung galaxy": "mobile phone",
  "microsoft windows": "computer software",
  "xbox": "gaming console",
  "google pixel": "smartphone",
  "chromebook": "laptop computer",
  "surface tablet": "tablet device",
  "nintendo switch": "portable game console",
  "tesla": "electric vehicle",
  "bmw": "luxury sedan",
  "mercedes": "premium car",
  "audi": "modern vehicle",
  "ferrari": "sports car",
  "lamborghini": "supercar",
  "nike": "athletic footwear",
  "adidas": "sportswear",
  "gucci": "luxury fashion",
  "louis vuitton": "designer bag",
  "rolex": "high-end watch",
  "coca-cola": "cola beverage",
  "pepsi": "soda drink",
  "mcdonalds": "fast food restaurant",
  "starbucks": "coffeehouse",
  "heinz": "tomato ketchup",
  "tabasco": "pepper sauce",
  "maggi": "instant seasoning",
  "knorr": "bouillon",
  "kfc": "fried chicken restaurant",
  "subway": "sandwich restaurant",
  "lego": "building blocks",
  "barbie": "fashion doll",
  "moka pot": "stovetop espresso maker",
  "kleenex": "facial tissue",
  "velcro": "hook and loop fastener",
  "ziploc": "plastic storage bag",
  "tupperware": "food container",
  "charcuterie": "artisan appetizer platter",
  "charcuterie board": "gourmet meat and cheese platter",
  "nutella": "hazelnut cocoa spread",
  "nespresso": "espresso machine",
  "stanley cup": "insulated tumbler",
  "thermos": "vacuum flask"
};

const AMBIGUOUS_SAFE_WORDS = new Set([
  "windows", "surface", "apple", "galaxy", "pixel", "android", "switch", "meta", "prime", "sprint", "dell", "canon",
]);

const ADOBE_METADATA_DEATH_LIST = [
  "video", "footage", "clip", "4k", "8k", "uhd", "high resolution", "high res", "hd",
  "stunning", "amazing", "beautiful", "epic", "masterpiece", "exclusive", "best", "top",
  "trending", "premium", "must see", "sharp focus", "highly detailed", "photorealistic",
  "unreal engine", "octane render", "redshift", "vray", "midjourney", "dall-e",
  "stable diffusion", "ai generated", "ai-generated", "created by ai", "design", "quality",
  "brochure", "template", "mockup", "aerial", "drone", "motion", "animation", "cinematic"
];

const ADOBE_STOCK_BLACKLIST = [
  "nike", "adidas", "puma", "reebok", "under armour", "iphone", "ipad", "macbook", "imac", "airpods", "apple watch",
  "microsoft windows", "xbox", "surface tablet", "surface pro", "google pixel", "chromebook", "samsung galaxy",
  "disney", "marvel", "dc comics", "star wars", "pixar", "coca-cola", "pepsi", "mcdonalds", "burger king", "starbucks",
  "tesla", "spacex", "ferrari", "porsche", "lamborghini", "bmw", "mercedes", "audi", "bentley", "rolls royce", "maserati",
  "rolex", "omega", "cartier", "gucci", "louis vuitton", "prada", "chanel", "hermes", "versace", "dior", "balenciaga", "yves saint laurent",
  "amazon", "facebook", "instagram", "whatsapp", "twitter", "tiktok", "netflix", "youtube", "hulu", "spotify", "twitch",
  "sony", "playstation", "nintendo switch", "ikea", "lego", "mattel", "barbie", "hasbro", "hot wheels", "nerf", "lenovo", "asus", "acer",
  "mickey mouse", "donald duck", "goofy", "winnie the pooh", "batman", "superman", "spiderman", "spider-man", "iron man", "avengers",
  "captain america", "thor marvel", "hulk marvel", "black panther", "wonder woman", "aquaman", "flash dc", "darth vader", "yoda",
  "luke skywalker", "chewbacca", "r2d2", "harry potter", "hogwarts", "dumbledore", "voldemort", "pokemon", "pikachu", "charizard",
  "mario bros", "sonic hedgehog", "zelda", "link nintendo", "minions", "shrek", "elsa frozen", "buzz lightyear", "transformers", "optimus prime",
  "spongebob", "patrick star", "hello kitty", "totoro", "picasso", "van gogh", "da vinci", "monet", "rembrandt", "salvador dali",
  "andy warhol", "banksy", "frida kahlo", "kandinsky", "klimt", "greg rutkowski", "artgerm", "alphonse mucha", "stanley artgerm",
  "james gurney", "thomas kinkade", "bob ross", "wlop", "ilya kuvshinov", "makoto shinkai", "hayao miyazaki", "studio ghibli",
  "disney style", "pixar style", "marvel style", "dreamworks style", "comic book style", "eiffel tower", "statue of liberty",
  "big ben", "sydney opera house", "taj mahal", "colosseum rome", "christ the redeemer", "burj khalifa", "empire state building",
  "golden gate bridge", "hollywood sign", "times square", ...GLOBAL_IP_BLACKLIST
];

export function sanitizePromptOrKeywords(text: string): string {
  if (!text) return "";
  let sanitized = text;
  const purgeRegex = new RegExp(`\\b(${ADOBE_METADATA_DEATH_LIST.join('|')})\\b`, 'gi');
  sanitized = sanitized.replace(purgeRegex, "");
  for (const [brand, swap] of Object.entries(SMART_SWAP_MAP)) {
    const regex = new RegExp(`\\b${brand}\\b`, 'gi');
    sanitized = sanitized.replace(regex, swap);
  }
  sanitized = sanitized.replace(/\s+/g, " ").trim();
  return sanitized;
}

export function sanitizeStringArray(arr: string[]): string[] {
  if (!Array.isArray(arr)) return [];
  return arr.map(kw => sanitizePromptOrKeywords(kw)).filter(kw => kw.trim().length > 0);
}

function prioritizeKeywords(keywords: string[]): string[] {
  const tier1 = keywords.slice(0, 10);
  const tier2 = keywords.slice(10);
  return [...tier1, ...tier2].slice(0, 49);
}

export function sanitizeForExport(text: string): string {
  return sanitizePromptOrKeywords(text);
}

export function sanitizeKeywordsForExport(keywords: string[]): string[] {
  if (!Array.isArray(keywords)) return [];
  const unique = new Set<string>();
  keywords.forEach(kw => {
    const parts = kw.split(",");
    parts.forEach(p => {
      const cleaned = sanitizeForExport(p);
      if (cleaned && cleaned.length > 1) unique.add(cleaned);
    });
  });
  return prioritizeKeywords(Array.from(unique));
}

export function suggestCategory(title: string, keywords: string[]): string | null {
  const combined = (title + " " + keywords.join(" ")).toLowerCase();
  if (combined.includes("white background") || combined.includes("isolated")) return "Graphic Resources";
  return null;
}

export interface IPRiskFlag {
  term: string;
  severity: "critical" | "warning";
  suggestion: string;
}

export function scanForIPRisks(title: string, keywords: string[]): IPRiskFlag[] {
  const flags: IPRiskFlag[] = [];
  const combined = (title + " " + keywords.join(" ")).toLowerCase();
  for (const word of ADOBE_STOCK_BLACKLIST) {
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    if (regex.test(combined)) {
      flags.push({ term: word, severity: "critical", suggestion: `أزل "${word}"` });
    }
  }
  return flags;
}

export function extractAndParseJSON<T>(rawResponse: string, fallback: T): T {
  try {
    const cleaned = rawResponse.replace(/```(json)?/g, '').replace(/```/g, '').trim();
    const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
    const objectMatch = cleaned.match(/\{[\s\S]*\}/);
    let target = arrayMatch ? arrayMatch[0] : objectMatch ? objectMatch[0] : cleaned;
    return JSON.parse(target) as T;
  } catch {
    return fallback;
  }
}

const CACHE_PREFIX = "stock_ai_cache_";
export async function withCache<T>(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T> {
  const fullKey = CACHE_PREFIX + key;
  try {
    const cachedStr = localStorage.getItem(fullKey);
    if (cachedStr) {
      const parsed = JSON.parse(cachedStr);
      if (Date.now() < parsed.expiry) return parsed.data as T;
    }
  } catch {}
  const freshData = await fetcher();
  try {
    localStorage.setItem(fullKey, JSON.stringify({ expiry: Date.now() + ttlMs, data: freshData }));
  } catch {}
  return freshData;
}

export interface SimilarityWarning {
  indexA: number;
  indexB: number;
  filenameA: string;
  filenameB: string;
  similarity: number;
  reason: string;
}

function keywordSimilarity(kwA: string[], kwB: string[]): number {
  const setA = new Set(kwA.map(k => k.toLowerCase().trim()));
  const setB = new Set(kwB.map(k => k.toLowerCase().trim()));
  let intersection = 0;
  for (const k of setA) if (setB.has(k)) intersection++;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : Math.round((intersection / union) * 100);
}

function titleSimilarity(titleA: string, titleB: string): number {
  const wordsA = new Set(titleA.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  const wordsB = new Set(titleB.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  let intersection = 0;
  for (const w of wordsA) if (wordsB.has(w)) intersection++;
  const union = new Set([...wordsA, ...wordsB]).size;
  return union === 0 ? 0 : Math.round((intersection / union) * 100);
}

export function detectBatchSimilarity(items: Array<{ filename: string; title: string; keywords: string[] }>, threshold: number = 60): SimilarityWarning[] {
  const warnings: SimilarityWarning[] = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const kwSim = keywordSimilarity(items[i].keywords, items[j].keywords);
      const ttSim = titleSimilarity(items[i].title, items[j].title);
      const combined = Math.round(kwSim * 0.7 + ttSim * 0.3);
      if (combined >= threshold) {
        warnings.push({ indexA: i, indexB: j, filenameA: items[i].filename, filenameB: items[j].filename, similarity: combined, reason: `تشابه: ${combined}%` });
      }
    }
  }
  return warnings;
}
