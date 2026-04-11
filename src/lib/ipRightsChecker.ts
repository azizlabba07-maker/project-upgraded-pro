/**
 * IP Rights Checker - يتحقق من عدم انتهاك حقوق الملكية الفكرية
 * يفحص العلامات التجارية والشخصيات الشهيرة والمحتوى المرخص
 */

import Cache from "./Cache";

export interface IPCheckResult {
  overallRisk: number; // 0-100 (0 = آمن, 100 = خطر عالي)
  status: "safe" | "warning" | "critical" | "review_recommended";
  issues: IPIssue[];
  guidance: string[];
  requiresManualReview: boolean;
}

export interface IPIssue {
  type: "brand" | "character" | "music" | "location" | "footage" | "person";
  severity: "low" | "medium" | "high" | "critical";
  element: string;
  reason: string;
  solution: string;
}

// قائمة العلامات التجارية والشخصيات المحمية
const PROTECTED_BRANDS = [
  "apple",
  "google",
  "microsoft",
  "amazon",
  "nike",
  "adidas",
  "gucci",
  "dior",
  "louis vuitton",
  "coca cola",
  "mercedes",
  "bmw",
  "disney",
  "marvel",
  "star wars",
  "harry potter",
];

const PROTECTED_CHARACTERS = [
  "mickey mouse",
  "donald duck",
  "superman",
  "batman",
  "spider-man",
  "iron man",
  "captain america",
  "elsa",
  "frozen",
  "disney princess",
];

const PROTECTED_MUSIC_PATTERNS = [
  "copyrighted music",
  "licensed track",
  "commercial song",
  "artist performance",
  "live concert",
  "recognizable melody",
];

const LOCATIONS_REQUIRING_PERMISSION = [
  "theme park",
  "disneyland",
  "universal studios",
  "private property",
  "government building",
  "sacred site",
  "art installation",
  "copyrighted mural",
];

const PROBLEMATIC_PEOPLE = [
  "celebrity",
  "athlete",
  "influencer",
  "politician",
  "public figure",
  "recognizable person",
];

/**
 * فحص شامل لحقوق الملكية الفكرية
 */
export async function checkIPRights(
  title: string,
  description: string,
  keywords: string[],
  concept: string,
  hasMusic: boolean = false,
  hasIdentifiablePeople: boolean = false,
  hasPrivateLocations: boolean = false
): Promise<IPCheckResult> {
  // ✅ Fixed: Cache key now includes all parameters for unique analysis
  const cacheKey = `ip_check_${title}_${description.substring(0, 50)}_${keywords.join('_')}_${concept}_${hasMusic}_${hasIdentifiablePeople}_${hasPrivateLocations}`;
  const cached = Cache.get<IPCheckResult>(cacheKey);
  if (cached) return cached;

  const issues: IPIssue[] = [];
  let riskScore = 0;

  // 1. Check for brand mentions
  const brandIssues = checkBrandMentions(title, description, keywords);
  issues.push(...brandIssues);
  riskScore += brandIssues.reduce((acc, i) => acc + getSeverityScore(i.severity), 0);

  // 2. Check for character mentions
  const characterIssues = checkCharacterMentions(description, keywords);
  issues.push(...characterIssues);
  riskScore += characterIssues.reduce((acc, i) => acc + getSeverityScore(i.severity), 0);

  // 3. Check for music/audio issues
  if (hasMusic) {
    const musicIssues = checkMusicRights(description, keywords);
    issues.push(...musicIssues);
    riskScore += musicIssues.reduce((acc, i) => acc + getSeverityScore(i.severity), 0);
  }

  // 4. Check for location issues
  const locationIssues = checkLocationRights(description, concept, keywords);
  issues.push(...locationIssues);
  riskScore += locationIssues.reduce((acc, i) => acc + getSeverityScore(i.severity), 0);

  // 5. Check for identifiable people
  if (hasIdentifiablePeople) {
    const peopleIssues = checkIdentifiablePeople(description, keywords);
    issues.push(...peopleIssues);
    riskScore += peopleIssues.reduce((acc, i) => acc + getSeverityScore(i.severity), 0);
  }

  // 6. Check for private property
  if (hasPrivateLocations) {
    const privateIssues = checkPrivateProperty(description);
    issues.push(...privateIssues);
    riskScore += privateIssues.reduce((acc, i) => acc + getSeverityScore(i.severity), 0);
  }

  // Normalize risk score
  const overallRisk = Math.min(Math.round((riskScore / 10) * (issues.length > 0 ? 1 : 0.5)), 100);

  const status = determineStatus(overallRisk, issues);
  const guidance = generateGuidance(issues, status);

  const result: IPCheckResult = {
    overallRisk,
    status,
    issues,
    guidance,
    requiresManualReview:
      status === "critical" || issues.some((i) => i.severity === "critical"),
  };

  Cache.set(cacheKey, result, 60 * 60 * 1000); // Cache for 1 hour
  return result;
}

