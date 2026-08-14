export type ExtractionMethod = 'NOT_IDENTIFIED' | 'TEXT_EMBEDDED' | 'OCR' | 'MANUAL';

export type MatchStatus = 'UNMATCHED' | 'READY' | 'REVIEW_REQUIRED' | 'CONFIRMED' | 'REJECTED' | 'DUPLICATE_CONTENT';

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
