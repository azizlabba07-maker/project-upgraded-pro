import { ADOBE_AI_PROMPT_RULES, ADOBE_VIDEO_NEGATIVE_SUFFIX } from "@/lib/adobeStockCompliance";

const GEMINI_STORAGE_KEY = "gemini_api_key";
const GEMINI_MODELS = [
  "gemini-2.5-flash-lite", // أعلى حصة مجانية: 1000 طلب/يوم
  "gemini-2.0-flash",
  "gemini-1.5-flash-latest",
  "gemini-1.5-flash",
];
const GEMINI_API_VERSIONS = ["v1", "v1beta"];

function readStoredGeminiApiKey(): string {
  try {
    return localStorage.getItem(GEMINI_STORAGE_KEY) || "";
  } catch {
    return "";
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

export function setUserGeminiApiKey(key: string) {
  try {
    if (key.trim()) {
      localStorage.setItem(GEMINI_STORAGE_KEY, key.trim());
    } else {
      localStorage.removeItem(GEMINI_STORAGE_KEY);
    }
  } catch {}
}

export function getUserGeminiApiKey(): string {
  return readStoredGeminiApiKey();
}

export function hasAnyApiKey(): boolean {
  return Boolean(getGeminiApiKey().trim());
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
    quota: "تم استهلاك الحصة اليومية. انتظر 24 ساعة أو أضف مفتاح API جديد من الإعدادات.",
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

export async function generateWithGemini(prompt: string, temperature = 1.4): Promise<string> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) throw new Error("NO_API_KEY: No API key configured");

  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature, topP: temperature > 1 ? 0.99 : 0.95, maxOutputTokens: 8192 },
  });

  let lastError: unknown = new Error("Unknown Gemini error");

  for (const version of GEMINI_API_VERSIONS) {
    for (const model of GEMINI_MODELS) {
      try {
        const response = await fetchWithRetry(getGeminiUrl(model, version, apiKey), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        });
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text;
        lastError = new Error("EMPTY_GEMINI_RESPONSE: لم يتم الحصول على رد");
      } catch (error) {
        lastError = error;
        const msg = error instanceof Error ? error.message.toLowerCase() : "";
        // Keep trying model/version only for unsupported model/version errors.
        if (msg.includes("not found") || msg.includes("is not supported for generatecontent")) {
          continue;
        }
        throw error;
      }
    }
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
- Camera: slow pan, dolly zoom, static, aerial drone, timelapse, tracking, crane, orbit, steadicam
- Each prompt MUST end with: ${ADOBE_VIDEO_NEGATIVE_SUFFIX}
- NO artist names, real people, fictional characters, copyrighted works, brands
- Each prompt: UNIQUE subject and environment within "${category}"

Return ONLY valid JSON array, no markdown: [{"number":1,"category":"${category}","prompt":"FULL PROMPT HERE"}]`;

  const result = await generateWithGemini(prompt, 0.85);
  const jsonMatch = result.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error("Failed to parse AI response");
  const parsed = JSON.parse(jsonMatch[0]) as VideoPromptResult[];
  return parsed.map((p, i) => ({ ...p, number: i + 1, category }));
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
  topicHint?: string
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

  const prompt = `You are an expert Adobe Stock prompt engineer. Generate exactly ${count} prompts.

${strictRules}

REQUIRED CATEGORY: "${category}" — EVERY prompt MUST be about this topic ONLY.

UNIQUENESS SEED: ${seed}
OUTPUT TYPE: ${typeReq}
COMPETITION: ${compReq}
${trendsStr}
${topicConstraint}

${ADOBE_AI_PROMPT_RULES}

FRAMEWORK: [Subject from ${category}] + [Environment] + [Lighting] + [Camera/Composition] + [Motion if video] + [Style] + [Commercial] + [Copy space]
- sRGB, 4MP min, 4K for video, sharp focus
- End each: no humans, no faces, no hands, no text, no logos, fictional AI-generated, commercial royalty-free stock
- PROHIBITED: artist names, real people, brands, IP

