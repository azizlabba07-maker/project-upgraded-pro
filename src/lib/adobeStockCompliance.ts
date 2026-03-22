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
   - References to copyrighted creative works (movies, games, brands, books)
   - Government agency names or official emblems
   - Third-party intellectual property, trademarks, logos

2. VISUAL CONSTRAINTS (always append to prompt):
   - NO humans, faces, hands, fingers, body parts, or recognizable silhouettes
   - NO text, logos, watermarks, signage, or readable writing
   - NO copyrighted elements or brand imagery
   - People/property must be clearly FICTIONAL (fully AI-generated, not based on real persons)

3. ASSET TYPE RULES:
   - Artistic/illustrative/fantasy → submit as ILLUSTRATION
   - Photo-realistic real-world subjects → submit as PHOTO (check "Created using generative AI tools")
   - Vectors → Vectors only; Video → Video only

4. TECHNICAL SPECS FOR PROMPTS:
   - sRGB color space
   - Minimum 4MP (e.g. 4000×4000 or 3840×2160 for 4K)
   - Sharp focus, professional composition, commercial appeal
   - Copy space for overlays (specify location: top-left, right side, bottom, etc.)

5. KEYWORDS & METADATA:
   - 25–50 relevant keywords per asset
   - No artist names, no IP references
   - Mix single words and 2–3 word phrases
`.trim();

/** Suffix to append to every image/illustration prompt */
export const ADOBE_IMAGE_NEGATIVE_SUFFIX =
  "no humans, no faces, no hands, no fingers, no text, no logos, no watermarks, no trademarks, no copyrighted elements, fictional AI-generated content only, sRGB, commercial royalty-free stock";

/** Suffix for video prompts */
export const ADOBE_VIDEO_NEGATIVE_SUFFIX =
  "no humans, no faces, no hands, no fingers, no text, no logos, no watermarks, no trademarks, no copyrighted elements, fictional AI-generated content only, 4K 3840x2160, 24-30fps, commercial royalty-free stock";

/** User checklist reminder for submission portal */
export const ADOBE_SUBMISSION_REMINDERS = [
  "✓ ضع علامة 'Created using generative AI tools' في بوابة المساهم",
  "✓ إذا كان الأشخاص/الممتلكات خيالية: ضع علامة 'People and Property are fictional'",
  "✓ اختر النوع المناسب: Illustration (فني) أو Photo (واقعي)",
  "✓ استخدم 25-50 كلمة مفتاحية، بدون أسماء فنانين أو علامات تجارية",
  "✓ الأبعاد: 4MP على الأقل | sRGB | أقل من 45 MB",
];
