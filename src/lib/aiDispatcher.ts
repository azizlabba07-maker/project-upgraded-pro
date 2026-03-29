import { generateStockPrompts as generateClaudePrompts, getClaudeMarketAnalysis, hasClaudeKey } from "./claude";
import { generateOpenAIStockPrompts, getOpenAIMarketAnalysis, hasOpenAIKey } from "./openai";
import { generateGeminiStockPrompts, getAIMarketAnalysis as getGeminiMarketAnalysis, hasAnyApiKey as hasGeminiKey } from "./gemini";
import { trackAiMetric } from "./aiMetrics";
import { addToPromptHistory } from "./shared";
import { saveToPromptMemory } from "./promptMemory";

// Base interface that all generators conform to
export interface UnifiedStockPrompt {
  number: number;
  category: string;
  type: "image" | "video" | "green_screen";
  demand: "low" | "medium";
  prompt: string;
  title?: string;
  keywords?: string[];
}

export type FallbackEngine = "claude" | "openai" | "gemini" | "local";

export interface DispatchResult {
  prompts: UnifiedStockPrompt[];
  engineUsed: FallbackEngine;
  message?: string;
}

// ── LOCAL FALLBACK GENERATOR ──
// Generates decent prompts locally when ALL APIs fail
function generateLocalFallbackPrompts(
  category: string,
  count: number,
  outputType: "image" | "video" | "both" | "greenscreen",
  trends: string[],
  competition: string
): UnifiedStockPrompt[] {
  const subjects: Record<string, string[]> = {
    Technology: ["futuristic circuit board with glowing pathways", "holographic data visualization", "quantum computing chip", "AI neural network visualization", "robotic arm assembly"],
    Nature: ["crystal mountain stream over mossy rocks", "dense tropical canopy with mist", "rolling sand dunes in desert wind", "frozen waterfall with ice crystals", "bioluminescent ocean waves"],
    Food: ["artisan bread on dark slate", "tropical fruits macro cross-section", "sushi arrangement on minimalist plate", "espresso extraction macro detail", "honey dripping from wooden dipper"],
    Business: ["minimalist workspace with floating objects", "rising bar chart on glass floor", "golden compass strategic concept", "innovation lightbulb shattering", "global trade routes visualization"],
    Science: ["DNA helix rotating with glow", "chemical crystallization detail", "laboratory glassware reactions", "brain neural pathway visualization", "particle collision visualization"],
    Sustainability: ["solar panels reflecting clouds", "vertical garden on building", "EV charging station at sunset", "ocean cleanup device at sea", "wind turbines in golden light"],
    default: ["abstract fluid gradient composition", "geometric polygon mesh with light", "marble texture with gold veins", "digital particle flow system", "liquid chrome morphing surface"],
  };

  const environments = [
    "modern studio with soft diffused lighting",
    "dark cinematic environment with rim lighting",
    "bright minimalist background with natural light",
    "futuristic clean room with neon accents",
    "warm golden hour outdoor setting",
  ];

  const cameras = ["slow pan", "static wide angle", "macro close-up", "aerial drone perspective", "dynamic tracking shot"];
  const lightings = ["cinematic rim lighting", "soft diffused natural light", "dramatic chiaroscuro", "golden hour warm glow", "studio three-point lighting"];
  const styles = ["hyper-realistic 4K", "ultra-detailed commercial", "cinematic depth of field", "minimalist clean composition", "editorial magazine quality"];

  const catSubjects = subjects[category] || subjects.default;
  const trendsStr = trends.length > 0 ? `, incorporating ${trends.slice(0, 2).join(" and ")} aesthetics` : "";

  const results: UnifiedStockPrompt[] = [];
  for (let i = 0; i < count; i++) {
    const subject = catSubjects[i % catSubjects.length];
    const env = environments[i % environments.length];
    const cam = cameras[i % cameras.length];
    const light = lightings[i % lightings.length];
    const style = styles[i % styles.length];

    const isVideo = outputType === "video" || (outputType === "both" && i % 2 === 1);
    const isGreenScreen = outputType === "greenscreen";

    const type: "image" | "video" | "green_screen" = isGreenScreen ? "green_screen" : isVideo ? "video" : "image";

    let prompt = `${subject}, ${env}, ${light}, ${style}${trendsStr}`;
    if (isVideo) {
      prompt += `, ${cam}, smooth motion, 20 seconds duration, 4K 3840x2160, 24fps`;
    }
    if (isGreenScreen) {
      prompt += `, isolated on pure green background (#00B140), clean edges`;
    }
    prompt += `. Sharp focus, sRGB, copy space on right side. No humans, no faces, no hands, no text, no logos, no watermarks, fictional AI-generated, commercial royalty-free stock.`;

    results.push({
      number: i + 1,
      category,
      type,
      demand: competition === "low" ? "low" : "medium",
      prompt,
      title: `${category} ${subject.split(",")[0]} - Professional Stock ${type === "video" ? "Video" : "Image"}`.slice(0, 70),
      keywords: [
        category.toLowerCase(), "stock", "commercial", "professional", "4k",
        ...subject.split(" ").filter(w => w.length > 3).slice(0, 5),
      ],
    });
  }
  return results;
}


