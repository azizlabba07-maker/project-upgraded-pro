/**
 * Adobe Stock Generative AI Compliance - Centralized requirements for prompt generation.
 * =========================================================
 * UPDATED: Hardened against the TWO most common rejection reasons:
 *  1. "SIMILAR CONTENT IN OUR COLLECTION" (Spam/Repetition)
 *  2. "INTELLECTUAL PROPERTY REFUSAL" (IP/Trademark violations)
 * =========================================================
 * @see https://helpx.adobe.com/stock/contributor/help/generative-ai-content.html
 * @see https://helpx.adobe.com/stock/contributor/help/similar-vs-spamming.html
 * @see https://helpx.adobe.com/stock/contributor/help/submission-guidelines.html
 */

export const ADOBE_AI_PROMPT_RULES = `
ADOBE STOCK GENERATIVE AI COMPLIANCE (MANDATORY — VIOLATIONS CAUSE IMMEDIATE REJECTION):

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨 RULE #1 — INTELLECTUAL PROPERTY (IP) REFUSAL PREVENTION:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NEVER include in the prompt, title, or keywords — ANY of the following:
  - Brand names of ANY food product, condiment, sauce, or dip (e.g., Heinz, Tabasco, Maggi, Knorr, Hellmann's, Frank's, Sriracha, Cholula, Kikkoman, Maille, Dijon brand, etc.)
  - Names of artists, real known people, or fictional characters
  - References to copyrighted creative works (movies, games, brands, books, iconic architecture)
  - Government agency names or official emblems
  - Third-party intellectual property, trademarks, logos, recognizable vehicle models, brand-specific aesthetics
  - Famous or recognizable landmarks/buildings, specific modern branded product designs
  - Named restaurant chains, fast food logos or packaging designs
  - Any UI/app icons that imply a real existing product

VISUAL IP PREVENTION — The generated image/video MUST NOT show:
  - Product labels, bottle shapes, or packaging that could be identified as a real brand
  - Trademarked color combinations on containers (e.g., Heinz red bottle, Tabasco bottle shape)
  - Any text, logos, or writing on food items, packaging, dishes, or surfaces
  - Signage, brand-colored backgrounds that imply a specific restaurant chain

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨 RULE #2 — SIMILAR CONTENT / SPAM PREVENTION:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Adobe REJECTS batches where content is too similar ("spamming"). Every single asset MUST be radically different:
  - NEVER generate the same subject from a slightly different angle. CHANGE THE ENTIRE CONCEPT.
  - AVOID completely generic concepts: "empty office," "abstract background," "lush plant," "colorful dips," "seeds in water."
  - DO NOT repeat: same ingredient group, same color palette, same overhead shot, same splash effect.

MANDATORY DIFFERENTIATION per prompt:
  1. Change SUBJECT COMPLETELY (e.g., not just 3 different sauces — use: a single herb arrangement, a spice texture, a fermentation close-up, a wooden cutting board with contrasting textures)
  2. Change CAMERA ANGLE radically (overhead flat lay → extreme macro → 45-degree side shot → dynamic pour shot)
  3. Change LIGHTING COMPLETELY (bright airy studio → dark moody restaurant → golden natural sunlight → industrial hard light)
  4. Change COLOR STORY (warm earth tones → cool Mediterranean blues → vibrant tropical → monochromatic)
  5. Change COMPOSITION STYLE (symmetrical → rule of thirds → abstract splatter → minimalist single element)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 RULE #3 — TECHNICAL & QUALITY STANDARDS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  - sRGB color space, sharp focus, professional composition, strong commercial appeal
  - NO AI artifacts: no melted shapes, no duplicate objects, no blurry text, no anatomical errors
  - For Video: slow smooth cinematic motion ONLY. NO camera shake, NO fast pans, NO jitter.
  - All content: fictional, AI-generated, commercial royalty-free, no real-world identifiable elements

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 RULE #4 — KEYWORDS & METADATA:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  - 25–50 relevant, commercially-focused keywords per asset
  - NO artist names, NO IP references, NO brand names, NO platform names (Midjourney, DALL-E, etc.)
  - DO NOT use promotional language: "stunning," "4K," "amazing," "best," "exclusive," "masterpiece"
  - NO technical suffixes: Do not end titles with "video clip", "footage", "motion", "4k", or similar terms.
`.trim();

/**
 * Technical and promotional terms banned in Titles and Keywords
 */
export const ADOBE_BANNED_METADATA_TERMS = [
  "video", "clip", "footage", "motion", "4k", "8k", "uhd", "high resolution",
  "stunning", "exclusive", "masterpiece", "best quality", "top quality",
  "amazing", "beautiful", "must see", "best", "top", "trending", "premium",
  "sharp focus", "highly detailed", "hyper realistic", "photorealistic",
  "unreal engine", "octane render", "redshift", "vray", "midjourney", "dall-e",
  "stable diffusion", "ai generated", "ai-generated", "created by ai"
];

/** Suffix to append to every image/illustration prompt */
export const ADOBE_IMAGE_NEGATIVE_SUFFIX =
  "no humans, no faces, no hands, no fingers, no text, no logos, no watermarks, no trademarks, no brand packaging, no labels, no brand colors, no copyrighted elements, no recognizable brands, no famous architecture, no modern product designs, fictional AI-generated content only, sRGB, professional quality, high detail, commercial royalty-free stock";