Return ONLY valid JSON array:
[{"number":1,"category":"${category}","type":"image","demand":"low","prompt":"FULL DETAILED PROMPT 60+ words","title":"SEO title max 70 chars","keywords":["kw1","kw2","kw3","kw4","kw5"]}]`;

  const result = await generateWithGemini(prompt, 0.8);
  const jsonMatch = result.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error("Failed to parse AI response");
  const parsed = JSON.parse(jsonMatch[0]) as GeminiStockPrompt[];
  return parsed.slice(0, count).map((p, i) => ({ ...p, number: i + 1, category }));
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

  const result = await generateWithGemini(prompt, 0.85);
  const escapedTopic = escapeRegex(topic.trim());
  const topicPrefixRegex = new RegExp(`^${escapedTopic}\\s*[:\\-–—|,]*\\s*`, "i");

  return Array.from(
    new Map(
      result.split("\n")
        .map((k) => k.replace(/^[\d\.\-\*\•]+\s*/, "").trim())
        .map((k) => k.replace(topicPrefixRegex, "").trim())
        .filter((k) => k.length > 1 && !new RegExp(`^${escapedTopic}$`, "i").test(k))
        .map((k) => [k.toLowerCase(), k] as [string, string])
    ).values()
  ).slice(0, count);
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
  const result = await generateWithGemini(prompt, 0.7);
  const escaped = escapeRegex(domain.trim());
  const prefixRegex = new RegExp(`^${escaped}\\s*[:\\-–—|,]*\\s*`, "i");
  return Array.from(
    new Map(
      result.split("\n")
        .map((k) => k.replace(/^[\d\.\-\*\•]+\s*/, "").trim())
        .map((k) => k.replace(prefixRegex, "").trim())
        .filter((k) => k.length > 1)
        .map((k) => [k.toLowerCase(), k] as [string, string])
    ).values()
  ).slice(0, limit);
}

/** تحليل المحتوى المرفوض أو منخفض المبيعات - اقتراح تحسينات */
export async function analyzeRejectionOrLowSales(
  title: string,
  description: string,
  keywords: string[],
  rejectionReason?: string
): Promise<string> {
  const kwStr = keywords?.join(", ") || "(لا توجد)";
  const rejectNote = rejectionReason ? `سبب الرفض المذكور: ${rejectionReason}.` : "المحتوى مرفوض أو مبيعاته منخفضة.";
  return generateWithGemini(`أنت خبير Adobe Stock يساعد المساهمين في تحسين محتواهم.

المساهم يريد تحليل المحتوى التالي:
- Title: ${title}
- Description: ${description}
- Keywords: ${kwStr}

${rejectNote}

قدم تحليلاً بالعربية يشمل:
1. أسباب محتملة للرفض أو قلة المبيعات
2. كلمات مفتاحية قد تكون مشكلة (علامات تجارية، أشخاص، حقوق ملكية)
3. اقتراحات لتحسين العنوان والوصف
4. كلمات مفتاحية بديلة مقترحة (25-49 كلمة مناسبة لـ Adobe Stock)
5. نصائح لزيادة فرص القبول والمبيعات

اكتب بشكل واضح ومنظم، أقل من 400 كلمة.`, 0.75);
}

export async function getAIMarketAnalysis(topic: string): Promise<string> {
  return generateWithGemini(`أنت محلل سوق Adobe Stock محترف. قدم تحليل مختصر لموضوع "${topic}" يشمل:
1. حالة الطلب الحالي
2. مستوى المنافسة
3. أفضل أنواع المحتوى
4. نصائح للتميز
5. توقعات مستقبلية
اكتب بالعربية، أقل من 200 كلمة.`);
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

  const prompt = `You are an Adobe Stock market analyst. Generate 15 CURRENT trending topics for stock content in 2025-2026.

Seed for uniqueness: ${seed}

For each topic provide:
- topic: English name (short, 2-4 words)
- demand: "high", "medium", or "low"
- competition: "high", "medium", or "low"  
- profitability: number 50-100
- category: one of "AI", "Sustainability", "Work", "Wellness", "Diversity", "Design", "Nature", "Food", "Business", "Technology", "Science"
- searches: estimated monthly searches 3000-15000

Focus on REAL current trends: AI, sustainability, remote work, health, emerging tech, etc.

Return ONLY a JSON array, no markdown.`;

  const result = await generateWithGemini(prompt);
  const jsonMatch = result.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error("Failed to parse trends");
  return JSON.parse(jsonMatch[0]);
}
