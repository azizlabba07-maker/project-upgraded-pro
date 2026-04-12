import { GLOBAL_IP_BLACKLIST, ADOBE_BANNED_METADATA_TERMS } from "./adobeStockCompliance";

/**
 * Smart Swap Map: Maps high-risk brand names to safe generic synonyms.
 */
const SMART_SWAP_MAP: Record<string, string> = {
  "apple": "generic tech",
  "iphone": "premium smartphone",
  "ipad": "tablet",
  "macbook": "laptop",
  "imac": "desktop computer",
  "airpods": "wireless earbuds",
  "samsung": "electronics brand",
  "galaxy": "mobile device",
  "microsoft": "software company",
  "windows": "operating system",
  "xbox": "gaming console",
  "google": "search engine company",
  "pixel": "android phone",
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
  "mcdonalds": "fast food chain",
  "starbucks": "coffeehouse",
  "heinz": "tomato ketchup",
  "tabasco": "pepper sauce",
  "maggi": "instant seasoning",
  "knorr": "bouillon",
  "kfc": "fried chicken",
  "subway": "sandwich shop",
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


/**
 * 1. ADOBE STOCK COMPLIANCE SANITIZER — HARDENED v2
 * =================================================
 * Prevents account ban due to AI hallucinations that include:
 *  - Copyrighted material & trademarks (IP Refusal)
 *  - Artist names, fictional characters
 *  - AI platform names
 *  - Food brands & product packaging references (NEW — primary rejection cause)
 *  - Promotional/spam keywords Adobe blacklists
 */

const ADOBE_STOCK_BLACKLIST = [
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Major Brands & Tech Companies
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  "nike", "adidas", "puma", "reebok", "under armour",
  "apple", "iphone", "ipad", "macbook", "imac", "airpods",
  "microsoft", "windows", "xbox", "surface",
  "google", "android", "pixel", "chromebook",
  "samsung", "galaxy",
  "disney", "marvel", "dc comics", "star wars", "pixar",
  "coca-cola", "pepsi", "mcdonalds", "burger king", "starbucks",
  "tesla", "spacex", "ferrari", "porsche", "lamborghini",
  "bmw", "mercedes", "audi", "bentley", "rolls royce", "maserati",
  "rolex", "omega", "cartier", "gucci", "louis vuitton", "prada", "chanel",
  "hermes", "versace", "dior", "balenciaga", "yves saint laurent",
  "amazon", "facebook", "meta", "instagram", "whatsapp", "twitter", "tiktok",
  "netflix", "youtube", "hulu", "spotify", "twitch",
  "sony", "playstation", "nintendo", "switch",
  "ikea", "lego", "mattel", "barbie", "hasbro", "hot wheels", "nerf",
  "hp", "dell", "lenovo", "asus", "acer",

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Fictional Characters & IP
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  "mickey mouse", "donald duck", "goofy", "winnie the pooh",
  "batman", "superman", "spiderman", "spider-man", "iron man", "avengers",
  "captain america", "thor marvel", "hulk marvel", "black panther",
  "wonder woman", "aquaman", "flash dc",
  "darth vader", "yoda", "luke skywalker", "chewbacca", "r2d2",
  "harry potter", "hogwarts", "dumbledore", "voldemort",
  "pokemon", "pikachu", "charizard",
  "mario bros", "sonic hedgehog", "zelda", "link nintendo",
  "minions", "shrek", "elsa frozen", "buzz lightyear",
  "transformers", "optimus prime",
  "spongebob", "patrick star",
  "hello kitty", "totoro",

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Artists / Styles (Prevents "in the style of [Artist]")
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  "picasso", "van gogh", "da vinci", "monet", "rembrandt", "salvador dali",
  "andy warhol", "banksy", "frida kahlo", "kandinsky", "klimt",
  "greg rutkowski", "artgerm", "alphonse mucha", "stanley artgerm",
  "james gurney", "thomas kinkade", "bob ross", "wlop",
  "ilya kuvshinov", "makoto shinkai", "hayao miyazaki",
  "studio ghibli", "disney style", "pixar style", "marvel style",
  "dreamworks style", "comic book style",
  "in the style of", "inspired by", "by artist", "style of",
  "reminiscent of", "homage to", "tribute to",

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // AI Generators (Adobe forbids tagging as AI platform output)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  "midjourney", "dall-e", "dalle", "dall e",
  "stable diffusion", "stability ai",
  "ai generated", "ai-generated", "made with ai", "created by ai",
  "chatgpt", "openai", "gemini ai", "claude ai",
  "firefly", "adobe firefly",
  "leonardo ai", "ideogram", "runway ml",

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Adobe-Banned Promotional Language
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  "best quality", "masterpiece", "award winning", "exclusive",
  "must see", "top rated", "number one", "world's best",

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Famous Landmarks (IP for recognizable buildings/places)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  "eiffel tower", "statue of liberty", "big ben", "sydney opera house",
  "taj mahal", "colosseum rome", "christ the redeemer",
  "burj khalifa", "empire state building", "golden gate bridge",
  "hollywood sign", "times square",

  // Merge in the GLOBAL_IP_BLACKLIST from compliance module
  ...GLOBAL_IP_BLACKLIST,
];

/**
 * Sanitize a single text string (prompt, title, or keyword) by removing all blacklisted terms.
 */
export function sanitizePromptOrKeywords(text: string): string {
  if (!text) return "";
  let sanitized = text;

  // 1. Technical Suffix Stripping (Adobe Banned Titles/Metadata)
  // Strips "Video Clip", "Footage", "4K", etc. from the end or middle of strings
  const technicalSuffixes = [
    /\s+video\s+clip\b/gi,
    /\s+footage\b/gi,
    /\s+motion\s+footage\b/gi,
    /\s+animation\b/gi,
    /\s+clip\b/gi,
    /\b(4k|8k|uhd)\b/gi,
    /\b(cinematic|stunning|amazing)\b/gi,
  ];
  for (const pattern of technicalSuffixes) {
    sanitized = sanitized.replace(pattern, "");
  }
  
  // 2. Replace blacklisted words case-insensitively with Smart Swap or Generic term
  // We combine ADOBE_STOCK_BLACKLIST and ADOBE_BANNED_METADATA_TERMS for thorough cleaning
  const masterBlacklist = Array.from(new Set([...ADOBE_STOCK_BLACKLIST, ...ADOBE_BANNED_METADATA_TERMS]));
  
  for (const word of masterBlacklist) {
    const lowerWord = word.toLowerCase();
    const replacement = SMART_SWAP_MAP[lowerWord] || "generic term";
    
    // Escape regex special characters in the word
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
    
    if (regex.test(sanitized)) {
        // If it's a banned metadata term (e.g. "4k", "video"), just remove it
        if (ADOBE_BANNED_METADATA_TERMS.includes(lowerWord)) {
            sanitized = sanitized.replace(regex, "");
        } else {
            sanitized = sanitized.replace(regex, replacement);
        }
    }
  }

  // 3. Strip packaging-related visual cues from prompts
  const packagingPatterns = [
    /\b(branded|brand\s*name|product\s*label|logo\s*on)\b/gi,
    /\b(trademark|registered|©|®|™)\b/gi,
    /\b(bottle\s*with\s*label|labeled\s*(container|bottle|jar|can))\b/gi,
  ];
  for (const pattern of packagingPatterns) {
    sanitized = sanitized.replace(pattern, "[Redacted-IP]");
  }

  // Final cleanup of extra spaces
  return sanitized.replace(/\s+/g, " ").trim();
}

/**
 * Sanitize an array of strings (keywords), removing any that contain blacklisted content.
 */
export function sanitizeStringArray(arr: string[]): string[] {
  if (!Array.isArray(arr)) return [];
  // Also filter out any keywords that BECAME entirely "[Redacted-IP]"
  return arr
    .map(kw => sanitizePromptOrKeywords(kw))
    .filter(kw => kw.trim().length > 0 && !kw.includes("[Redacted-IP]"));
}

/**
 * 1.5 BATCH SIMILARITY DETECTOR — NEW
 * =====================================
 * Prevents "SIMILAR CONTENT IN OUR COLLECTION" rejection.
 * Compares titles and keywords across a batch to detect near-duplicates
 * BEFORE upload, alerting the user to remove highly similar assets.
 */

export interface SimilarityWarning {
  indexA: number;
  indexB: number;
  filenameA: string;
  filenameB: string;
  similarity: number; // 0 to 100
  reason: string;
}

/**
 * Compute Jaccard similarity between two keyword sets (0-100).
 */
function keywordSimilarity(kwA: string[], kwB: string[]): number {
  if (kwA.length === 0 && kwB.length === 0) return 100;
  if (kwA.length === 0 || kwB.length === 0) return 0;
  const setA = new Set(kwA.map(k => k.toLowerCase().trim()));
  const setB = new Set(kwB.map(k => k.toLowerCase().trim()));
  let intersection = 0;
  for (const k of setA) {
    if (setB.has(k)) intersection++;
  }
  const union = new Set([...setA, ...setB]).size;
  return Math.round((intersection / union) * 100);
}

/**
 * Simple word-overlap similarity between two titles (0-100).
 */
function titleSimilarity(titleA: string, titleB: string): number {
  const wordsA = new Set(titleA.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  const wordsB = new Set(titleB.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  if (wordsA.size === 0 && wordsB.size === 0) return 100;
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let intersection = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) intersection++;
  }
  const union = new Set([...wordsA, ...wordsB]).size;
  return Math.round((intersection / union) * 100);
}

/**
 * Detect pairs of items in a batch that are too similar.
 * Returns warnings for any pair with combined similarity > threshold.
 */
export function detectBatchSimilarity(
  items: Array<{ filename: string; title: string; keywords: string[] }>,
  threshold: number = 60
): SimilarityWarning[] {
  const warnings: SimilarityWarning[] = [];

  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const kwSim = keywordSimilarity(items[i].keywords, items[j].keywords);
      const ttSim = titleSimilarity(items[i].title, items[j].title);
      // Weighted average: keywords matter more than title
      const combined = Math.round(kwSim * 0.7 + ttSim * 0.3);

      if (combined >= threshold) {
        const reasons: string[] = [];
        if (kwSim >= 70) reasons.push(`تشابه كلمات مفتاحية: ${kwSim}%`);
        if (ttSim >= 60) reasons.push(`تشابه عنوان: ${ttSim}%`);
        if (reasons.length === 0) reasons.push(`تشابه عام: ${combined}%`);

        warnings.push({
          indexA: i,
          indexB: j,
          filenameA: items[i].filename,
          filenameB: items[j].filename,
          similarity: combined,
          reason: reasons.join(" | "),
        });
      }
    }
  }

  // Sort by highest similarity first
  warnings.sort((a, b) => b.similarity - a.similarity);
  return warnings;
}