function checkBrandMentions(
  title: string,
  description: string,
  keywords: string[]
): IPIssue[] {
  const issues: IPIssue[] = [];
  const content = `${title} ${description} ${keywords.join(" ")}`.toLowerCase();

  // ✅ IMPROVED: Only flag exact/strong matches, not partial matches
  for (const brand of PROTECTED_BRANDS) {
    // Check for whole word matches (more accurate)
    const regex = new RegExp(`\\b${brand}\\b`);
    if (regex.test(content)) {
      // ✅ NEW: Severity based on context
      let severity: "low" | "medium" | "high" | "critical" = "high";
      
      // Lower severity if it's just mentioned in keywords vs. in title
      if (keywords.some(k => k.toLowerCase() === brand)) {
        severity = "medium"; // Less critical in keywords
      }
      
      // More critical if in title
      if (title.toLowerCase().includes(brand)) {
        severity = "critical";
      }

      issues.push({
        type: "brand",
        severity,
        element: brand,
        reason: `تم ذكر العلامة التجارية "${brand}" المحمية بحقوق الملكية الفكرية`,
        solution:
          "إما أزل ذكر العلامة التجارية أو احصل على إذن من المالك أو استخدم عناصر عامة بدلاً منها",
      });
    }
  }

  return issues;
}

function checkCharacterMentions(
  description: string,
  keywords: string[]
): IPIssue[] {
  const issues: IPIssue[] = [];
  const content = `${description} ${keywords.join(" ")}`.toLowerCase();

  // ✅ IMPROVED: More targeted character detection
  for (const character of PROTECTED_CHARACTERS) {
    const regex = new RegExp(`\\b${character}\\b`);
    if (regex.test(content)) {
      issues.push({
        type: "character",
        severity: "critical",
        element: character,
        reason: `الشخصية "${character}" محمية بحقوق الملكية الفكرية لاستوديو محترف`,
        solution: "استخدم شخصيات أصلية خاصة بك بدلاً من الشخصيات المشهورة المحمية",
      });
    }
  }

  return issues;
}

function checkMusicRights(
  description: string,
  keywords: string[]
): IPIssue[] {
  const issues: IPIssue[] = [];
  const content = `${description} ${keywords.join(" ")}`.toLowerCase();

  // ✅ IMPROVED: More sophisticated music detection
  const musicIndicators = [
    { pattern: "copyrighted music", alert: true },
    { pattern: "licensed track", alert: true },
    { pattern: "commercial song", alert: true },
    { pattern: "artist performance", alert: true },
    { pattern: "live concert", alert: true },
    { pattern: "recognizable melody", alert: true },
    { pattern: "podcast", alert: false }, // Lower risk
    { pattern: "ambient", alert: false }, // Often royalty-free
  ];

  for (const indicator of musicIndicators) {
    if (content.includes(indicator.pattern)) {
      if (indicator.alert) {
        issues.push({
          type: "music",
          severity: "high",
          element: indicator.pattern,
          reason: "يبدو أن المحتوى يحتوي على موسيقى مرخصة أو أغنية مشهورة",
          solution:
            "استخدم موسيقى خالية من الحقوق (royalty-free) من منصات موثوقة مثل Epidemic Sound أو Artlist",
        });
      }
    }
  }

  return issues;
}

function checkLocationRights(
  description: string,
  concept: string,
  keywords: string[]
): IPIssue[] {
  const issues: IPIssue[] = [];
  const content =
    `${description} ${concept} ${keywords.join(" ")}`.toLowerCase();

  // ✅ IMPROVED: More targeted location detection
  const criticalLocations = {
    "disneyland": "critical",
    "universal studios": "critical",
    "theme park": "high",
    "government building": "high",
    "sacred site": "high",
    "copyrighted mural": "high",
    "famous landmark": "medium",
    "private property": "medium",
    "art installation": "medium",
  };

  for (const [location, severity] of Object.entries(criticalLocations)) {
    if (content.includes(location)) {
      issues.push({
        type: "location",
        severity: severity as "low" | "medium" | "high" | "critical",
        element: location,
        reason: `الموقع "${location}" قد يتطلب تصريح أو إذن خاص للتصوير`,
        solution:
          "احصل على تصريح كتابي من مالك الموقع أو استخدم مواقع عامة أو مفتوحة",
      });
    }
  }

  return issues;
}