/** Suffix for video prompts */
export const ADOBE_VIDEO_NEGATIVE_SUFFIX =
  "no humans, no faces, no hands, no fingers, no text, no logos, no watermarks, no trademarks, no brand packaging, no labels, no brand colors, no copyrighted elements, no recognizable brands, no famous architecture, no modern product designs, fictional AI-generated content only, 4K 3840x2160, 24-30fps, slow smooth camera, no camera shake, no jittering, smooth seamless motion, no artifacts, high bitrate, no compression issues, commercial royalty-free stock";

/** User checklist reminder for submission portal */
export const ADOBE_SUBMISSION_REMINDERS = [
  "✓ ضع علامة 'Created using generative AI tools' في بوابة المساهم",
  "✓ إذا كان الأشخاص/الممتلكات خيالية: ضع علامة 'People and Property are fictional'",
  "✓ اختر النوع المناسب: Illustration (فني) أو Photo (واقعي)",
  "✓ استخدم 25-50 كلمة مفتاحية، بدون أسماء فنانين أو علامات تجارية",
  "✓ الأبعاد: 4MP على الأقل | sRGB | أقل من 45 MB",
  "✓ تحقق: هل الفيديو يشبه فيديوهات أخرى رفعتها؟ إذا نعم — لا ترفعه.",
  "✓ تحقق: هل يظهر أي تغليف، زجاجة، أو لون قد يحاكي علامة تجارية حقيقية؟ إذا نعم — لا ترفعه.",
];

/**
 * قائمة العلامات التجارية لمنتجات الغذاء المحظورة خصوصاً (IP Refusal سبب رقم 1)
 * يُستخدم في sanitizer.ts وفحص الامتثال
 */
export const GLOBAL_IP_BLACKLIST = [
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Tech & Electronics
  // NOTE: Ambiguous single words (apple, samsung, galaxy, sony, microsoft,
  //       windows, surface, google, pixel, android, hp, dell, canon, nikon,
  //       nintendo, switch) are EXCLUDED — they are common English words
  //       that destroy architecture, food, space & tech stock content.
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  "iphone", "ipad", "macbook", "imac", "airpods", "apple watch",
  "samsung galaxy", "playstation", "nintendo switch",
  "microsoft windows", "xbox", "surface pro", "surface tablet",
  "google pixel", "google chrome",
  "lenovo", "asus", "acer", "logitech",
  
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Automotive
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  "tesla", "bmw", "mercedes", "audi", "porsche", "ferrari", "lamborghini",
  "toyota", "honda", "ford", "chevrolet", "nissan", "jeep", "volkswagen",
  
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Fashion & Luxury
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  "nike", "adidas", "puma", "reebok", "under armour", "gucci", "prada",
  "louis vuitton", "chanel", "hermes", "dior", "rolex", "omega", "cartier",
  "supreme", "off-white", "zara", "h&m", "levis", "ray-ban",
  
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Food & Beverage (Condiments & Sauces)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  "heinz", "tabasco", "maggi", "knorr", "hellmanns", "hellmann",
  "franks", "sriracha huy fong", "cholula", "kikkoman", "maille",
  "lea and perrins", "worcestershire sauce", "guldens",
  "hunts", "del monte", "prego", "ragu", "classico", "barilla",
  "bertolli", "newmans own", "annies", "charcuterie", "charcuterie board",
  
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Fast Food & Restaurant
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  "kfc", "subway", "dominos", "starbucks", "mcdonalds",
  "pizza hut", "wendys", "taco bell", "chipotle",
  "chickfila", "chick-fil-a", "in-n-out", "five guys", "shake shack",
  "dunkin", "tim hortons", "panera", "popeyes",
  
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Packaged Food & Snacks
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  "lays", "pringles", "doritos", "cheetos", "fritos", "ritz",
  "oreo", "nabisco", "kelloggs", "nestle", "kraft", "philadelphia cream",
  "velveeta", "campbells", "progresso", "swanson", "nutella", "ferrero",
  
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Household & Common Names (High IP Risk)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  "moka pot", "kleenex", "velcro", "ziploc", "tupperware", "sharpie",
  "post-it", "band-aid", "scotch tape", "frisbee", "chapstick",
  "thermos", "stanley cup", "yeti", "hydro flask", "le creuset",
  
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Beverages
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  "coca-cola", "pepsi", "sprite", "fanta", "7up", "red bull", "monster energy",
  "gatorade", "powerade", "lipton", "arizona tea", "snapple", "nespresso",
  "keurig", "volvic", "evian", "perrier", "san pellegrino",
];

/**
 * Standard Adobe Stock Categories
 */
export const ADOBE_CATEGORIES = [
  "Animals", "Buildings and Architecture", "Business", "Drinks", "Environment",
  "States of Mind", "Food", "Graphic Resources", "Hobbies and Leisure",
  "Industry", "Landscapes", "Lifestyle", "People", "Plants and Flowers",
  "Culture and Religion", "Science", "Social Issues", "Sports", "Technology",
  "Transport and Infrastructure", "Travel",
];

