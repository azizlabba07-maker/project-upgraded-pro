/**
 * Auto Optimizer: تحسين تلقائي للبرومبتات الضعيفة
 * كل برومبت يُولَد يخضع لفحص جودة ويُحسَّن تلقائياً قبل العرض.
 */

import { generateWithGemini, hasAnyApiKey } from "@/lib/gemini";

const QUALITY_ENHANCERS: Record<string, string[]> = {
  lighting: [
    "cinematic rim lighting with soft fill",
    "professional three-point studio lighting",
    "golden hour warm backlighting",
    "dramatic chiaroscuro with deep shadows",
    "soft diffused natural window light",
  ],
  composition: [
    "rule of thirds with leading lines",
    "symmetrical centered with shallow depth of field",
    "dynamic diagonal composition with negative space",
    "bird's eye aerial perspective",
    "wide establishing shot with layered foreground",
  ],
  commercial: [
    "generous copy space on right side for text overlay",
    "commercial stock photography style",
    "versatile neutral background for multiple use cases",
    "clean isolated subject with professional crop",
    "editorial magazine quality finish",
  ],
  technical: [
    "ultra sharp focus, 4K resolution, sRGB color space",
    "professional color grading with rich tonal range",
    "noise-free clean sensor output",
    "high dynamic range with detail in highlights and shadows",
  ],
};

const WEAK_INDICATORS = [
  { test: (p: string) => p.length < 80, fix: "too_short" },
  { test: (p: string) => !p.toLowerCase().includes("light"), fix: "no_lighting" },
  { test: (p: string) => !p.toLowerCase().includes("4k") && !p.toLowerCase().includes("resolution"), fix: "no_resolution" },
  { test: (p: string) => !p.toLowerCase().includes("copy space") && !p.toLowerCase().includes("negative space"), fix: "no_copy_space" },
  { test: (p: string) => !p.toLowerCase().includes("sharp") && !p.toLowerCase().includes("focus"), fix: "no_sharpness" },
];

function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Local fast optimization — no API call needed.
 * Patches weak spots in the prompt.
 */
function localOptimize(prompt: string, category: string): string {
  let result = prompt.trim();
  const weaknesses: string[] = [];

  for (const indicator of WEAK_INDICATORS) {
    if (indicator.test(result)) {
      weaknesses.push(indicator.fix);
    }
  }

  if (weaknesses.length === 0) return result; // already strong

  if (weaknesses.includes("no_lighting")) {
    result += `, ${getRandomItem(QUALITY_ENHANCERS.lighting)}`;
  }
  if (weaknesses.includes("no_copy_space")) {
    result += `, ${getRandomItem(QUALITY_ENHANCERS.commercial)}`;
  }
  if (weaknesses.includes("no_resolution")) {
    result += `, ${getRandomItem(QUALITY_ENHANCERS.technical)}`;
  }
  if (weaknesses.includes("no_sharpness")) {
    result += ", tack sharp focus, high detail clarity";
  }
  if (weaknesses.includes("too_short")) {
    result += `, ${getRandomItem(QUALITY_ENHANCERS.composition)}, professional commercial stock quality, versatile for marketing and editorial use`;
  }

  // Always ensure safety suffix
  if (!result.toLowerCase().includes("no text") && !result.toLowerCase().includes("no logos")) {
    result += ". No text, no logos, no watermarks, no recognizable faces, fictional AI-generated, commercial royalty-free stock.";
  }

  return result;
}

/**
 * AI-powered deep optimization — uses Gemini for a full rewrite.
 * Falls back to local optimization if API unavailable.
 */
export async function optimizePrompt(rawPrompt: string, category: string): Promise<string> {
  // Always run local optimization first
  const localResult = localOptimize(rawPrompt, category);

  // If no API key, return local result
  if (!hasAnyApiKey()) {
    return localResult;
  }

  try {
    const result = await generateWithGemini(
      `You are an elite Adobe Stock prompt optimizer. Take this draft prompt and make it SIGNIFICANTLY better for commercial stock sales.

DRAFT PROMPT:
${localResult}

CATEGORY: ${category}

YOUR MISSION:
1. Keep the same subject/concept but make the description richer, more cinematic, more commercially appealing.
2. Add professional lighting details (rim light, fill light, key light, etc.)
3. Add composition details (rule of thirds, leading lines, depth of field, etc.)
4. Add technical specs (4K, sRGB, sharp focus)
5. Ensure copy space / negative space for buyer text overlays.
6. End with: "No text, no logos, no watermarks, no recognizable faces, fictional AI-generated, commercial royalty-free stock."
7. Keep the prompt between 80-150 words.
8. Write ONLY the optimized prompt text. No explanations.

OPTIMIZED PROMPT:`,
      0.7
    );

    const cleaned = result
      .replace(/^(optimized prompt|prompt|here is|here's|the optimized)[:\s]*/i, "")
      .replace(/^["']|["']$/g, "")
      .trim();

    // Validate the result is reasonable
    if (cleaned.length > 50 && cleaned.length < 800) {
      return cleaned;
    }

    return localResult;
  } catch {
    // Fallback to local optimization
    return localResult;
  }
}

/**
 * Batch optimize multiple prompts.
 */
export async function optimizePrompts(
  prompts: { prompt: string; category: string }[]
): Promise<string[]> {
  const results: string[] = [];
  for (const p of prompts) {
    results.push(await optimizePrompt(p.prompt, p.category));
  }
  return results;
}
