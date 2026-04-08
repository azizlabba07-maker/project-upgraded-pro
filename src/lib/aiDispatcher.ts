import { generateStockPrompts as generateClaudePrompts, getClaudeMarketAnalysis, hasClaudeKey } from "./claude";
import { generateOpenAIStockPrompts, getOpenAIMarketAnalysis, hasOpenAIKey } from "./openai";
import { generateGeminiStockPrompts, getAIMarketAnalysis as getGeminiMarketAnalysis, hasAnyApiKey as hasGeminiKey } from "./gemini";
import { trackAiMetric } from "./aiMetrics";
import { addToPromptHistory } from "./shared";
import { saveToPromptMemory } from "./promptMemory";
import Cache from "./Cache";

// Cache TTL for AI responses
const AI_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

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
  cached?: boolean;
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
  // 1. Check Cache
  const cacheKey = `ai_gen_${category}_${outputType}_${topicHint || "general"}_${count}`;
  const cachedResult = Cache.get<DispatchResult>(cacheKey);
  if (cachedResult) {
    console.log(`[AI Dispatcher] Serving cached prompts for: ${topicHint || category}`);
    return { ...cachedResult, cached: true };
  }

  const errors: string[] = [];

  // 2. Try Gemini
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
        
        const result: DispatchResult = { prompts: unified, engineUsed: "gemini" };
        Cache.set(cacheKey, result, AI_CACHE_TTL);
        return result;
      }
    } catch (e) {
      errors.push(`Gemini: ${e instanceof Error ? e.message : String(e)}`);
      trackAiMetric("gemini", "prompts", "failure");
    }
  }

  // 3. Try OpenAI
  if (hasOpenAIKey()) {
    try {
      const prompts = await generateOpenAIStockPrompts(category, count, outputType, trends, competition, topicHint, generationHistory);
      if (prompts && prompts.length > 0) {
        trackAiMetric("openai", "prompts", "success");
        const unified = prompts as UnifiedStockPrompt[];
        _saveGeneratedToHistory(unified, "openai", category);
        
        const result: DispatchResult = { prompts: unified, engineUsed: "openai" };
        Cache.set(cacheKey, result, AI_CACHE_TTL);
        return result;
      }
    } catch (e) {
      errors.push(`OpenAI: ${e instanceof Error ? e.message : String(e)}`);
      trackAiMetric("openai", "prompts", "failure");
    }
  }

  // 4. Try Claude
  if (hasClaudeKey()) {
    try {
      const prompts = await generateClaudePrompts(category, count, outputType, trends, competition, generationHistory);
      if (prompts && prompts.length > 0) {
        trackAiMetric("claude", "prompts", "success");
        const unified = prompts as UnifiedStockPrompt[];
        _saveGeneratedToHistory(unified, "claude", category);
        
        const result: DispatchResult = { prompts: unified, engineUsed: "claude" };
        Cache.set(cacheKey, result, AI_CACHE_TTL);
        return result;
      }
    } catch (e) {
      errors.push(`Claude: ${e instanceof Error ? e.message : String(e)}`);
      trackAiMetric("claude", "prompts", "failure");
    }
  }

  const allErrors = errors.join(" | ");
  throw new Error(allErrors ? `فشل المحركات: ${allErrors}` : "لا توجد مفاتيح API نشطة.");
}

export async function dispatchMarketAnalysis(topic: string): Promise<{ analysis: string, engineUsed: FallbackEngine, cached?: boolean }> {
  // 1. Check Cache
  const cacheKey = `ai_analysis_${topic}`;
  const cachedResult = Cache.get<{ analysis: string, engineUsed: FallbackEngine }>(cacheKey);
  if (cachedResult) {
    return { ...cachedResult, cached: true };
  }

  // 2. Try Gemini
  if (hasGeminiKey()) {
    try {
      const analysis = await getGeminiMarketAnalysis(topic);
      trackAiMetric("gemini", "analysis", "success");
      const result = { analysis, engineUsed: "gemini" as FallbackEngine };
      Cache.set(cacheKey, result, AI_CACHE_TTL);
      return result;
    } catch (e) {
      trackAiMetric("gemini", "analysis", "failure");
    }
  }

  // 3. Try OpenAI
  if (hasOpenAIKey()) {
    try {
      const analysis = await getOpenAIMarketAnalysis(topic);
      trackAiMetric("openai", "analysis", "success");
      const result = { analysis, engineUsed: "openai" as FallbackEngine };
      Cache.set(cacheKey, result, AI_CACHE_TTL);
      return result;
    } catch (e) {
      trackAiMetric("openai", "analysis", "failure");
    }
  }

  // 4. Try Claude
  if (hasClaudeKey()) {
    try {
      const analysis = await getClaudeMarketAnalysis(topic);
      trackAiMetric("claude", "analysis", "success");
      const result = { analysis, engineUsed: "claude" as FallbackEngine };
      Cache.set(cacheKey, result, AI_CACHE_TTL);
      return result;
    } catch (e) {
      trackAiMetric("claude", "analysis", "failure");
    }
  }

  throw new Error("فشل الوصول لمحركات AI للتحليل.");
}

function _saveGeneratedToHistory(prompts: UnifiedStockPrompt[], engine: FallbackEngine, category: string) {
  try {
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

    const subjects = prompts.map((p) => `Title: ${p.title} | Concept: ${p.prompt}`);
    saveToPromptMemory(category, subjects);
  } catch (e) {
    console.warn("Failed to save to history/memory:", e);
  }
}