/**
 * IP RISK SCANNER — Checks title and keywords for potential IP violations
 * Returns a list of flagged terms that could cause INTELLECTUAL PROPERTY REFUSAL
 */
export interface IPRiskFlag {
  term: string;
  severity: "critical" | "warning";
  suggestion: string;
}

export function scanForIPRisks(title: string, keywords: string[]): IPRiskFlag[] {
  const flags: IPRiskFlag[] = [];
  const combined = (title + " " + keywords.join(" ")).toLowerCase();

  // Check against all blacklisted terms
  for (const word of ADOBE_STOCK_BLACKLIST) {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
    if (regex.test(combined)) {
      flags.push({
        term: word,
        severity: "critical",
        suggestion: `أزل "${word}" — قد يسبب رفض IP فوري`,
      });
    }
  }

  // Check for packaging/label language patterns
  const packagingPhrases = [
    { pattern: /\b(dip|dips|sauce|condiment)\s+(brand|variety|type)\b/i, msg: "أوصاف تقترح منتج تجاري بعينه" },
    { pattern: /\b(labeled|branded|name\s*brand)\b/i, msg: "إشارة لمنتج يحمل علامة تجارية" },
    { pattern: /\b(recipe|homemade|artisan)\s+(style|version)\s+of\b/i, msg: "قد يشير لمنتج تجاري محدد" },
  ];
  for (const { pattern, msg } of packagingPhrases) {
    if (pattern.test(combined)) {
      flags.push({ term: pattern.source, severity: "warning", suggestion: msg });
    }
  }

  return flags;
}


