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

export interface ImageAnalysisResult {
  filename: string;
  title: string;
  keywords: string[];
  rejectedKeywords?: string[];
  thumbnail?: string;
  prompt: string;
  colorPalette: string;
  deformationScore?: number;
  estimatedAcceptance?: number;
  uniquenessReview?: string;
  adobeReadinessScore?: number;
  category?: string;
  uniqueElement?: string;
  visualDNA?: VisualDNA;
  competitiveGap?: string;
  releases?: ReleaseInfo;
  ipConcern: boolean;
  ipNote: string;
  scoreBreakdown?: ScoreBreakdown;
}
