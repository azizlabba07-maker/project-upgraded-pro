export interface ScoringCriteria {
  uniqueness: number;
  commercialValue: number;
  subjectClarity: number;
  marketSaturation: number;
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
  releases?: {
    modelRelease: boolean;
    propertyRelease: boolean;
    releaseNote?: string;
    avoidanceHint?: string;
  };
}
