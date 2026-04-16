import { type ImageAnalysisResult } from "../types";

/**
 * Logic to determine the "Releases" column value for Adobe Stock CSV.
 */
export function getReleasesString(r: ImageAnalysisResult): string {
  if (!r.releases && !r.uniqueElement) {
    // Fallback logic if the result is from an older version
    return "None Required";
  }

  const requirements: string[] = [];
  
  if (r.releases?.modelRelease) {
    requirements.push("Model Release Required");
  }
  
  if (r.releases?.propertyRelease) {
    requirements.push("Property Release Required");
  }

  if (requirements.length === 0) {
    return "None Required";
  }

  return requirements.join("; ");
}

/**
 * Helper to prepare a row for export
 */
export function prepareCsvRow(r: ImageAnalysisResult): (string | number)[] {
  return [
    r.filename,
    r.title,
    r.keywords.join(","),
    r.prompt || "",
    r.colorPalette || "",
    r.category || "",
    getReleasesString(r),
    r.adobeReadinessScore?.toString() || "",
    (r.rejectedKeywords || []).join(", "),
  ];
}
