// Claude API integration for Adobe Stock AI Partner
// Powers: Image prompt generation, SEO titles, descriptions, keyword expansion

import { ADOBE_AI_PROMPT_RULES } from "@/lib/adobeStockCompliance";

const CLAUDE_ENDPOINT = "https://api.anthropic.com/v1/messages";
const CLAUDE_MODEL = "claude-sonnet-4-20250514";

const CLAUDE_KEY_STORAGE = "claude_api_key";
const CLAUDE_PROXY_URL = (import.meta as any).env?.VITE_CLAUDE_PROXY_URL as string | undefined;
const CLAUDE_PROXY_TOKEN = (import.meta as any).env?.VITE_CLAUDE_PROXY_TOKEN as string | undefined;

export function isClaudeProxyEnabled(): boolean {
  return Boolean(CLAUDE_PROXY_URL?.trim());
}

export function setClaudeApiKey(key: string) {
  try {
    if (key.trim()) localStorage.setItem(CLAUDE_KEY_STORAGE, key.trim());
    else localStorage.removeItem(CLAUDE_KEY_STORAGE);
  } catch {}
}

export function getClaudeApiKey(): string {
  try {
    const stored = localStorage.getItem(CLAUDE_KEY_STORAGE);
    if (stored) return stored;
    const env = (import.meta as any).env?.VITE_CLAUDE_API_KEY;
    return env || "";
  } catch {
    return "";
  }
}

export function hasClaudeKey(): boolean {
  // In proxy mode, frontend key is not required.
  if (isClaudeProxyEnabled()) return true;
  return Boolean(getClaudeApiKey().trim());
}

async function callClaude(userPrompt: string, systemPrompt?: string, maxTokens = 4096): Promise<string> {
  // Prefer proxy mode for production: avoids exposing key in browser and bypasses CORS issues.
  if (CLAUDE_PROXY_URL?.trim()) {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (CLAUDE_PROXY_TOKEN?.trim()) {
      headers.Authorization = `Bearer ${CLAUDE_PROXY_TOKEN.trim()}`;
    }

    const proxyRes = await fetch(CLAUDE_PROXY_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({ userPrompt, systemPrompt, maxTokens }),
    });

    if (!proxyRes.ok) {
      const err = await proxyRes.json().catch(() => ({}));
      const msg = err?.error || err?.message || `Proxy error ${proxyRes.status}`;
      if (proxyRes.status === 401 || proxyRes.status === 403) {
        throw new Error("AUTH_ERROR: Proxy authorization failed");
      }
      if (proxyRes.status === 429) {
        throw new Error("RATE_LIMIT: Proxy/Claude rate limit");
      }
      throw new Error(`API_ERROR: ${msg}`);
    }

    const data = await proxyRes.json().catch(() => ({}));
    const text = data?.text || data?.content?.[0]?.text;
    if (!text) throw new Error("API_ERROR: Empty proxy response");
    return text;
  }

  const key = getClaudeApiKey();
  if (!key) throw new Error("NO_CLAUDE_KEY: Add your Claude API key in Settings");

  const body: any = {
    model: CLAUDE_MODEL,
    max_tokens: maxTokens,
    messages: [{ role: "user", content: userPrompt }],
  };
  if (systemPrompt) body.system = systemPrompt;

  const res = await fetch(CLAUDE_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = err?.error?.message || `Error ${res.status}`;
    if (res.status === 401) throw new Error("AUTH_ERROR: Invalid Claude API key");
    if (res.status === 429) throw new Error("RATE_LIMIT: Too many requests. Wait a moment.");
    throw new Error(`API_ERROR: ${msg}`);
  }

  const data = await res.json();
  return data.content?.[0]?.text || "";
}

export function classifyClaudeError(error: unknown): "no_key" | "auth" | "rate_limit" | "unknown" {
  const msg = error instanceof Error ? error.message.toLowerCase() : "";
  if (msg.includes("no_claude_key")) return "no_key";
  if (msg.includes("auth_error") || msg.includes("401")) return "auth";
  if (msg.includes("rate_limit") || msg.includes("429")) return "rate_limit";
  return "unknown";
}

