import { GLOBAL_IP_BLACKLIST, ADOBE_BANNED_METADATA_TERMS } from "./adobeStockCompliance";

const EXTRA_BANNED_TERMS = ["design", "quality", "brochure", "template", "mockup", "high res", "high resolution"];

/**
 * Smart Swap Map: Maps high-risk brand names to safe generic synonyms.
 */
const SMART_SWAP_MAP: Record<string, string> = {
  // ━━━━━ Tech (multi-word only — single common words removed) ━━━━━
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
  // ━━━━━ Automotive ━━━━━
  "tesla": "electric vehicle",
  "bmw": "luxury sedan",
  "mercedes": "premium car",
  "audi": "modern vehicle",
  "ferrari": "sports car",
  "lamborghini": "supercar",
  // ━━━━━ Fashion & Luxury ━━━━━
  "nike": "athletic footwear",
  "adidas": "sportswear",
  "gucci": "luxury fashion",
  "louis vuitton": "designer bag",
  "rolex": "high-end watch",
  // ━━━━━ Food & Beverage ━━━━━
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
  // ━━━━━ Toys & Household ━━━━━
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
 * Ambiguous words that are common English AND brand names.
 */
const AMBIGUOUS_SAFE_WORDS = new Set([
  "windows", "surface", "apple", "galaxy", "pixel", "android", "switch", "meta", "prime", "sprint", "dell", "canon",
]);

/**
 * 🚨 PROMOTIONAL & TECHNICAL BAN LIST
 * Adobe REJECTS metadata containing these terms as they are considered "spam" or "non-descriptive".
 */
const ADOBE_METADATA_DEATH_LIST = [
  "video", "footage", "clip", "4k", "8k", "uhd", "high resolution", "high res", "hd",
  "stunning", "amazing", "beautiful", "epic", "masterpiece", "exclusive", "best", "top",
  "trending", "premium", "must see", "sharp focus", "highly detailed", "photorealistic",
  "unreal engine", "octane render", "redshift", "vray", "midjourney", "dall-e",
  "stable diffusion", "ai generated", "ai-generated", "created by ai", "design", "quality",
  "brochure", "template", "mockup", "aerial", "drone", "motion", "animation", "cinematic"
];

/**
 * Sanitize a single text string (prompt, title, or keyword).
 * FORCED PURGE: Automatically removes banned terms.
 */
export function sanitizePromptOrKeywords(text: string): string {
  if (!text) return "";
  let sanitized = text;

  // 1. Technical & Promotional Purge
  const purgeRegex = new RegExp(`\\b(${ADOBE_METADATA_DEATH_LIST.join('|')})\\b`, 'gi');
  sanitized = sanitized.replace(purgeRegex, "");

  // 2. IP Swap / Redaction
  for (const [brand, swap] of Object.entries(SMART_SWAP_MAP)) {
    const regex = new RegExp(`\\b${brand}\\b`, 'gi');
    sanitized = sanitized.replace(regex, swap);
  }

  // 3. Artifact Cleanup
  const artifactPatterns = [
    /\boperating system(s)?\b/gi,
    /\bgeneric (?:term|tech|surface|background|item|product|object|element|material|concept)\b/gi,
    /\belectronics brand\b/gi,
    /\bsoftware company\b/gi,
    /\bsearch engine company\b/gi,
    /\bandroid phone\b/gi,
    /\bmobile device(s)?\b/gi,
    /\b\[Redacted-IP\]\b/gi,
  ];
  for (const pattern of artifactPatterns) {
    sanitized = sanitized.replace(pattern, "");
  }

  // 4. Fragment Cleanup
  sanitized = sanitized
    .replace(/\s*,\s*,/g, ",")
    .replace(/\s+,/g, ",")
    .replace(/,\s*\./g, ".")
    .replace(/\.\.+/g, ".")
    .replace(/^\s*[,.]\s*/g, "")
    .replace(/\s*[,.]\s*$/g, "")
    .replace(/\s+/g, " ").trim();

  return sanitized;
}

/**
 * TIER-BASED KEYWORD SORTER
 * Adobe priorities the FIRST 10 keywords. This ensures subject/action are first.
 */
function prioritizeKeywords(keywords: string[]): string[] {
  const subjectTerms = ["man", "woman", "person", "interior", "exterior", "building", "landscape", "technology", "abstract", "nature", "science", "medical", "business"];
  const actionTerms = ["running", "walking", "sitting", "working", "glowing", "flowing", "growing", "falling", "flying", "moving"];
  const environmentTerms = ["office", "forest", "city", "sky", "ocean", "room", "laboratory", "hospital", "street", "garden"];
  
  const tier1: string[] = []; // Subjects & Actions (Highest priority)
  const tier2: string[] = []; // Environments & Materials
  const tier3: string[] = []; // Colors & Moods
  const tier4: string[] = []; // Others

  keywords.forEach(kw => {
    const low = kw.toLowerCase();
    if (subjectTerms.some(t => low.includes(t)) || actionTerms.some(t => low.includes(t))) {
      tier1.push(kw);
    } else if (environmentTerms.some(t => low.includes(t))) {
      tier2.push(kw);
    } else if (low.length < 4) {
      tier4.push(kw);
    } else {
      tier3.push(kw);
    }
  });

  return [...new Set([...tier1, ...tier2, ...tier3, ...tier4])].slice(0, 49);
}

/**
 * FINAL EXPORT GATE — sanitizeForExport()
 */
export function sanitizeForExport(text: string): string {
  return sanitizePromptOrKeywords(text);
}

/**
 * Sanitize an array of keyword strings for CSV export.
 * ENFORCES: relevance ordering + 49 limit.
 */
export function sanitizeKeywordsForExport(keywords: string[]): string[] {
  if (!Array.isArray(keywords)) return [];
  const unique = new Set<string>();
  
  keywords.forEach(kw => {
    const parts = kw.split(",");
    parts.forEach(p => {
      const cleaned = sanitizeForExport(p);
      if (cleaned && cleaned.length > 1) {
        unique.add(cleaned);
      }
    });
  });
  
  const sanitizedArray = Array.from(unique);
  return prioritizeKeywords(sanitizedArray);
}

/**
 * Detects if content should be "Graphic Resources" (e.g. isolated on white)
 */
export function suggestCategory(title: string, keywords: string[]): string | null {
  const combined = (title + " " + keywords.join(" ")).toLowerCase();
  if (combined.includes("white background") || combined.includes("isolated") || combined.includes("alpha channel") || combined.includes("green screen")) {
    return "Graphic Resources";
  }
  return null;
}

// ... rest of the file (extractAndParseJSON, withCache, etc.) ...


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
