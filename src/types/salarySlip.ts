export type ExtractionMethod = 'NOT_IDENTIFIED' | 'TEXT_EMBEDDED' | 'OCR' | 'MANUAL';

export type MatchStatus =
  | 'UNMATCHED'
  | 'NOT_IDENTIFIED'
  | 'IDENTIFIED'
  | 'PARTIALLY_IDENTIFIED'
  | 'TEXT_EXTRACTION_FAILED'
  | 'DUPLICATE_CONTENT'
  | 'EXACT_MATCH'
  | 'STRONG_MATCH'
  | 'POSSIBLE_MATCH'
  | 'NO_MATCH'
  | 'CONFLICT'
  | 'MANUAL_REVIEW'
  | 'MANUALLY_CONFIRMED'
  | 'MANUALLY_REJECTED'
  | 'READY'
  | 'REVIEW_REQUIRED'
  | 'CONFIRMED'
  | 'REJECTED';

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
  duplicateOfId?: string;
  ocrConfidence?: number;
  ocrProcessedAt?: string;
  ocrError?: string;
  matchedEmployeeId?: string;
  matchReason?: string;
  matchedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScanSummary {
  totalScanned: number;
  pdfCount: number;
  newCount: number;
  updatedCount: number;
  unchangedCount: number;
  duplicateCount: number;
  folderPath: string;
  slips: SalarySlip[];
}

export interface ExtractionSummary {
  total: number;
  processed: number;
  identified: number;
  partiallyIdentified: number;
  notIdentified: number;
  failed: number;
  skipped: number;
  slips: SalarySlip[];
}

export interface OcrBatchSummary {
  total: number;
  processed: number;
  identified: number;
  partiallyIdentified: number;
  notIdentified: number;
  failed: number;
  skipped: number;
  slips: SalarySlip[];
}
