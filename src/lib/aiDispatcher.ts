import { generateStockPrompts as generateClaudePrompts, getClaudeMarketAnalysis, hasClaudeKey } from "./claude";
import { generateOpenAIStockPrompts, getOpenAIMarketAnalysis, hasOpenAIKey } from "./openai";
import { generateGeminiStockPrompts, getAIMarketAnalysis as getGeminiMarketAnalysis, hasAnyApiKey as hasGeminiKey } from "./gemini";

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

  // 1. Try Claude
  if (hasClaudeKey()) {
    try {
      const prompts = await generateClaudePrompts(category, count, outputType, trends, competition, generationHistory);
      if (prompts && prompts.length > 0) {
        return { prompts: prompts as UnifiedStockPrompt[], engineUsed: "claude" };
      }
    } catch (e) {
      errors.push(`Claude: ${e instanceof Error ? e.message : String(e)}`);
      console.warn("Claude failed, falling back to OpenAI/Gemini...", e);
    }
  }

  // 2. Try OpenAI
  if (hasOpenAIKey()) {
    try {
      const prompts = await generateOpenAIStockPrompts(category, count, outputType, trends, competition, topicHint, generationHistory);
      if (prompts && prompts.length > 0) {
        return { prompts: prompts as UnifiedStockPrompt[], engineUsed: "openai" };
      }
    } catch (e) {
      errors.push(`OpenAI: ${e instanceof Error ? e.message : String(e)}`);
      console.warn("OpenAI failed, falling back to Gemini...", e);
    }
  }

  // 3. Try Gemini
  if (hasGeminiKey()) {
    try {
      // Gemini expects 'both' instead of 'greenscreen' in its strict type, but let's cast if needed.
      const geminiType = outputType === "greenscreen" ? "image" : outputType;
      const prompts = await generateGeminiStockPrompts(category, count, geminiType, trends, competition, topicHint, generationHistory);
      if (prompts && prompts.length > 0) {
        // Map types back
        const unified = prompts.map(p => ({
          ...p,
          type: outputType === "greenscreen" ? "green_screen" : p.type as "image" | "video" | "green_screen"
        }));
        return { prompts: unified, engineUsed: "gemini" };
      }
    } catch (e) {
      errors.push(`Gemini: ${e instanceof Error ? e.message : String(e)}`);
      console.warn("Gemini failed, falling back to local...", e);
    }
  }

  // 4. Fallback required
  throw new Error(`All AI engines failed or no keys configured.\nErrors:\n${errors.join('\n')}`);
}

export async function dispatchMarketAnalysis(topic: string): Promise<{ analysis: string, engineUsed: FallbackEngine }> {
  // 1. Try Claude
  if (hasClaudeKey()) {
    try {
      return { analysis: await getClaudeMarketAnalysis(topic), engineUsed: "claude" };
    } catch (e) {
      console.warn("Claude analysis failed, falling back...", e);
    }
  }

  // 2. Try OpenAI
  if (hasOpenAIKey()) {
    try {
      return { analysis: await getOpenAIMarketAnalysis(topic), engineUsed: "openai" };
    } catch (e) {
      console.warn("OpenAI analysis failed, falling back...", e);
    }
  }

  // 3. Try Gemini
  if (hasGeminiKey()) {
    try {
      return { analysis: await getGeminiMarketAnalysis(topic), engineUsed: "gemini" };
    } catch (e) {
      console.warn("Gemini analysis failed, falling back...", e);
    }
  }

  throw new Error("No API keys available for AI market analysis.");
}