export function getClaudeErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message.toLowerCase() : "";
  const type = classifyClaudeError(error);
  const map: Record<string, string> = {
    no_key: "أضف مفتاح Claude API من تبويب الإعدادات ⚙️",
    auth: "مفتاح Claude API غير صالح. تأكد من نسخه بشكل صحيح.",
    rate_limit: "تم تجاوز حد الطلبات. انتظر ثوانٍ ثم أعد المحاولة.",
  };
  if (raw.includes("failed to fetch") || raw.includes("networkerror")) {
    return "تعذر الاتصال بـ Claude من المتصفح. غالباً السبب CORS/حجب مزوّد الخدمة. الحل الموثوق: استدعاء Claude عبر Backend/Proxy (Supabase Edge Function أو خادم Node) بدلاً من المتصفح مباشرة.";
  }
  return map[type] || (error instanceof Error ? `خطأ: ${error.message}` : "تعذر إكمال الطلب");
}

export interface StockImagePrompt {
  number: number;
  category: string;
  type: "image" | "video" | "green_screen";
  demand: "low" | "medium";
  prompt: string;
  title?: string;
  keywords?: string[];
}

export async function generateStockPrompts(
  category: string,
  count: number,
  outputType: "image" | "video" | "both" | "greenscreen",
  trends: string[],
  competition: string
): Promise<StockImagePrompt[]> {
  const seed = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const typeMap: Record<string, string> = {
    image: "image prompts ONLY",
    video: "video prompts ONLY (include camera movement, motion speed, duration 10-30s)",
    both: "a mix of image AND video prompts, labeled clearly",
    greenscreen: "green screen video prompts where subject is isolated on pure green (#00B140) or black background",
  };

  const competitionMap: Record<string, string> = {
    low: "ultra-niche, under-served micro-topics with very low competition",
    medium: "low-to-medium competition niches with emerging demand",
    "avoid-high": "avoid oversaturated generic topics (no generic sunsets, handshakes, laptops on desks)",
  };

  const trendsStr = trends.length > 0 ? `Incorporate 2026 trends where relevant: ${trends.join(", ")}.` : "";

  const system = `You are an expert Adobe Stock prompt engineer and market analyst. You create commercially successful, sales-optimized stock content prompts with deep knowledge of what sells on Adobe Stock in 2026. You MUST enforce full Adobe Stock Generative AI compliance in every prompt.`;

  const user = `Generate exactly ${count} Adobe Stock prompts for category: "${category}"

UNIQUENESS SEED: ${seed}

OUTPUT TYPE: ${typeMap[outputType]}

COMPETITION STRATEGY: Focus on ${competitionMap[competition]}.

CRITICAL DIVERSITY INSTRUCTION:
Even though you are strictly following the assigned topic, YOU MUST MAKE EVERY SINGLE PROMPT COMPLETELY UNIQUE.
1. Change the camera angles (extreme close-up, wide shot, aerial, low angle).
2. Change the lighting setups (cinematic, warm golden hour, moody neon, stark studio lighting).
3. Change the specific subject matter and setting details for each of the ${count} prompts.
NO TWO PROMPTS CAN BE IDENTICAL OR TOO SIMILAR. YOU MUST INVENT DIFFERENT VISUAL STORIES FOR EVERY PROMPT.

${ADOBE_AI_PROMPT_RULES}

VISUAL FRAMEWORK (every prompt must follow this structure):
[Subject] + [Environment] + [Lighting] + [Camera/Composition] + [Motion if video] + [Style] + [Commercial Use] + [Copy Space location]

TECHNICAL SPECS:
- sRGB, minimum 4MP (e.g. 4000×4000 or 3840×2160 for 4K)
- Ultra realistic, 4K or 8K quality, sharp focus, clean composition
- Professional lighting (specify exact type)
- Smooth camera motion for video; duration 10–30s with specific movement
- Specify copy space location (top-left, right side, bottom, etc.)
- Every prompt MUST end with: no humans, no faces, no hands, no fingers, no text, no logos, no watermarks, no trademarks, fictional AI-generated content only, commercial royalty-free stock

PROHIBITED IN PROMPT/KEYWORDS: artist names, real people, fictional characters, copyrighted works, brands, government names, third-party IP.

${trendsStr}

DIVERSITY: Each prompt must have a completely unique subject, environment, and visual angle. No two prompts alike.

Return ONLY a valid JSON array, no markdown, no explanation:
CRUCIAL: The array MUST contain EXACTLY ${count} distinct objects. Do not stop at 1.
[
  {
    "number": 1,
    "category": "${category}",
    "type": "${outputType === 'video' ? 'video' : 'image'}",
    "demand": "low",
    "prompt": "FULL DETAILED PROMPT. Include all structural elements. Minimum 60 words.",
    "title": "Short SEO title for Adobe Stock (max 70 chars)",
    "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"]
  }
]`;

  const raw = await callClaude(user, system, 8000);
  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) throw new Error("Could not parse response as JSON array");
  return JSON.parse(match[0]) as StockImagePrompt[];
}