function checkIdentifiablePeople(
  description: string,
  keywords: string[]
): IPIssue[] {
  const issues: IPIssue[] = [];
  const content = `${description} ${keywords.join(" ")}`.toLowerCase();

  // ✅ IMPROVED: More specific person detection
  const personIndicators = {
    "celebrity": "critical",
    "famous athlete": "critical",
    "influencer": "high",
    "politician": "high",
    "public figure": "high",
    "recognizable person": "medium",
    "identifiable person": "medium",
  };

  for (const [indicator, severity] of Object.entries(personIndicators)) {
    if (content.includes(indicator)) {
      issues.push({
        type: "person",
        severity: severity as "low" | "medium" | "high" | "critical",
        element: indicator,
        reason:
          "الفيديو قد يحتوي على أشخاص معروفين أو قابلين للتعرف عليهم قانونياً",
        solution:
          "احصل على موافقة كتابية من جميع الأشخاص المرئيين (Model Release Form)",
      });
    }
  }

  return issues;
}

function checkPrivateProperty(description: string): IPIssue[] {
  const issues: IPIssue[] = [];

  const privateKeywords = [
    "private property",
    "residential",
    "home interior",
    "bedroom",
    "bathroom",
    "office space",
    "private office",
  ];

  // ✅ IMPROVED: More sophisticated private property detection
  const matchedKeywords = privateKeywords.filter(k =>
    description.toLowerCase().includes(k)
  );

  if (matchedKeywords.length > 0) {
    issues.push({
      type: "location",
      severity: matchedKeywords.length > 2 ? "high" : "medium",
      element: "private property",
      reason:
        "تصوير على ملكية خاصة دون موافقة المالك قد يعتبر انتهاكاً قانونياً",
      solution:
        "احصل على موافقة مكتوبة من مالك الممتلكات (Property Release Form)",
    });
  }

  return issues;
}

function getSeverityScore(severity: string): number {
  switch (severity) {
    case "critical":
      return 40;
    case "high":
      return 30;
    case "medium":
      return 15;
    case "low":
      return 5;
    default:
      return 0;
  }
}

function determineStatus(
  riskScore: number,
  issues: IPIssue[]
): "safe" | "warning" | "critical" | "review_recommended" {
  if (riskScore === 0) return "safe";
  if (issues.some((i) => i.severity === "critical")) return "critical";
  if (riskScore > 70) return "critical";
  if (riskScore > 40) return "warning";
  return "review_recommended";
}

function generateGuidance(
  issues: IPIssue[],
  status: string
): string[] {
  const guidance: string[] = [];

  if (issues.length === 0) {
    guidance.push("✅ المحتوى يبدو آمناً من ناحية حقوق الملكية الفكرية");
    return guidance;
  }

  const criticalIssues = issues.filter((i) => i.severity === "critical");
  const highIssues = issues.filter((i) => i.severity === "high");
  const mediumIssues = issues.filter((i) => i.severity === "medium");

  if (criticalIssues.length > 0) {
    guidance.push(
      `⛔ تم اكتشاف ${criticalIssues.length} مشاكل حرجة - هذا المحتوى قد يتم رفضه بنسبة عالية جداً`
    );
    guidance.push("المشاكل الحرجة تتطلب إصلاحاً فوري قبل الرفع");
  }

  if (highIssues.length > 0) {
    guidance.push(
      `⚠️ تم اكتشاف ${highIssues.length} مشاكل عالية المستوى\n` +
        highIssues.map((i) => `- ${i.solution}`).join("\n")
    );
  }

  if (mediumIssues.length > 0) {
    guidance.push(
      `ℹ️ هناك ${mediumIssues.length} مشكلة متوسطة قد تحتاج إلى اهتمام`
    );
  }

  guidance.push(
    "📋 استشر قائمة حقوق الملكية الفكرية Adobe عند الشك في أي عنصر"
  );

  return guidance;
}

/**
 * Batch IP check for multiple items
 */
export async function batchCheckIPRights(
  items: Array<{
    title: string;
    description: string;
    keywords: string[];
    concept: string;
    hasMusic?: boolean;
    hasIdentifiablePeople?: boolean;
    hasPrivateLocations?: boolean;
  }>
): Promise<IPCheckResult[]> {
  return Promise.all(
    items.map((item) =>
      checkIPRights(
        item.title,
        item.description,
        item.keywords,
        item.concept,
        item.hasMusic,
        item.hasIdentifiablePeople,
        item.hasPrivateLocations
      )
    )
  );
}
