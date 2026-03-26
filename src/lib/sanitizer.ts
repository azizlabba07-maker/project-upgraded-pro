// src/lib/sanitizer.ts

/**
 * 1. ADOBE STOCK COMPLIANCE SANITIZER
 * This prevents the user's account from being banned due to AI hallucinations
 * that include copyrighted material, artist names, or forbidden platform words.
 */
const ADOBE_STOCK_BLACKLIST = [
  // Brands and Companies
  "nike", "adidas", "apple", "microsoft", "google", "disney", "marvel", "dc comics", "star wars",
  "coca-cola", "pepsi", "mcdonalds", "burger king", "starbucks", "tesla", "ferrari", "porsche",
  "bmw", "mercedes", "audi", "lamborghini", "rolex", "gucci", "louis vuitton", "prada", "chanel",
  "amazon", "facebook", "instagram", "twitter", "tiktok", "netflix", "youtube", "sony", "nintendo",
  "playstation", "xbox", "ikea", "lego", "mattel", "barbie", "hasbro", "hot wheels", "nerf",
  
  // Specific restricted IPs
  "mickey mouse", "donald duck", "batman", "superman", "spiderman", "iron man", "avengers",
  "darth vader", "yoda", "harry potter", "hogwarts", "pokemon", "pikachu", "minions",

  // Artists / Styles (To avoid "in the style of [Artist]")
  "picasso", "van gogh", "da vinci", "monet", "rembrandt", "salvador dali", "andy warhol",
  "banksy", "greg rutkowski", "artgerm", "alphonse mucha", "stanley artgerm", "james gurney",
  "thomas kinkade", "bob ross", "wlop", "ilya kuvshinov", "makoto shinkai", "hayao miyazaki",
  "studio ghibli", "disney style", "pixar style", "marvel style", "comic book style", 
  "in the style of", "inspired by", "by artist",

  // AI Generators (Adobe forbids tagging images as Midjourney, etc.)
  "midjourney", "dall-e", "dalle", "stable diffusion", "ai generated", "chatgpt", "openai", "gemini", "claude",
];

export function sanitizePromptOrKeywords(text: string): string {
  if (!text) return "";
  let sanitized = text;
  
  // Replace blacklisted words case-insensitively
  for (const word of ADOBE_STOCK_BLACKLIST) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    sanitized = sanitized.replace(regex, "[Redacted-IP]");
  }

  return sanitized;
}

export function sanitizeStringArray(arr: string[]): string[] {
  if (!Array.isArray(arr)) return [];
  // Also filter out any keywords that BECAME entirely "[Redacted-IP]"
  return arr
    .map(kw => sanitizePromptOrKeywords(kw))
    .filter(kw => kw.trim().length > 0 && !kw.includes("[Redacted-IP]"));
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
