export type AdobeReadinessStatus =
  "ready" | "review" | "rejected" | "pending" | "processing" | "error";

export interface VideoFile {
  id: string;
  file: File;
  name: string;
  size: number;
  thumbnailUrl?: string;
  frameBase64?: string;
  frameMimeType?: string;
  status: AdobeReadinessStatus;
  result?: AnalysisResult;
  error?: string;
}

export interface ScoreBreakdown {
  uniqueness: number;
  commercialValue: number;
  subjectClarity: number;
  marketSaturation: number;
  metadataPenalty: number;
  bonuses: number;
}

export interface VisualDNA {
  uniqueVisualElement: string;
  colorPalette: string;
  lightingCharacter: string;
  emotionalRegister: string;
  trendAlignment: string[];
}

export interface ReleaseInfo {
  modelRelease: boolean;
  propertyRelease: boolean;
  editorialOnly: boolean;
  copyrightConcern: boolean;
  releaseNote: string;
  avoidanceHint: string;
}

export interface AnalysisResult {
  id: string;
  name: string;
  title: string;
  description: string;
  keywords: string[];
  removedKeywords: string[];
  category: string;
  estimatedAcceptance: number;
  adobeReadinessScore: number;
  adobeReadinessStatus: "ready" | "review" | "rejected";
  adobeReadinessIssues: string[];
  scoreBreakdown?: ScoreBreakdown;
  scoringReasoning?: string;
  visualDNA?: VisualDNA;
  competitiveGap?: string;
  releases?: ReleaseInfo;
  ipConcern: boolean;
  ipNote: string;
}

// For compatibility with older code that might import ImageAnalysisResult
export type ImageAnalysisResult = AnalysisResult;
export type ScoringCriteria = ScoreBreakdown;
