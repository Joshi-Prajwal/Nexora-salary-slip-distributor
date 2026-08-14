export type ExtractionMethod = 'TEXT_EMBEDDED' | 'OCR' | 'MANUAL';

export type MatchStatus = 'READY' | 'REVIEW_REQUIRED' | 'UNMATCHED' | 'CONFIRMED' | 'REJECTED';

export interface SalarySlip {
  id: string;
  filePath: string;
  fileName: string;
  fileHash: string;
  detectedEmployeeId?: string;
  detectedName?: string;
  detectedPhone?: string;
  detectedEmail?: string;
  extractionMethod: ExtractionMethod;
  extractedText?: string;
  matchConfidence: number; // 0.0 to 1.0
  matchStatus: MatchStatus;
  createdAt: string;
  updatedAt: string;
}
