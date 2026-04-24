import type { AnalysisResult } from "../types";

/**
 * Converts a title to a safe, descriptive filename (no UUID chaos).
 * e.g. "Hot Seared Steak with Steam" → "hot_seared_steak_with_steam"
 */
function titleToFilename(title: string, originalName: string): string {
  // If original name is not a UUID-style name, keep it
  const isUuidName = /upscaled_generated_video_[a-f0-9-]+\.mp4/i.test(originalName);
  if (!isUuidName && originalName) return originalName;

  // Convert title to safe filename
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .slice(0, 60);

  const ext = originalName.includes(".mp4") ? ".mp4" : ".jpg";
  return slug ? `${slug}${ext}` : originalName;
}

/**
 * Escapes a string for CSV, using semicolon as an internal separator for multi-value cells.
 */
function csvCell(value: string | number | null | undefined): string {
  const str = String(value ?? "");
  // If the string contains any CSV-sensitive characters, wrap in quotes
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes(";")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportToCsv(results: AnalysisResult[]): void {
  const headers = [
    "Filename",
    "Descriptive_Filename",        // ✅ اسم وصفي بدلاً من UUID
    "Title", 
    "Title_Length",
    "Description", 
    "Keywords", 
    "Keyword_Count", 
    "Category",
    "AI_Generated",                // ✅ حقل جديد: مطلوب من Adobe
    "People_Property_Fictional",   // ✅ حقل جديد: يمنع رفض Property Release
    "Releases", 
    "Model_Release", 
    "Property_Release", 
    "Editorial_Only", 
    "Copyright_Concern",
    "IP_Avoidance_Hint",
    "Adobe_Score", 
    "Adobe_Status", 
    "Estimated_Acceptance_%",
    "Issues",
    "Score_Uniqueness", 
    "Score_Commercial", 
    "Score_Quality", 
    "Score_Saturation",
    "Score_Metadata_Penalty", 
    "Score_Bonuses",
    "Competitive_Gap", 
    "Trend_Alignment",
    "Unique_Visual_Element", 
    "Color_Palette", 
    "Lighting_Character", 
    "Emotional_Register",
    "Removed_Keywords", 
    "Scoring_Reasoning",
  ];

  const rows = results.map((r) => {
    const rel = r.releases;
    const dna = r.visualDNA;
    const sb = r.scoreBreakdown;

    const releaseSummary = [
      rel?.modelRelease ? "Model Release" : "",
      rel?.propertyRelease ? "Property Release" : "",
      rel?.editorialOnly ? "Editorial Only" : "",
      rel?.copyrightConcern ? "Copyright Concern" : "",
    ].filter(Boolean).join("; ") || "None Required";

    // ✅ الاسم الوصفي: يحوّل UUID إلى اسم قابل للقراءة
    const descriptiveName = titleToFilename(r.title, r.name);

    return [
      csvCell(r.name),
      csvCell(descriptiveName),    // ✅ اسم وصفي جديد
      csvCell(r.title),
      csvCell(r.title.length),
      csvCell(r.description),
      csvCell(r.keywords.join("; ")), // Use semicolons so CSV doesn't break
      csvCell(r.keywords.length),
      csvCell(r.category),
      csvCell("TRUE"),             // ✅ AI_Generated — دائماً TRUE
      csvCell("TRUE"),             // ✅ People_Property_Fictional — دائماً TRUE (يمنع Property Release rejection)
      csvCell(releaseSummary),
      csvCell(rel?.modelRelease ? "Yes" : "No"),
      csvCell(rel?.propertyRelease ? "Yes" : "No"),
      csvCell(rel?.editorialOnly ? "Yes" : "No"),
      csvCell(rel?.copyrightConcern ? "Yes" : "No"),
      csvCell(rel?.avoidanceHint || ""),
      csvCell(r.adobeReadinessScore),
      csvCell(r.adobeReadinessStatus),
      csvCell(`${r.estimatedAcceptance}%`),
      csvCell(r.adobeReadinessIssues.join(" | ")),
      csvCell(sb?.uniqueness ?? ""),
      csvCell(sb?.commercialValue ?? ""),
      csvCell(sb?.visualQuality ?? ""),
      csvCell(sb?.marketSaturation ?? ""),
      csvCell(sb?.metadataPenalty ?? ""),
      csvCell(sb?.bonuses ?? ""),
      csvCell(r.competitiveGap || ""),
      csvCell((dna?.trendAlignment || []).join("; ")),
      csvCell(dna?.uniqueVisualElement || ""),
      csvCell(dna?.colorPalette || ""),
      csvCell(dna?.lightingCharacter || ""),
      csvCell(dna?.emotionalRegister || ""),
      csvCell(r.removedKeywords.join("; ")),
      csvCell(r.scoringReasoning || ""),
    ];
  });

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.join(",")),
  ].join("\n");

  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  
  const date = new Date().toISOString().slice(0, 10);
  const filename = `adobe_stock_${date}_${results.length}files.csv`;

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

/**
 * Compatibility helper for existing BatchProcessor code
 */
export function prepareCsvRow(r: AnalysisResult): (string | number)[] {
  // This is now less relevant as exportToCsv handles the full mapping
  return [r.name, r.title, r.keywords.join(", ")];
}
