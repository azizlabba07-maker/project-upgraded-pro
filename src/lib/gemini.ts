import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabase, checkAuthStatus } from "./supabase";
import { ADOBE_AI_PROMPT_RULES, ADOBE_VIDEO_NEGATIVE_SUFFIX, ADOBE_IMAGE_NEGATIVE_SUFFIX } from "./adobeStockCompliance";
import { extractAndParseJSON, withCache, sanitizePromptOrKeywords, sanitizeStringArray } from "@/lib/sanitizer";

const GEMINI_STORAGE_KEY = "gemini_api_key";
const GEMINI_STORAGE_KEYS = "gemini_api_keys";
const GEMINI_STORAGE_LAST_KEY_INDEX = "gemini_api_last_key_index";
const GEMINI_MODELS = [
  "gemini-2.5-flash-lite", // أعلى حصة مجانية: 1000 طلب/يوم
  "gemini-2.0-flash",
  "gemini-1.5-flash-latest",
  "gemini-1.5-flash",
];
const GEMINI_API_VERSIONS = ["v1", "v1beta"];

function readStoredGeminiApiKey(): string {
  try {
    const list = readStoredGeminiApiKeys();
    if (list.length > 0) return list[0];
    return localStorage.getItem(GEMINI_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

function readStoredGeminiApiKeys(): string[] {
  try {
    const raw = localStorage.getItem(GEMINI_STORAGE_KEYS);
    const parsed = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) {
      const cleaned = parsed
        .map((v) => (typeof v === "string" ? v.trim() : ""))
        .filter(Boolean);
      if (cleaned.length > 0) return Array.from(new Set(cleaned));
    }
    const legacy = localStorage.getItem(GEMINI_STORAGE_KEY)?.trim();
    return legacy ? [legacy] : [];
  } catch {
    return [];
  }
}

function getGeminiApiKey(): string {
  const userKey = readStoredGeminiApiKey();
  if (userKey.trim()) return userKey.trim();
  const envKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (envKey) return envKey;
  return "";
}

function getGeminiUrl(model: string, apiVersion: string, apiKey = getGeminiApiKey()): string {
  return `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
}

function getLastGeminiKeyIndex(): number {
  try {
    const raw = localStorage.getItem(GEMINI_STORAGE_LAST_KEY_INDEX);
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
  } catch {
    return 0;
  }
}

function setLastGeminiKeyIndex(index: number): void {
  try {
    localStorage.setItem(GEMINI_STORAGE_LAST_KEY_INDEX, String(Math.max(0, Math.floor(index))));
  } catch {}
}

function buildRotatedKeyPool(keys: string[]): string[] {
  if (keys.length <= 1) return keys;
  const start = getLastGeminiKeyIndex() % keys.length;
  return [...keys.slice(start), ...keys.slice(0, start)];
}

export function setUserGeminiApiKey(key: string) {
  try {
    if (key.trim()) {
      localStorage.setItem(GEMINI_STORAGE_KEY, key.trim());
      localStorage.setItem(GEMINI_STORAGE_KEYS, JSON.stringify([key.trim()]));
    } else {
      localStorage.removeItem(GEMINI_STORAGE_KEY);
      localStorage.removeItem(GEMINI_STORAGE_KEYS);
    }
  } catch {}
}

export function getUserGeminiApiKey(): string {
  return readStoredGeminiApiKey();
}

export function getUserGeminiApiKeys(): string[] {
  return readStoredGeminiApiKeys();
}

export function addUserGeminiApiKey(key: string): { added: boolean; reason?: "exists" | "limit" | "empty" } {
  const trimmed = key.trim();
  if (!trimmed) return { added: false, reason: "empty" };
  const current = readStoredGeminiApiKeys();
  if (current.some((k) => k === trimmed)) return { added: false, reason: "exists" };
  if (current.length >= 10) return { added: false, reason: "limit" };
  const next = [...current, trimmed];
  try {
    localStorage.setItem(GEMINI_STORAGE_KEYS, JSON.stringify(next));
    localStorage.setItem(GEMINI_STORAGE_KEY, next[0]);
  } catch {}
  return { added: true };
}

export function removeUserGeminiApiKey(key: string): void {
  const next = readStoredGeminiApiKeys().filter((k) => k !== key);
  try {
    if (next.length === 0) {
      localStorage.removeItem(GEMINI_STORAGE_KEY);
      localStorage.removeItem(GEMINI_STORAGE_KEYS);
      return;
    }
    localStorage.setItem(GEMINI_STORAGE_KEYS, JSON.stringify(next));
    localStorage.setItem(GEMINI_STORAGE_KEY, next[0]);
  } catch {}
}

export type GeminiKeyHealthStatus = "valid" | "quota" | "auth" | "network" | "unknown";

export async function validateAllGeminiApiKeys(): Promise<Array<{ key: string; status: GeminiKeyHealthStatus; message: string }>> {
  const keys = readStoredGeminiApiKeys();
  const results: Array<{ key: string; status: GeminiKeyHealthStatus; message: string }> = [];
  for (const key of keys) {
    const check = await validateGeminiApiKey(key);
    const normalized = check.message.toLowerCase();
    let status: GeminiKeyHealthStatus = "unknown";
    if (check.ok && normalized.includes("صالح")) status = "valid";
    else if (normalized.includes("الحصة") || normalized.includes("quota")) status = "quota";
    else if (normalized.includes("غير صالح") || normalized.includes("مقيّد") || normalized.includes("403")) status = "auth";
    else if (normalized.includes("الاتصال") || normalized.includes("network")) status = "network";
    results.push({
      key,
      status,
      message: check.message,
    });
  }
  return results;
}

/**
 * توليد عنوان مقترح احترافي لنيش معيّن لغرض البدء في محرك الفرص
 */
export async function suggestStockTitle(niche: string): Promise<string> {
  const prompt = `You are a high-conversion Adobe Stock title specialist. 
  Someone is starting a niche search for: "${niche}".
  Suggest ONE extremely clickable, professional, and SEO-optimized English title (max 70 characters) that covers this niche but adds a "buyer-intent" angle.
  Example if niche is "Ramadan": "Ramadan Kareem Background with Golden Islamic Patterns"
  Return ONLY the title string, no quotes.`;
  
  return generateWithGemini(prompt, 0.7);
}

export function hasAnyApiKey(): boolean {
  return readStoredGeminiApiKeys().length > 0 || Boolean((import.meta.env.VITE_GEMINI_API_KEY || "").trim());
}

type GeminiErrorPayload = {
  error?: {
    code?: number;
    message?: string;
    status?: string;
    details?: Array<{ retryDelay?: string; violations?: Array<{ quotaId?: string; quotaMetric?: string }> }>;
  };
};

export type GeminiErrorType = "quota" | "rate_limit" | "auth" | "network" | "no_key" | "unknown";

function isDailyQuotaExceeded(payload: GeminiErrorPayload | null): boolean {
  if (!payload?.error) return false;
  const quotaViolations = payload.error.details?.flatMap((d) => d.violations || []) || [];
  const hasDailyQuotaViolation = quotaViolations.some((v) => v.quotaId?.toLowerCase().includes("perday"));
  const message = payload.error.message?.toLowerCase() || "";
  return hasDailyQuotaViolation || message.includes("perday") || message.includes("limit: 0") || message.includes("daily limit");
}

function getRetryDelayFromPayload(payload: GeminiErrorPayload | null): number | null {
  const retryInfo = payload?.error?.details?.find((d) => typeof d.retryDelay === "string");
  if (!retryInfo?.retryDelay) return null;
  const delay = retryInfo.retryDelay;
  if (delay.endsWith("ms")) return Math.max(0, Math.ceil(parseFloat(delay)));
  if (delay.endsWith("s")) return Math.max(0, Math.ceil(parseFloat(delay) * 1000));
  const parsed = parseFloat(delay);
  return Number.isFinite(parsed) ? Math.max(0, Math.ceil(parsed * 1000)) : null;
}

function buildApiError(status: number, payload: GeminiErrorPayload | null): Error {
  const baseMessage = payload?.error?.message?.replace(/\s+/g, " ").trim() || `API error: ${status}`;
  const prefix = isDailyQuotaExceeded(payload)
    ? "GEMINI_QUOTA_DAILY_EXCEEDED"
    : status === 429 ? "API_ERROR_429"
    : `API_ERROR_${status}`;
  return new Error(`${prefix}: ${baseMessage}`);
}

export function classifyGeminiError(error: unknown): GeminiErrorType {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (!message) return "unknown";
  if (message.includes("no_api_key") || message.includes("no api key")) return "no_key";
  if (message.includes("gemini_all_keys_exhausted_daily")) return "quota";
  if (message.includes("gemini_quota_daily_exceeded")) return "quota";
  if (message.includes("api_error_429")) return "rate_limit";
  if (
    message.includes("api_error_401") || message.includes("api_error_403") ||
    message.includes("api key not valid") || message.includes("permission denied") ||
    message.includes("referer") || message.includes("api_key_http_referrer_blocked")
  ) return "auth";
  if (message.includes("failed to fetch") || message.includes("networkerror") || message.includes("network request failed")) return "network";
  return "unknown";
}

export function getGeminiErrorUserMessage(error: unknown): string {
  const type = classifyGeminiError(error);
  const messages: Record<string, string> = {
    no_key: "لم يتم تعيين مفتاح API. أضف مفتاحك من تبويب الإعدادات ⚙️",
    quota: "تم استهلاك الحصة اليومية. إذا أضفت عدة مفاتيح وما زال نفس الخطأ، غالبًا المفاتيح من نفس مشروع Google Cloud (حصة مشتركة). استخدم مفاتيح من مشاريع مختلفة أو انتظر 24 ساعة.",
    rate_limit: "تم تجاوز حد الطلبات. انتظر ثوانٍ ثم أعد المحاولة.",
    auth: "مفتاح API غير صالح أو مقيّد. تأكد من:\n1. تفعيل Generative Language API في Google Cloud Console\n2. إزالة قيود HTTP referrer عن المفتاح\n3. نسخ المفتاح بشكل صحيح من Google AI Studio",
    network: "تعذر الاتصال بخدمة Gemini. تحقق من الشبكة.",
  };
  return messages[type] || (error instanceof Error ? `خطأ: ${error.message}` : "تعذر إكمال الطلب.");
}

async function fetchWithRetry(url: string, options: RequestInit, retries = 2, delayMs = 3000): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const response = await fetch(url, {
      ...options,
      referrerPolicy: "no-referrer",
    });
    if (response.ok) return response;

    const errorPayload = (await response.json().catch(() => null)) as GeminiErrorPayload | null;

    if (response.status === 429 && attempt < retries && !isDailyQuotaExceeded(errorPayload)) {
      const retryDelayMs = getRetryDelayFromPayload(errorPayload);
      const waitMs = retryDelayMs ?? delayMs * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, Math.min(waitMs, 30000)));
      continue;
    }

    throw buildApiError(response.status, errorPayload);
  }
  throw new Error("Max retries exceeded");
}

export async function validateGeminiApiKey(key: string): Promise<{ ok: boolean; message: string }> {
  const trimmed = key.trim();
  if (!trimmed) return { ok: false, message: "أدخل مفتاح API أولاً." };

  try {
    const body = JSON.stringify({
      contents: [{ parts: [{ text: "Say OK" }] }],
      generationConfig: { temperature: 0, maxOutputTokens: 5 },
    });

    let response: Response | null = null;
    let payload: GeminiErrorPayload | null = null;
    for (const version of GEMINI_API_VERSIONS) {
      for (const model of GEMINI_MODELS) {
        const url = getGeminiUrl(model, version, trimmed);
        response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          referrerPolicy: "no-referrer",
          body,
        });
        if (response.ok) {
          return { ok: true, message: `✅ المفتاح صالح! (النموذج المستخدم: ${model})` };
        }

        payload = (await response.json().catch(() => null)) as GeminiErrorPayload | null;
        const msg = payload?.error?.message?.toLowerCase() || "";
        // Try next model/version when current one is unsupported.
        if (msg.includes("not found") || msg.includes("is not supported for generatecontent")) {
          continue;
        }
        break;
      }
      if (response?.ok) break;
    }

    const errMsg = payload?.error?.message || `خطأ ${response?.status ?? "غير معروف"}`;
    if (!response) return { ok: false, message: "❌ تعذر التحقق من المفتاح. حاول مرة أخرى." };

    if (response.status === 400 && errMsg.toLowerCase().includes("api key not valid")) {
      return { ok: false, message: "❌ المفتاح غير صالح. تأكد من نسخه بشكل صحيح من Google AI Studio." };
    }
    if (response.status === 403) {
      return { ok: false, message: "❌ المفتاح مقيّد. أزل قيود HTTP referrer من Google Cloud Console أو أنشئ مفتاحاً جديداً بدون قيود." };
    }
    if (response.status === 429) {
      return { ok: true, message: "⚠️ المفتاح صالح لكن الحصة مستنفدة حالياً. سيعمل بعد تجدد الحصة." };
    }

    return { ok: false, message: `❌ خطأ: ${errMsg}` };
  } catch (error) {
    if (error instanceof TypeError && error.message.includes("Failed to fetch")) {
      return { ok: false, message: "تعذر الاتصال بالإنترنت. تحقق من الشبكة." };
    }
    return { ok: false, message: getGeminiErrorUserMessage(error) };
  }
}

export async function generateWithGemini(prompt: string, temperature = 1.4, image?: { base64: string; mimeType: string }, useSearch = false): Promise<string> {
  const storedKeys = readStoredGeminiApiKeys();
  const envKey = (import.meta.env.VITE_GEMINI_API_KEY || "").trim();
  const apiKeysBase = storedKeys.length > 0 ? storedKeys : (envKey ? [envKey] : []);
  const apiKeys = buildRotatedKeyPool(apiKeysBase);
  if (apiKeys.length === 0) throw new Error("NO_API_KEY: No API key configured");

  const parts: any[] = [{ text: prompt }];
  if (image) {
    parts.push({
      inlineData: {
        data: image.base64.split(",").pop() || image.base64,
        mimeType: image.mimeType
      }
    });
  }

  const payloadBody: any = {
    contents: [{ parts }],
    generationConfig: { temperature, topP: temperature > 1 ? 0.99 : 0.95, maxOutputTokens: 8192 },
  };

  if (useSearch) {
    payloadBody.tools = [
      {
        googleSearchRetrieval: {
          dynamicRetrievalConfig: {
            mode: "MODE_DYNAMIC",
            dynamicThreshold: 0.3,
          },
        },
      },
    ];
  }

  const body = JSON.stringify(payloadBody);

  let lastError: unknown = new Error("Unknown Gemini error");
  let quotaLimitedKeys = 0;
  let authLimitedKeys = 0;

  for (let keyIndex = 0; keyIndex < apiKeys.length; keyIndex++) {
    const apiKey = apiKeys[keyIndex];
    let shouldMoveToNextKey = false;
    for (const version of GEMINI_API_VERSIONS) {
      if (shouldMoveToNextKey) break;
      for (const model of GEMINI_MODELS) {
        try {
          const response = await fetchWithRetry(getGeminiUrl(model, version, apiKey), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body,
          });
          const data = await response.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            // Move pointer to next key for round-robin distribution.
            const absoluteNext = (getLastGeminiKeyIndex() + keyIndex + 1) % Math.max(1, apiKeysBase.length);
            setLastGeminiKeyIndex(absoluteNext);
            return text;
          }
          lastError = new Error("EMPTY_GEMINI_RESPONSE: لم يتم الحصول على رد");
        } catch (error) {
          lastError = error;
          const msg = error instanceof Error ? error.message.toLowerCase() : "";
          
          if (msg.includes("api_error_400")) {
            // If the search tool caused a 400, we fall back to no search immediately
            if (useSearch) {
                console.warn("Search grounding caused 400, falling back to standard generation");
                return generateWithGemini(prompt, temperature, image, false);
            }
            continue; // Continue to next model on bad requests (e.g., model deprecation)
          }

          if (msg.includes("not found") || msg.includes("is not supported for generatecontent")) {
            continue;
          }
          if (
            msg.includes("gemini_quota_daily_exceeded") ||
            msg.includes("api_error_429") ||
            msg.includes("api_error_401") ||
            msg.includes("api_error_403") ||
            msg.includes("api key not valid")
          ) {
            if (msg.includes("gemini_quota_daily_exceeded")) quotaLimitedKeys++;
            if (
              msg.includes("api_error_401") ||
              msg.includes("api_error_403") ||
              msg.includes("api key not valid")
            ) authLimitedKeys++;
            shouldMoveToNextKey = true;
            break;
          }
          throw error;
        }
      }
    }
  }

  if (quotaLimitedKeys >= apiKeys.length) {
    throw new Error("GEMINI_ALL_KEYS_EXHAUSTED_DAILY: جميع مفاتيح Gemini المستعملة وصلت للحصة اليومية.");
  }
  if (authLimitedKeys >= apiKeys.length) {
    throw new Error("GEMINI_ALL_KEYS_AUTH_FAILED: جميع مفاتيح Gemini غير صالحة أو مقيّدة.");
  }

  throw lastError;
}

export interface VideoPromptResult {
  number: number;
  category: string;
  prompt: string;
}

/** STRICT category enforcement - prevents wrong topics (e.g. cooking → space) */
const CATEGORY_STRICT_RULES = `
CRITICAL - CATEGORY ADHERENCE (DO NOT VIOLATE):
- You MUST generate prompts ONLY and EXCLUSIVELY about the selected category: "{CATEGORY}"
- EVERY prompt's subject MUST be directly related to "{CATEGORY}" - nothing else
- If category is "Food" or "Cooking" → ONLY food, cooking, ingredients, kitchen, recipes
- If category is "Technology" → ONLY tech, computers, gadgets, software
- If category is "Nature" → ONLY nature, landscapes, wildlife, plants
- NEVER mix categories. NEVER generate space/astronomy for Food. NEVER generate food for Science.
- Double-check: each prompt must make the category obvious to a reader.
`;

export async function generateAIVideoPrompts(category: string, count: number): Promise<VideoPromptResult[]> {
  const seed = `${Date.now()}-${Math.random().toString(36).slice(2)}-${crypto.getRandomValues(new Uint32Array(1))[0]}`;
  const strictRules = CATEGORY_STRICT_RULES.replace(/\{CATEGORY\}/g, category);

  const prompt = `You are an expert Adobe Stock video prompt engineer. Generate EXACTLY ${count} video prompts.

${strictRules}

REQUIRED OUTPUT CATEGORY: "${category}" — ALL prompts MUST be about this topic only.

DIVERSITY SEED: ${seed}

${ADOBE_AI_PROMPT_RULES}

FORMULA: [Subject - MUST be from ${category}] + [Environment] + [Lighting] + [Camera Movement] + [Speed] + [Duration] + [Style] + [Commercial Appeal] + [Constraints]

TECHNICAL:
- 4K (3840x2160), 15-30 seconds, 24-30fps, sRGB
- Camera: slow smooth pan, static tripod, slow tracking, subtle slow dolly, slow aerial drift. NO chaotic motion.
- Each prompt MUST end with: ${ADOBE_VIDEO_NEGATIVE_SUFFIX}
- NO artist names, real people, fictional characters, copyrighted works, brands
- Each prompt: UNIQUE subject and environment within "${category}"

Return ONLY valid JSON array, no markdown: [{"number":1,"category":"${category}","prompt":"FULL PROMPT HERE"}]`;

  const result = await generateWithGemini(prompt, 0.85);
  const parsed = extractAndParseJSON<VideoPromptResult[]>(result, []);
  if (!parsed || parsed.length === 0) throw new Error("Failed to parse AI response");
  return parsed.map((p, i) => ({ 
    ...p, 
    number: i + 1, 
    category,
    prompt: sanitizePromptOrKeywords(p.prompt)
  }));
}

/** Gemini version of Claude's StockImagePrompt - full structure like Claude */
export interface GeminiStockPrompt {
  number: number;
  category: string;
  type: "image" | "video";
  demand: "low" | "medium";
  prompt: string;
  title?: string;
  keywords?: string[];
}

export async function generateGeminiStockPrompts(
  category: string,
  count: number,
  outputType: "image" | "video" | "both",
  trends: string[],
  competition: string,
  topicHint?: string,
  generationHistory?: string
): Promise<GeminiStockPrompt[]> {
  const seed = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const strictRules = CATEGORY_STRICT_RULES.replace(/\{CATEGORY\}/g, category);

  const typeReq = outputType === "image" ? "IMAGE prompts ONLY" :
    outputType === "video" ? "VIDEO prompts ONLY (camera movement, 10-30s)" :
    "MIX of image AND video, labeled";

  const compReq = competition === "low" ? "ultra-niche, low competition" :
    competition === "medium" ? "low-to-medium competition" :
    "avoid oversaturated generic topics";

  const trendsStr = trends.length > 0 ? `Trends to incorporate: ${trends.join(", ")}.` : "";
  const topicConstraint = topicHint?.trim()
    ? `USER TITLE/TOPIC TO FOLLOW STRICTLY: "${topicHint.trim()}". Every prompt must stay aligned with this title and category.`
    : "";

  const randomStyles = ["Cinematic", "Documentary", "Editorial", "Ultra-modern", "Moody/Dramatic", "Bright/Airy", "Cyberpunk/Neon", "Minimalist", "High-contrast", "Vintage/Retro"];
  const forcedStyle = randomStyles[Math.floor(Math.random() * randomStyles.length)];
  const forcedCamera = ["Drone/Aerial", "Macro/Close-up", "Wide-angle", "Eye-level tracking", "Low angle dynamic"][Math.floor(Math.random() * 5)];

  const prompt = `You are an expert Adobe Stock prompt engineer. Generate exactly ${count} prompts.

${strictRules}

REQUIRED CATEGORY: "${category}" — EVERY prompt MUST be about this topic ONLY.

UNIQUENESS SEED: ${seed} | MANDATORY STYLE INFLUENCE: "${forcedStyle}" | MANDATORY CAMERA INFLUENCE: "${forcedCamera}"
OUTPUT TYPE: ${typeReq}
COMPETITION: ${compReq}
${trendsStr}
${topicConstraint}
${generationHistory ? `\nCRITICAL MEMORY KNOWLEDGE:\n${generationHistory}\n` : ""}

CRITICAL DIVERSITY INSTRUCTION:
Even though you are strictly following the assigned topic, YOU MUST MAKE EVERY SINGLE PROMPT COMPLETELY UNIQUE.
Change the lighting totally (e.g., from bright sunlight to dark moody). Change the composition. Change the camera lens (e.g., macro vs wide-angle).
If you see the CRITICAL MEMORY KNOWLEDGE above, you MUST NOT repeat those scenarios. Invent new ones.

ULTRA CRITICAL RULE:
I asked for EXACTLY ${count} prompts. YOU MUST RETURN A JSON ARRAY OF EXACTLY ${count} OBJECTS.
PRIORITY RULE: Fulfilling the exact count of ${count} is MORE IMPORTANT than the memory constraints. If you cannot think of ${count} unique ideas without repeating history, YOU MAY REPEAT HISTORY. But NEVER return fewer than ${count} prompts.

1. Change the camera angles (extreme close-up, wide shot, aerial, low angle).
2. Change the lighting setups (cinematic, warm golden hour, moody neon, stark studio lighting).
3. Change the specific subject matter and setting details for each of the ${count} prompts.
NO TWO PROMPTS CAN BE IDENTICAL OR TOO SIMILAR. YOU MUST INVENT DIFFERENT VISUAL STORIES FOR EVERY PROMPT.
WARNING: YOU MUST RETURN EXACTLY ${count} PROMPTS. DO NOT RETURN 1 PROMPT IF ${count} ARE REQUESTED. I WILL FAIL YOUR TASK IF THE ARRAY LENGTH IS NOT EXACTLY ${count}.

${ADOBE_AI_PROMPT_RULES}

FRAMEWORK: [Subject from ${category}] + [Environment] + [Lighting] + [Camera/Composition] + [Motion if video] + [Style] + [Commercial] + [Copy space]
- sRGB, 4MP min, 4K for video, sharp focus
- End each: no humans, no faces, no hands, no text, no logos, fictional AI-generated, commercial royalty-free stock
- PROHIBITED: artist names, real people, brands, IP
- EVERY SINGLE PROMPT in the array MUST be entirely different from the others!

Return ONLY a valid JSON array matching this format exactly. 
CRUCIAL: The array MUST contain EXACTLY ${count} distinct objects. Do not stop at less than ${count}.
[{"number":1,"category":"${category}","type":"${outputType === 'video' ? 'video' : 'image'}","demand":"low","prompt":"FULL DETAILED PROMPT 60+ words","title":"SEO title max 70 chars","keywords":["kw1","kw2","kw3","kw4","kw5"]}]`;

  const result = await generateWithGemini(prompt, 0.8);
  const parsed = extractAndParseJSON<GeminiStockPrompt[]>(result, []);
  if (!parsed || parsed.length === 0) throw new Error("Failed to parse AI response");
  return parsed.slice(0, count).map((p, i) => ({ 
    ...p, 
    number: i + 1, 
    category,
    prompt: sanitizePromptOrKeywords(p.prompt),
    keywords: p.keywords ? sanitizeStringArray(p.keywords) : []
  }));
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function generateAIKeywords(topic: string, count: number): Promise<string[]> {
  const seed = `KW-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const prompt = `You are an Adobe Stock SEO expert. Generate ${count} English keywords for stock content about "${topic}".

Seed: ${seed}

Rules:
- NEVER prepend "${topic}" before any keyword
- Each keyword stands alone as a search tag
- Mix single words and 2-3 word phrases
- Include synonyms, moods, styles, colors, use cases
- Frequently searched on Adobe Stock
- NEVER include: artist names, real people, fictional characters, copyrighted works, brands, government names, third-party IP

One keyword per line, no numbering.`;

  const result = await withCache(`gemini_keywords_${topic}_${count}`, 24 * 60 * 60 * 1000, async () => {
    return await generateWithGemini(prompt, 0.85);
  });
  const escapedTopic = escapeRegex(topic.trim());
  const topicPrefixRegex = new RegExp(`^${escapedTopic}\\s*[:\\-–—|,]*\\s*`, "i");

  const keywords = Array.from(
    new Map(
      result.split("\n")
        .map((k) => k.replace(/^[\d\.\-\*\•]+\s*/, "").trim())
        .map((k) => k.replace(topicPrefixRegex, "").trim())
        .filter((k) => k.length > 1 && !new RegExp(`^${escapedTopic}$`, "i").test(k))
        .map((k) => [k.toLowerCase(), k] as [string, string])
    ).values()
  ).slice(0, count);
  return sanitizeStringArray(keywords);
}

/** اكتشاف أكثر الكلمات المفتاحية استعمالاً في مجال معيّن */
export async function getTopKeywordsForDomain(domain: string, limit = 50): Promise<string[]> {
  const prompt = `You are an Adobe Stock SEO expert. List the TOP ${limit} most-searched keywords in the domain "${domain}" on Adobe Stock.

RULES:
- Keywords that buyers actually search for when looking for "${domain}" content
- Mix: single words, 2-word phrases, 3-word phrases
- Include: styles, moods, use cases, colors, compositions relevant to "${domain}"
- Order by estimated search volume (most searched first)
- NEVER include: artist names, real people, brands, copyrighted works
- Each keyword on its own line, no numbering, no duplicates

Return ONLY the keywords, one per line.`;
  const result = await withCache(`gemini_topkw_${domain}_${limit}`, 24 * 60 * 60 * 1000, async () => {
    return await generateWithGemini(prompt, 0.7);
  });
  const escaped = escapeRegex(domain.trim());
  const prefixRegex = new RegExp(`^${escaped}\\s*[:\\-–—|,]*\\s*`, "i");
  const keywords = Array.from(
    new Map(
      result.split("\n")
        .map((k) => k.replace(/^[\d\.\-\*\•]+\s*/, "").trim())
        .map((k) => k.replace(prefixRegex, "").trim())
        .filter((k) => k.length > 1)
        .map((k) => [k.toLowerCase(), k] as [string, string])
    ).values()
  ).slice(0, limit);
  return sanitizeStringArray(keywords);
}

export async function analyzeStoreScreenshot(
  file: File,
  base64Data: string,
  extraNotes?: string
): Promise<string> {
  const notePrompt = extraNotes ? `\nملاحظات إضافية من المستخدم: ${extraNotes}` : "";
  const prompt = `أنت خبير Adobe Stock يساعد المساهمين في تحسين مبيعاتهم.
المستخدم قام برفع لقطة شاشة (Screenshot) لعمل مرفوض أو لمتجره أو لبطاقة تصميم منخفضة المبيعات.
حلل الصورة بدقة وأعطني رأيك الخبير.

${notePrompt}

قدم تحليلاً بالعربية يشمل:
1. أسباب محتملة للرفض أو لقلة المبيعات (بناءً على تقييمك البصري للعمل مقارنة بمعايير Adobe Stock).
2. ما إذا كان هناك أخطاء واضحة تمنع القبول (علامات تجارية، نصوص، أشخاص واقعيين منشئين بـ AI، تشوهات، إضاءة سيئة).
3. اقتراحات قوية للنسخ القادمة لتحقيق مبيعات أفضل.
4. كلمات مفتاحية مقترحة لهذا العمل.

اكتب بشكل واضح، احترافي ومنظم.`;

  return generateWithGemini(prompt, 0.4, {
    base64: base64Data,
    mimeType: file.type
  });
}

export interface ComplianceResult {
  score: number; // 0 to 100
  status: "safe" | "warning" | "danger";
  issues: string[];
}

/**
 * فحص امتثال العناوين والكلمات المفتاحية لمعايير Adobe Stock
 */
export function checkAdobeCompliance(title: string, keywords: string[]): ComplianceResult {
  const issues: string[] = [];
  let score = 100;

  // قائمة العلامات التجارية المشهورة التي تسبب الرفض المباشر
  const bannedTrademarks = [
    "apple", "iphone", "ipad", "macbook", "nike", "adidas", "coca-cola", "pepsi", 
    "google", "facebook", "instagram", "meta", "whatsapp", "twitter", "microsoft", 
    "windows", "android", "samsung", "sony", "playstation", "xbox", "nintendo", 
    "disney", "marvel", "star wars", "lego", "tesla", "spacex", "amazon", "netflix", 
    "youtube", "photoshop", "illustrator", "firefly", "midjourney"
  ];

  // كلمات غير مرغوبة أو تمنع القبول
  const genericBanned = [
    "high resolution", "exclusive", "masterpiece", "best quality", "4k", "8k", "uhd",
    "stunning", "amazing", "beautiful", "must see", "best", "top", "trending"
  ];

  const lowerTitle = title.toLowerCase();
  const lowerKeywords = keywords.map(k => k.toLowerCase());
  const combined = (lowerTitle + " " + lowerKeywords.join(" "));

  // 1. فحص العلامات التجارية (Danger)
  for (const tm of bannedTrademarks) {
    const regex = new RegExp(`\\b${tm}\\b`, "i");
    if (regex.test(combined)) {
      issues.push(`علامة تجارية محظورة: ${tm}`);
      score -= 40;
    }
  }

  // 2. فحص الكلمات "المزعجة" (Warning)
  for (const word of genericBanned) {
    if (combined.includes(word)) {
      issues.push(`كلمة وصفيّة غير مقبولة: ${word}`);
      score -= 15;
    }
  }

  // 3. فحص طول العنوان
  if (title.trim().length < 10) {
    issues.push("العنوان قصير جداً (يفضل أكثر من 10 حروف)");
    score -= 15;
  } else if (title.trim().length > 150) {
    issues.push("العنوان طويل جداً (Adobe يفضل أقل من 70-100 حرف للترتيب)");
    score -= 10;
  }

  // 4. فحص عدد الكلمات المفتاحية
  if (keywords.length < 5) {
    issues.push("عدد الكلمات قليل جداً (أقل من 5)");
    score -= 20;
  } else if (keywords.length > 50) {
    issues.push("تجاوزت الحد الأقصى (50 كلمة)");
    score -= 50;
  }

  // 5. فحص وجود "AI" في الحالات غير المطلوبة
  if (combined.includes("generative ai") && !combined.includes("ai-generated")) {
    // Adobe يفضل صيغة معينة للأعمال المولدة
  }

  // النتيجة النهائية
  score = Math.max(0, score);
  let status: "safe" | "warning" | "danger" = "safe";
  
  if (score < 60 || issues.some(i => i.includes("علامة تجارية"))) {
    status = "danger";
  } else if (score < 90 || issues.length > 0) {
    status = "warning";
  }

  return { score, status, issues };
}

export async function getAIMarketAnalysis(topic: string): Promise<string> {
  return withCache(`gemini_market_analysis_${topic}`, 12 * 60 * 60 * 1000, () => generateWithGemini(`You are an elite Adobe Stock market analyst. Using Google Search, retrieve the LIVE data and search trends for the topic "${topic}".
Provide a concise Arabic analysis covering:
1. Current LIVE demand based on web searches (give real numbers or estimates you found online today)
2. Live competition level on stock photography platforms
3. The most profitable sub-niches inside this topic right now
4. Tips to excel
5. Near future expectations based on current news

Write in Arabic, under 200 words. Keep it strictly focused on the real-time data you found.`, 0.7, undefined, true));
}

export async function generateAITrends(): Promise<Array<{
  topic: string;
  demand: "high" | "medium" | "low";
  competition: "high" | "medium" | "low";
  profitability: number;
  category: string;
  searches: number;
}>> {
  const seed = `TRENDS-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const prompt = `You are a Live Market Analyst for Adobe Stock. 
CRITICAL: SEARCH THE WEB NOW using the Google Search tool. Fetch the LIVE trending topics, news, and search volume spikes happening TODAY.

Seed for uniqueness: ${seed}

Look up top trending visual concepts, graphic search trends, or high-volume keywords on Google right now. Based on real LIVE data you just found, generate 15 CURRENT trending topics for stock content.

For each topic provide:
- topic: English name (short, 2-4 words)
- demand: "high", "medium", or "low"
- competition: "high", "medium", or "low"  
- profitability: number 50-100
- category: one of "AI", "Sustainability", "Work", "Wellness", "Diversity", "Design", "Nature", "Food", "Business", "Technology", "Science"
- searches: Write a realistic estimate of monthly searches based on your live web search data (e.g. 5000, 150000, 12500)

Focus strictly on the REAL data from today. Do not hallucinate.

Return ONLY a JSON array, no markdown.`;

  return withCache("gemini_live_trends", 6 * 60 * 60 * 1000, async () => {
    const result = await generateWithGemini(prompt, 0.7, undefined, true);
    const parsed = extractAndParseJSON<Array<{
      topic: string; demand: "high" | "medium" | "low";
      competition: "high" | "medium" | "low"; profitability: number;
      category: string; searches: number;
    }>>(result, []);
    if (!parsed || parsed.length === 0) throw new Error("Failed to parse trends");
    return parsed;
  });
}

export interface TopSellerAnalysis {
  secretSauce: string;
  hiddenKeywords: string[];
  smartEvolutions: {
    title: string;
    concept: string;
    prompt: string;
  }[];
}

export async function analyzeCompetitorSpyImage(
  file: File,
  base64Data: string,
  notes?: string
): Promise<TopSellerAnalysis> {
  const noteContext = notes ? `\nAdditional Notes from user: ${notes}` : "";
  const prompt = `You are an elite Adobe Stock competitor analyst. The user uploaded an image of a top-selling competitor asset or a screenshot of their portfolio.
Analyze this visual reference deeply:
${noteContext}

Your task:
1. "secretSauce": Explain in Arabic (2-3 sentences max) WHY this specific visual style sells so well (lighting, composition, theme).
2. "hiddenKeywords": Provide 15 highly optimized, low-competition English keywords the seller likely used or should use to rank #1.
3. "smartEvolutions": Steal the core visual concept shown in the image and evolve it into 3 UNIQUE, BETTER ideas (Blue Ocean strategy) to beat them. For each provide a short Arabic title, Arabic concept explanation, and a detailed English AI image generation prompt (following Adobe Stock guidelines: no real people, no brands, commercial style, 4k).

Return ONLY a valid JSON object EXACTLY matching this interface:
{
  "secretSauce": "...",
  "hiddenKeywords": ["kw1", "kw2", ...],
  "smartEvolutions": [
    { "title": "...", "concept": "...", "prompt": "..." }
  ]
}`;

  const result = await generateWithGemini(prompt, 0.85, {
    base64: base64Data,
    mimeType: file.type
  });
  
  const parsed = extractAndParseJSON<TopSellerAnalysis>(result, null as any);
  if (!parsed) throw new Error("Failed to parse AI response");
  if (parsed.smartEvolutions) {
    parsed.smartEvolutions = parsed.smartEvolutions.map(ev => ({
        ...ev,
        prompt: sanitizePromptOrKeywords(ev.prompt)
    }));
  }
  if (parsed.hiddenKeywords) {
    parsed.hiddenKeywords = sanitizeStringArray(parsed.hiddenKeywords);
  }
  return parsed;
}

export interface ImageAnalysisResult {
  filename: string;
  title: string;
  keywords: string[];
  prompt: string;        // The new AI generated text-to-image prompt
  colorPalette: string;  // The suggested trending colors
  compliance?: ComplianceResult; // النتيجة الخاصة بفحص الجودة والامتثال
}

export async function analyzeImageForStock(
  file: File,
  base64Data: string,
  isPanoramaCollage: boolean = false
): Promise<ImageAnalysisResult> {
  const isVideo = file.type.startsWith("video/") || isPanoramaCollage;
  const mediaType = isVideo 
    ? (isPanoramaCollage ? "VIDEO TIMELINE (3 FRAMES COLLAGE)" : "VIDEO FRAME") 
    : "IMAGE";
    
  const extraRules = isVideo 
    ? `This is a ${mediaType}. ${isPanoramaCollage ? "You are looking at 3 sequenced frames (Start, Middle, End) merged together. Analyze the MOTION, the progression of the scene, and how the subject behaves." : ""} 
    Include high-converting video-specific keywords (e.g., footage, motion, video, clip, animation, cinematography). AVOID static words like vector, illustration, painting.`
    : "This is a STILL IMAGE.";

  const prompt = `You are an elite Adobe Stock Vision Analyst and Prompt Engineer.
Analyze the provided ${mediaType} completely.
Note: The user might upload a SINGLE ${mediaType.toLowerCase()}, OR a SCREENSHOT containing MULTIPLE items.
If it is a grid, extract the DOMINANT, MOST PROFITABLE pattern/theme connecting them.

${extraRules}

YOUR TASK:
Generate a complete, ready-to-sell metadata and generation package.
1. Return EXACTLY 50 highly relevant, comma-separated keywords. The most important and descriptive 10 keywords MUST be at the very beginning of the list to comply with Adobe Stock's algorithm. Ensure NO trademarks, NO real people names, NO copyrighted works.
2. Return a short SEO optimized Title (max 70 characters).
3. Return a highly detailed Text-to-Image PROMPT (Midjourney/Firefly style) to recreate or enhance this concept.
4. Return a "colorPalette" suggesting trending colors to be used. These colors MUST be seamlessly integrated into the generated PROMPT.

MUST return a raw JSON object EXACTLY like this (NO Markdown, NO backticks):
{
  "title": "SEO Optimized Product Title",
  "keywords": ["kw1", "kw2", "kw3"],
  "prompt": "Highly detailed, professional prompt. No humans or real brands.",
  "colorPalette": "Trending Color Theme Name"
}`;

  const result = await generateWithGemini(prompt, 0.4, {
    base64: base64Data,
    mimeType: isVideo ? "image/jpeg" : file.type
  });
  
  const parsed = extractAndParseJSON<{ title: string; keywords: string[], prompt: string, colorPalette: string }>(result, { 
    title: "Untitled Stock Element", 
    keywords: ["stock", "illustration", "vector"],
    prompt: "A beautiful stock illustration concept, bright colors",
    colorPalette: "Vibrant"
  });

  if (!parsed.title && !parsed.keywords.length) throw new Error("Failed to parse Image Analysis AI response");
  
  // Clean keywords
  const cleanKeywords = sanitizeStringArray(parsed.keywords)
    .map(k => k.trim().toLowerCase())
    .slice(0, 49);

  return {
    filename: file.name,
    title: parsed.title,
    keywords: cleanKeywords,
    prompt: sanitizePromptOrKeywords(parsed.prompt),
    colorPalette: parsed.colorPalette,
  };
}
