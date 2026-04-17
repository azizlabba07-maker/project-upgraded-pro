import type { AnalysisResult } from "../types";

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
    "Title", 
    "Title_Length",
    "Description", 
    "Keywords", 
    "Keyword_Count", 
    "Category",
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
    "Score_Clarity", 
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

    return [
      csvCell(r.name),
      csvCell(r.title),
      csvCell(r.title.length),
      csvCell(r.description),
      csvCell(r.keywords.join("; ")), // Use semicolons so CSV doesn't break
      csvCell(r.keywords.length),
      csvCell(r.category),
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
      csvCell(sb?.subjectClarity ?? ""),
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