export async function dispatchPromptGeneration(
  category: string,
  count: number,
  outputType: "image" | "video" | "both" | "greenscreen",
  trends: string[],
  competition: string,
  topicHint?: string,
  generationHistory?: string
): Promise<DispatchResult> {
  const errors: string[] = [];

  // 1. Try Gemini (most reliable, free tier)
  if (hasGeminiKey()) {
    try {
      const geminiType = outputType === "greenscreen" ? "image" : outputType;
      const prompts = await generateGeminiStockPrompts(category, count, geminiType, trends, competition, topicHint, generationHistory);
      if (prompts && prompts.length > 0) {
        const unified = prompts.map(p => ({
          ...p,
          type: outputType === "greenscreen" ? "green_screen" : p.type as "image" | "video" | "green_screen"
        }));
        trackAiMetric("gemini", "prompts", "success");
        _saveGeneratedToHistory(unified, "gemini", category);
        return { prompts: unified, engineUsed: "gemini" };
      }
    } catch (e) {
      errors.push(`Gemini: ${e instanceof Error ? e.message : String(e)}`);
      trackAiMetric("gemini", "prompts", "failure");
      console.warn("Gemini failed, trying next engine...", e);
    }
  }

  // 2. Try OpenAI
  if (hasOpenAIKey()) {
    try {
      const prompts = await generateOpenAIStockPrompts(category, count, outputType, trends, competition, topicHint, generationHistory);
      if (prompts && prompts.length > 0) {
        trackAiMetric("openai", "prompts", "success");
        _saveGeneratedToHistory(prompts as UnifiedStockPrompt[], "openai", category);
        return { prompts: prompts as UnifiedStockPrompt[], engineUsed: "openai" };
      }
    } catch (e) {
      errors.push(`OpenAI: ${e instanceof Error ? e.message : String(e)}`);
      trackAiMetric("openai", "prompts", "failure");
      console.warn("OpenAI failed, trying next engine...", e);
    }
  }

  // 3. Try Claude
  if (hasClaudeKey()) {
    try {
      const prompts = await generateClaudePrompts(category, count, outputType, trends, competition, generationHistory);
      if (prompts && prompts.length > 0) {
        trackAiMetric("claude", "prompts", "success");
        _saveGeneratedToHistory(prompts as UnifiedStockPrompt[], "claude", category);
        return { prompts: prompts as UnifiedStockPrompt[], engineUsed: "claude" };
      }
    } catch (e) {
      errors.push(`Claude: ${e instanceof Error ? e.message : String(e)}`);
      trackAiMetric("claude", "prompts", "failure");
      console.warn("Claude failed, falling back to local...", e);
    }
  }

  // If we reach here, all attempted engines failed or no keys exist.
  const allErrors = errors.join(" | ");
  if (allErrors) {
     throw new Error(`تعذر التوليد لتوقف محركات الذكاء الاصطناعي: ${allErrors}`);
  } else {
     throw new Error("لا يوجد مفتاح API مقترن. يرجى إضافة مفتاح من الإعدادات.");
  }
}

export async function dispatchMarketAnalysis(topic: string): Promise<{ analysis: string, engineUsed: FallbackEngine }> {
  // 1. Try Gemini (with search grounding)
  if (hasGeminiKey()) {
    try {
      const analysis = await getGeminiMarketAnalysis(topic);
      trackAiMetric("gemini", "analysis", "success");
      return { analysis, engineUsed: "gemini" };
    } catch (e) {
      trackAiMetric("gemini", "analysis", "failure");
      console.warn("Gemini analysis failed, falling back...", e);
    }
  }

  // 2. Try OpenAI
  if (hasOpenAIKey()) {
    try {
      const analysis = await getOpenAIMarketAnalysis(topic);
      trackAiMetric("openai", "analysis", "success");
      return { analysis, engineUsed: "openai" };
    } catch (e) {
      trackAiMetric("openai", "analysis", "failure");
      console.warn("OpenAI analysis failed, falling back...", e);
    }
  }

  // 3. Try Claude
  if (hasClaudeKey()) {
    try {
      const analysis = await getClaudeMarketAnalysis(topic);
      trackAiMetric("claude", "analysis", "success");
      return { analysis, engineUsed: "claude" };
    } catch (e) {
      trackAiMetric("claude", "analysis", "failure");
      console.warn("Claude analysis failed...", e);
    }
  }

  // If we reach here, it failed
  throw new Error("لم يتمكن النظام من الوصول لمحركات AI للتحليل المستند للإنترنت. تأكد من صحة وفعالية مفاتيح الـ API الخاصة بك.");
}

// ── Internal: save generated results to History + Memory ──
function _saveGeneratedToHistory(prompts: UnifiedStockPrompt[], engine: FallbackEngine, category: string) {
  try {
    // Save to Prompt History
    addToPromptHistory(
      prompts.map((p) => ({
        prompt: p.prompt,
        title: p.title,
        keywords: p.keywords,
        category: p.category || category,
        type: p.type || "image",
        engine: engine,
      }))
    );

    // Save to Prompt Memory (for evolution/diversity)
    // Save the FULL prompt context instead of just 60 chars.
    const subjects = prompts.map((p) => `Title: ${p.title} | Concept: ${p.prompt}`);
    saveToPromptMemory(category, subjects);
  } catch (e) {
    console.warn("Failed to save to history/memory:", e);
  }
}
