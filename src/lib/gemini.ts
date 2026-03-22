import { ADOBE_AI_PROMPT_RULES, ADOBE_VIDEO_NEGATIVE_SUFFIX } from "@/lib/adobeStockCompliance";

const GEMINI_STORAGE_KEY = "gemini_api_key";
const GEMINI_MODELS = [
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

export async function generateWithGemini(prompt: string): Promise<string> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) throw new Error("NO_API_KEY: No API key configured");

  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 1.4, topP: 0.99, maxOutputTokens: 4096 },
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

export async function generateAIVideoPrompts(category: string, count: number): Promise<VideoPromptResult[]> {
  const seed = `${Date.now()}-${Math.random().toString(36).slice(2)}-${crypto.getRandomValues(new Uint32Array(1))[0]}`;

  const prompt = `You are an expert Adobe Stock video prompt engineer. Generate ${count} COMPLETELY UNIQUE prompts for "${category}".

DIVERSITY SEED (ensures unique output): ${seed}

${ADOBE_AI_PROMPT_RULES}

Formula: [Subject] + [Environment] + [Lighting] + [Camera Movement] + [Speed] + [Duration] + [Style] + [Commercial Appeal] + [Constraints]

Rules:
- 4K (3840x2160), 15-30 seconds, 24-30fps, sRGB
- Camera: slow pan, dolly zoom, static, aerial drone, timelapse, tracking, crane, orbit, whip pan, steadicam
- Each prompt MUST end with: ${ADOBE_VIDEO_NEGATIVE_SUFFIX}
- NO artist names, real people, fictional characters, copyrighted works, brands, IP in prompt/keywords
- Each prompt MUST have completely different subject and environment
- Be wildly creative and explore unexpected angles

Return ONLY a JSON array: [{"number":1,"category":"${category}","prompt":"..."}]`;

  const result = await generateWithGemini(prompt);
  const jsonMatch = result.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error("Failed to parse AI response");
  return JSON.parse(jsonMatch[0]);
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

  const result = await generateWithGemini(prompt);
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
