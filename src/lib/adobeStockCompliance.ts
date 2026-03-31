/**
 * Adobe Stock Generative AI Compliance - Centralized requirements for prompt generation.
 * Based on: Adobe Stock Contributor Guidelines, Generative AI FAQ, Model/Property Release rules.
 * @see https://helpx.adobe.com/stock/contributor/help/generative-ai-content.html
 * @see https://helpx.adobe.com/stock/contributor/help/submission-guidelines.html
 */

export const ADOBE_AI_PROMPT_RULES = `
ADOBE STOCK GENERATIVE AI COMPLIANCE (MANDATORY IN EVERY PROMPT):

1. CONTENT RESTRICTIONS — NEVER include in prompt, title, or keywords:
   - Names of artists, real known people, or fictional characters
   - References to copyrighted creative works (movies, games, brands, books, iconic architecture)
   - Government agency names or official emblems
   - Third-party intellectual property, trademarks, logos, recognizable vehicle models, specific brand aesthetics
   - NO famous or recognizable landmarks/buildings, NO specific modern product designs, NO recognizable architectural shapes that represent known designers.

2. VISUAL CONSTRAINTS (always append to prompt):
   - NO humans, faces, hands, fingers, body parts, or recognizable silhouettes
   - NO text, logos, watermarks, signage, or readable writing
   - NO copyrighted elements, famous landmark replication, or brand imagery
   - People/property must be clearly FICTIONAL (fully AI-generated, not based on real persons/places)

3. SPAM/SIMILARITY PREVENTION (CRITICAL):
   - AVOID completely generic concepts like "empty office," "abstract background," "lush plant."
   - DO NOT generate the same repetitive ideas. Create highly unique, conceptual, or hyper-specific niche variations.
   - Combine unusual elements (e.g. microscopic textures + lighting) instead of broad scenes.
   - ALWAYS use hyper-specific, unusually detailed descriptions rather than plain generic scenes.

4. TECHNICAL SPECS FOR PROMPTS:
   - sRGB color space, sharp focus, professional composition, commercial appeal.
   - For Video: ENFORCE slow, steady, continuous camera motion ONLY (e.g., slow smooth pan, static tripod, slow tracking). Reject chaotic movements, fast pans, or shakes.

5. KEYWORDS & METADATA:
   - 25–50 relevant keywords per asset. NO artist names, no IP references, no brand names.
`.trim();

/** Suffix to append to every image/illustration prompt */
export const ADOBE_IMAGE_NEGATIVE_SUFFIX =
  "no humans, no faces, no hands, no fingers, no text, no logos, no watermarks, no trademarks, no copyrighted elements, recognizable brands, famous architecture, modern product designs, fictional AI-generated content only, sRGB, professional quality, high detail, commercial royalty-free stock";

/** Suffix for video prompts */
export const ADOBE_VIDEO_NEGATIVE_SUFFIX =
  "no humans, no faces, no hands, no fingers, no text, no logos, no watermarks, no trademarks, no copyrighted elements, recognizable brands, famous architecture, modern product designs, fictional AI-generated content only, 4K 3840x2160, 24-30fps, slow smooth camera, no camera shake, no jittering, smooth seamless motion, no artifacts, high bitrate, no compression issues, commercial royalty-free stock";


/** User checklist reminder for submission portal */
export const ADOBE_SUBMISSION_REMINDERS = [
  "✓ ضع علامة 'Created using generative AI tools' في بوابة المساهم",
  "✓ إذا كان الأشخاص/الممتلكات خيالية: ضع علامة 'People and Property are fictional'",
  "✓ اختر النوع المناسب: Illustration (فني) أو Photo (واقعي)",
  "✓ استخدم 25-50 كلمة مفتاحية، بدون أسماء فنانين أو علامات تجارية",
  "✓ الأبعاد: 4MP على الأقل | sRGB | أقل من 45 MB",
];