export async function generateSEOBundle(promptText: string): Promise<{
  title: string;
  description: string;
  keywords: string[];
}> {
  const system = `You are an Adobe Stock SEO expert who writes metadata that maximizes search visibility and sales. You MUST follow Adobe Stock rules: never include artist names, real people, fictional characters, copyrighted works, brands, or third-party IP in title, description, or keywords.`;
  const user = `For this Adobe Stock image prompt, generate optimized SEO metadata:

PROMPT: "${promptText}"

ADOBE RULES: No artist names, no real people, no fictional characters, no copyrighted works, no brands, no government names, no third-party IP in any field.

Return ONLY valid JSON:
{
  "title": "SEO-optimized title (max 70 chars, no quotes, describes the image concisely)",
  "description": "SEO description (max 200 chars, descriptive, keyword-rich)",
  "keywords": ["keyword1", "keyword2", ...(30-49 highly relevant Adobe Stock keywords, 1-3 word phrases, no duplicates, no IP/artist/people refs)]
}`;

  const raw = await callClaude(user, system, 2000);
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Could not parse SEO bundle");
  return JSON.parse(match[0]);
}

export async function generateClaudeKeywords(topic: string, count: number): Promise<string[]> {
  const system = `You are an Adobe Stock SEO expert. NEVER include artist names, real people, fictional characters, copyrighted works, brands, or third-party IP in keywords.`;
  const user = `Generate ${count} English keywords for Adobe Stock content about: "${topic}"

Rules:
- Never prepend "${topic}" before any keyword
- Each keyword stands alone as a search tag
- Mix single words and 2-3 word phrases
- Include synonyms, moods, styles, colors, use cases, settings
- Focus on what buyers actually search for on Adobe Stock
- NEVER include: artist names, real people, fictional characters, copyrighted works, brands, government names, third-party IP

Return ONLY a JSON array of keyword strings: ["keyword1", "keyword2", ...]`;

  const raw = await callClaude(user, system, 1500);
  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) return [];
  const arr = JSON.parse(match[0]);
  return Array.isArray(arr) ? arr.slice(0, count) : [];
}

export async function getClaudeMarketAnalysis(topic: string): Promise<string> {
  return callClaude(
    `أنت محلل سوق Adobe Stock محترف. قدم تحليل مختصر لموضوع "${topic}" يشمل:
1. حالة الطلب الحالي في 2026
2. مستوى المنافسة وأبرز المنافسين
3. أفضل أنواع المحتوى (صور، فيديو، ناقل)
4. نصائح للتميز وزيادة المبيعات
5. توقعات مستقبلية للموضوع
اكتب بالعربية، موجز ومفيد، أقل من 200 كلمة.`,
    undefined,
    1000
  );
}

export async function validateClaudeKey(key: string): Promise<{ ok: boolean; message: string }> {
  if (!key.trim()) return { ok: false, message: "أدخل مفتاح API أولاً." };
  if (CLAUDE_PROXY_URL?.trim()) {
    return { ok: true, message: "✅ Proxy mode مفعّل. التحقق المحلي من المفتاح غير مطلوب داخل المتصفح." };
  }
  try {
    const res = await fetch(CLAUDE_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key.trim(),
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 5,
        messages: [{ role: "user", content: "Hi" }],
      }),
    });
    if (res.ok) return { ok: true, message: "✅ مفتاح Claude API صالح!" };
    const err = await res.json().catch(() => ({}));
    if (res.status === 401) return { ok: false, message: "❌ المفتاح غير صالح. تحقق منه في console.anthropic.com" };
    if (res.status === 429) return { ok: true, message: "⚠️ المفتاح صالح لكن الحصة مستنفدة حالياً." };
    return { ok: false, message: `❌ خطأ ${res.status}: ${err?.error?.message || "خطأ غير معروف"}` };
  } catch {
    return { ok: false, message: "تعذر الاتصال. تحقق من الشبكة." };
  }
}
