import { type ImageAnalysisResult } from "../types";

/**
 * Logic to determine the "Releases" column value for Adobe Stock CSV.
 */
export function getReleasesString(r: ImageAnalysisResult): string {
  const rel = r.releases;
  if (!rel) return "None Required";

  const requirements: string[] = [
    rel.modelRelease ? "Model Release" : "",
    rel.propertyRelease ? "Property Release" : "",
    rel.editorialOnly ? "Editorial Only" : "",
    rel.copyrightConcern ? "Copyright Concern" : "",
  ].filter(Boolean);

  return requirements.length > 0 ? requirements.join("; ") : "None Required";
}

/**
 * Helper to prepare a row for export.
 * Note: Headers are currently managed in the UI components (e.g., BatchProcessor.tsx).
 * New columns are appended at the end.
 */
export function prepareCsvRow(r: ImageAnalysisResult): (string | number)[] {
  const rel = r.releases;
  const dna = r.visualDNA;

  return [
    r.filename,                                    // Filename
    r.title,                                       // Title
    r.keywords.join(", "),                         // Keywords
    r.prompt || "",                                // Description (was Prompt)
    r.colorPalette || "",                          // Color Palette
    r.category || "",                              // Category
    getReleasesString(r),                          // Releases
    r.adobeReadinessScore?.toString() || "",       // Adobe_Readiness_Score
    (r.rejectedKeywords || []).join(", "),         // Rejected_Keywords
    
    // --- New Columns (Appended) ---
    rel?.modelRelease ? "Yes" : "No",             // Model_Release
    rel?.propertyRelease ? "Yes" : "No",           // Property_Release
    r.adobeReadinessStatus || "",                  // Adobe_Readiness_Status
    (r.estimatedAcceptance?.toString() || "0") + "%", // Estimated_Acceptance_%
    (r.adobeReadinessIssues || []).join("; "),     // Readiness_Issues
    r.competitiveGap || "",                        // Competitive_Gap
    (dna?.trendAlignment || []).join("; "),        // Trend_Alignment
    r.uniqueElement || "",                         // Unique_Visual_Element
    r.ipConcern ? "Yes" : "No",                    // IP_Concern
    r.ipNote || "",                                // IP_Note
    rel?.avoidanceHint || "",                      // IP_Avoidance_Hint
    r.keywords.length.toString()                   // Keyword_Count
  ];
}

/**
 * Full export logic as requested (can be used to replace direct calls if UI is updated later)
 */
export function exportToCsv(results: ImageAnalysisResult[]): void {
  const headers = [
    "Filename", "Title", "Keywords", "Description", "Color_Palette", "Category", 
    "Releases", "Adobe_Readiness_Score", "Removed_Keywords",
    "Model_Release", "Property_Release", "Adobe_Readiness_Status", 
    "Estimated_Acceptance_%", "Readiness_Issues", "Competitive_Gap", 
    "Trend_Alignment", "Unique_Visual_Element", "IP_Concern", 
    "IP_Note", "IP_Avoidance_Hint", "Keyword_Count"
  ];

  const rows = results.map(r => prepareCsvRow(r));
  const csvContent = [
    headers.join(","),
    ...rows.map(row => row.map(cell => {
      const s = String(cell);
      if (s.includes(",") || s.includes('"') || s.includes("\n")) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    }).join(","))
  ].join("\n");

  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `adobe_stock_pro_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
