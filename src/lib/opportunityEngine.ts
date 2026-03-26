import { generateWithGemini } from "./gemini";
import { ADOBE_AI_PROMPT_RULES } from "./adobeStockCompliance";
import { extractAndParseJSON, withCache, sanitizePromptOrKeywords, sanitizeStringArray } from "@/lib/sanitizer";

export interface OpportunityEngineResult {
  topic: string;
  questions: string[];
  opportunityScore: number;
  demandEstimate: string;
  competitionEstimate: string;
  optimizedPrompt: string;
  keywords: string[];
  title: string;
}

export async function runOpportunityPipeline(
  topic: string,
  category: string
): Promise<OpportunityEngineResult> {
  // We run this as a single complex Gemini call to save time and API quota, 
  // instructing the AI to act as the full pipeline: AnswerThePublic -> Ahrefs -> Midjourney Optimizer.
  
  const seed = `OPP-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  
  const prompt = `You are a Master AI acting as an entire "Market Opportunity Engine" pipeline for an Adobe Stock contributor.
You will process the following topic: "${topic}" in category: "${category}".

Follow this 3-step pipeline exactly.

STEP 1: INTENT EXPANSION (AnswerThePublic analog)
Analyze the topic and generate the top 3 most profitable, commercial, and highly-searched visual questions or concepts people are looking for regarding this topic. 

STEP 2: MARKET SCORING (Ahrefs analog)
Estimate the current Demand (low/medium/high) and Competition (low/medium/high) for this topic on Adobe Stock.
Calculate an "Opportunity Score" from 0 to 100 based on this (high demand + low competition = high score).

STEP 3: PROMPT MUTATION ENGINE
Based on the absolute best and most profitable concept from Step 1, generate a single, highly-optimized, incredibly detailed AI image generation prompt (max 70 words).
- It MUST be photorealistic, cinematic, or highly commercial.
- MUST follow Adobe Stock rules: no real people, no brands, no text, no copyright.
Also, generate a catchy English SEO Title (max 70 chars) and 25 highly relevant English keywords.

CRITICAL: Return ONLY a valid JSON object matching the exact interface below, without any markdown formatting or \`\`\`json wrappers.

Seed: ${seed}
Rules Reminder:
${ADOBE_AI_PROMPT_RULES}

JSON Format Required:
{
  "topic": "${topic}",
  "questions": ["Question 1", "Question 2", "Question 3"],
  "opportunityScore": 85,
  "demandEstimate": "high",
  "competitionEstimate": "low",
  "optimizedPrompt": "A highly detailed prompt...",
  "keywords": ["kw1", "kw2", "...", "exactly 25 keywords"],
  "title": "SEO Optimized Title"
}`;

  return withCache(`opportunity_engine_${topic}_${category}`, 24 * 60 * 60 * 1000, async () => {
    const resultText = await generateWithGemini(prompt, 0.7);
    const parsed = extractAndParseJSON<OpportunityEngineResult>(resultText, null as any);
    if (!parsed) {
        throw new Error("Failed to parse Opportunity Engine AI response.");
    }
    
    parsed.optimizedPrompt = sanitizePromptOrKeywords(parsed.optimizedPrompt);
    if (parsed.keywords) {
        parsed.keywords = sanitizeStringArray(parsed.keywords);
    }
    return parsed;
  });
}
