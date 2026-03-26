import { ADOBE_AI_PROMPT_RULES, ADOBE_VIDEO_NEGATIVE_SUFFIX, ADOBE_IMAGE_NEGATIVE_SUFFIX } from "@/lib/adobeStockCompliance";
import { extractAndParseJSON, withCache, sanitizePromptOrKeywords, sanitizeStringArray } from "@/lib/sanitizer";
import { supabase, checkAuthStatus } from "./supabase";

const OPENAI_ENDPOINT = "https://api.openai.com/v1/chat/completions";
const OPENAI_MODEL = "gpt-4o-mini"; // Fast, cheap, and very smart option

const OPENAI_KEY_STORAGE = "openai_api_key";

export function setOpenAIApiKey(key: string) {
  try {
    if (key.trim()) localStorage.setItem(OPENAI_KEY_STORAGE, key.trim());
    else localStorage.removeItem(OPENAI_KEY_STORAGE);
  } catch {}
}

export function getOpenAIApiKey(): string {
  try {
    const stored = localStorage.getItem(OPENAI_KEY_STORAGE);
    if (stored) return stored;
    return (import.meta as any).env?.VITE_OPENAI_API_KEY || "";
  } catch {
    return "";
  }
}

export function hasOpenAIKey(): boolean {
  return Boolean(getOpenAIApiKey().trim());
}