/**
 * 2. ROBUST JSON PARSER
 * This replaces the fragile raw match(/\[[\s\S]*\]/) approach.
 * It attempts to clean markdown code blocks, locate the first valid JSON array or object,
 * and parses it safely without crashing the UI.
 */
export function extractAndParseJSON<T>(rawResponse: string, fallback: T): T {
  if (!rawResponse || typeof rawResponse !== 'string') return fallback;

  try {
    // Attempt 1: Just parse as-is
    return JSON.parse(rawResponse) as T;
  } catch (e1) {
    try {
      // Attempt 2: Strip markdown blocks like ```json ... ```
      let cleaned = rawResponse.replace(/```(json)?/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleaned) as T;
    } catch (e2) {
      try {
        // Attempt 3: Look for the first { ... } or [ ... ]
        const arrayMatch = rawResponse.match(/\[[\s\S]*\]/);
        const objectMatch = rawResponse.match(/\{[\s\S]*\}/);
        
        let target = "";
        
        // Pick whichever matches first (array or object depending on what we expect)
        if (arrayMatch && objectMatch) {
            target = arrayMatch.index! < objectMatch.index! ? arrayMatch[0] : objectMatch[0];
        } else if (arrayMatch) {
            target = arrayMatch[0];
        } else if (objectMatch) {
            target = objectMatch[0];
        } else {
            throw new Error("No JSON boundaries found");
        }

        return JSON.parse(target) as T;
      } catch (e3) {
        console.error("Critical JSON parse failure:", rawResponse);
        return fallback; // Crucial: Return fallback instead of crashing the app
      }
    }
  }
}

/**
 * 3. LOCAL CACHE SYSTEM
 * Prevents re-calling Gemini/OpenAI for the exact same prompt/topic
 * within the cache TTL (Time To Live). Saves huge API costs.
 */
const CACHE_PREFIX = "stock_ai_cache_";

export async function withCache<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const fullKey = CACHE_PREFIX + key;
  
  try {
    const cachedStr = localStorage.getItem(fullKey);
    if (cachedStr) {
      const parsed = JSON.parse(cachedStr);
      if (Date.now() < parsed.expiry) {
        console.log(`[Cache Hit] Retuning cached data for: ${key}`);
        return parsed.data as T;
      } else {
        localStorage.removeItem(fullKey); // Expired
      }
    }
  } catch (e) {
    console.warn("Cache read error, ignoring...", e);
  }

  // Cache miss or expired, call the fetcher
  console.log(`[Cache Miss] Fetching fresh data for: ${key}`);
  const freshData = await fetcher();
  
  try {
    const toCache = {
      expiry: Date.now() + ttlMs,
      data: freshData
    };
    localStorage.setItem(fullKey, JSON.stringify(toCache));
  } catch (e) {
    console.warn("Cache write error, might be full...", e);
    // If local storage is full, we don't crash, we just don't cache
  }

  return freshData;
}

/**
 * Clear all cached data.
 */
export function clearAllCache(): number {
  let count = 0;
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(CACHE_PREFIX)) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((k) => {
    localStorage.removeItem(k);
    count++;
  });
  return count;
}

/**
 * Clear cached data matching a prefix (after the cache prefix).
 */
export function clearCacheByPrefix(prefix: string): number {
  let count = 0;
  const fullPrefix = CACHE_PREFIX + prefix;
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(fullPrefix)) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((k) => {
    localStorage.removeItem(k);
    count++;
  });
  return count;
}