async function callOpenAI(userPrompt: string, systemPrompt?: string, maxTokens = 4096): Promise<string> {
  const { isGuest, user } = await checkAuthStatus();

  // 1. App-level backend proxy for authenticated users (Secure)
  if (!isGuest && user) {
    try {
      const { data, error } = await supabase.functions.invoke("openai-proxy", {
        body: { userPrompt, systemPrompt, maxTokens },
      });
      if (error) throw error;
      return data.result;
    } catch (e) {
      console.warn("Edge Function proxy failed, falling back to local key if available:", e);
    }
  }

  // 2. Direct browser connection for guests
  const key = getOpenAIApiKey();
  if (!key) throw new Error("NO_OPENAI_KEY: Add your OpenAI API key in Settings");

  const messages: any[] = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  messages.push({ role: "user", content: userPrompt });

  const res = await fetch(OPENAI_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${key}`
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      max_tokens: maxTokens,
      temperature: 0.8,
      messages
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = err?.error?.message || `Error ${res.status}`;
    if (res.status === 401) throw new Error("AUTH_ERROR: Invalid OpenAI API key");
    if (res.status === 429) throw new Error("RATE_LIMIT: OpenAI rate limit exceeded/Quota exhausted");
    throw new Error(`API_ERROR: ${msg}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

export async function validateOpenAIApiKey(key: string): Promise<{ ok: boolean; message: string }> {
  if (!key.trim()) return { ok: false, message: "أدخل مفتاح API أولاً." };
  try {
    const res = await fetch(OPENAI_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key.trim()}`
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        max_tokens: 5,
        messages: [{ role: "user", content: "Hi" }],
      }),
    });
    if (res.ok) return { ok: true, message: "✅ مفتاح OpenAI API صالح!" };
    if (res.status === 401) return { ok: false, message: "❌ المفتاح غير صالح. تحقق منه في platform.openai.com" };
    if (res.status === 429) return { ok: true, message: "⚠️ المفتاح صالح لكن الحصة مستنفدة حالياً." };
    const err = await res.json().catch(() => ({}));
    return { ok: false, message: `❌ خطأ ${res.status}: ${err?.error?.message || "خطأ غير معروف"}` };
  } catch {
    return { ok: false, message: "تعذر الاتصال بخوادم OpenAI. تحقق من الشبكة." };
  }
}

export interface OpenAIStockPrompt {
  number: number;
  category: string;
  type: "image" | "video" | "green_screen";
  demand: "low" | "medium";
  prompt: string;
  title?: string;
  keywords?: string[];
}

export async function generateOpenAIStockPrompts(
  category: string,
  count: number,
  outputType: "image" | "video" | "both" | "greenscreen",
  trends: string[],
  competition: string,
  topicHint?: string,
  generationHistory?: string
): Promise<OpenAIStockPrompt[]> {
  const seed = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const typeMap: Record<string, string> = {
    image: "image prompts ONLY",
    video: "video prompts ONLY (include camera movement, motion speed, duration 10-30s)",
    both: "a mix of image AND video prompts, labeled clearly",
    greenscreen: "green screen video prompts where subject is isolated on pure green (#00B140) or black background",
  };

  const competitionMap: Record<string, string> = {
    low: "ultra-niche, under-served micro-topics with very low competition. BE EXTREMELY UNIQUE AND CREATIVE.",
    medium: "low-to-medium competition niches with emerging demand",
    "avoid-high": "avoid oversaturated generic topics (no generic sunsets, handshakes, laptops on desks)",
  };

  const trendsStr = trends.length > 0 ? `Incorporate 2026 trends where relevant: ${trends.join(", ")}.` : "";
  const topicConstraint = topicHint?.trim()
    ? `USER TITLE/TOPIC TO FOLLOW STRICTLY: "${topicHint.trim()}". Every prompt must stay aligned with this title/category.`
    : "";

  const randomStyles = ["Cinematic", "Documentary", "Editorial", "Ultra-modern", "Moody/Dramatic", "Bright/Airy", "Cyberpunk/Neon", "Minimalist", "High-contrast", "Vintage/Retro"];
  const forcedStyle = randomStyles[Math.floor(Math.random() * randomStyles.length)];
  const forcedCamera = ["Drone/Aerial", "Macro/Close-up", "Wide-angle", "Eye-level tracking", "Low angle dynamic"][Math.floor(Math.random() * 5)];

  const system = `You are an expert Adobe Stock prompt engineer and market analyst. You create commercially successful, sales-optimized stock content prompts. You MUST enforce full Adobe Stock Generative AI compliance in every prompt. Ensure high diversity and unique styles.`;

  const user = `Generate exactly ${count} Adobe Stock prompts for category: "${category}"

UNIQUENESS SEED: ${seed} | MANDATORY STYLE INFLUENCE: "${forcedStyle}" | MANDATORY CAMERA INFLUENCE: "${forcedCamera}"
OUTPUT TYPE: ${typeMap[outputType] || typeMap["image"]}
COMPETITION STRATEGY: Focus on ${competitionMap[competition] || competitionMap["medium"]}.
${topicConstraint}
${generationHistory ? `\nCRITICAL MEMORY KNOWLEDGE:\n${generationHistory}\n` : ""}

CRITICAL DIVERSITY INSTRUCTION:
Even though you are strictly following the assigned topic, YOU MUST MAKE EVERY SINGLE PROMPT COMPLETELY UNIQUE.
Change the lighting totally (e.g., from bright sunlight to dark moody). Change the composition. Change the camera lens.
If you see the CRITICAL MEMORY KNOWLEDGE above, you MUST NOT repeat those scenarios. Invent new ones.

ULTRA CRITICAL RULE:
I asked for EXACTLY ${count} prompts. YOU MUST RETURN A JSON ARRAY OF EXACTLY ${count} OBJECTS.
PRIORITY RULE: Fulfilling the exact count of ${count} is MORE IMPORTANT than the memory constraints. If you cannot think of ${count} unique ideas without repeating history, YOU MAY REPEAT HISTORY. But NEVER return fewer than ${count} prompts.
NO TWO PROMPTS CAN BE IDENTICAL OR TOO SIMILAR. YOU MUST INVENT DIFFERENT VISUAL STORIES FOR EVERY PROMPT.
WARNING: YOU MUST RETURN EXACTLY ${count} PROMPTS. DO NOT RETURN 1 PROMPT IF ${count} ARE REQUESTED. I WILL FAIL YOUR TASK IF THE ARRAY LENGTH IS NOT EXACTLY ${count}.

${ADOBE_AI_PROMPT_RULES}

VISUAL FRAMEWORK (every prompt must follow this structure):
[Subject] + [Environment] + [Lighting] + [Camera/Composition] + [Motion if video] + [Style] + [Commercial Use] + [Copy Space location]

TECHNICAL SPECS:
- sRGB, minimum 4MP
- Ultra realistic, sharp focus, clean composition
- Professional lighting (specify exact type)
- Smooth camera motion for video; duration 10–30s
- Specify copy space location
- Every prompt MUST end with: no humans, no faces, no hands, no fingers, no text, no logos, no watermarks, no trademarks, fictional AI-generated content only, commercial royalty-free stock

PROHIBITED IN PROMPT/KEYWORDS: artist names, real people, fictional characters, copyrighted works, brands, third-party IP.

${trendsStr}

DIVERSITY: Each prompt must have a completely unique subject, environment, and visual angle. No two prompts alike. Make it truly dynamic and market-driven.
EVERY SINGLE PROMPT in the array MUST be entirely different from the others!

Return ONLY a valid JSON array matching this format exactly.
CRUCIAL: The array MUST contain EXACTLY ${count} distinct objects. Do not stop at less than ${count}.
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

  const raw = await callOpenAI(user, system, 6000);
  const parsed = extractAndParseJSON<OpenAIStockPrompt[]>(raw, []);
  if (!parsed || parsed.length === 0) throw new Error("Could not parse OpenAI response as JSON array");
  
  // Normalize type
  return parsed.map((p, i) => ({
    ...p,
    number: i + 1,
    category,
    prompt: sanitizePromptOrKeywords(p.prompt),
    keywords: p.keywords ? sanitizeStringArray(p.keywords) : [],
    type: p.type === "green_screen" ? "green_screen" : (p.type === "video" ? "video" : "image")
  }));
}

export async function getOpenAIMarketAnalysis(topic: string): Promise<string> {
  return withCache(`openai_market_analysis_${topic}`, 12 * 60 * 60 * 1000, () => callOpenAI(
    `أنت محلل سوق Adobe Stock محترف. قدم تحليل مختصر لموضوع "${topic}" يشمل:
1. حالة الطلب الحالي في 2026
2. مستوى المنافسة وأبرز المنافسين
3. أفضل أنواع المحتوى (صور، فيديو، ناقل)
4. نصائح للتميز وزيادة المبيعات
5. توقعات مستقبلية للموضوع
اكتب بالعربية، موجز ومفيد، أقل من 200 كلمة.`,
    "You are a helpful AI market analyst for Adobe Stock.",
    1500
  ));
}
