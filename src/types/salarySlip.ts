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
  | 'REJECTED'
  | 'FILE_MISSING';

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type OcrStatus =
  | 'NOT_REQUIRED'
  | 'PENDING'
  | 'RUNNING'
  | 'COMPLETED'
  | 'COMPLETED_WITH_WARNINGS'
  | 'UNAVAILABLE'
  | 'RENDER_FAILED'
  | 'ENGINE_ERROR'
  | 'EMPTY_RESULT'
  | 'TIMEOUT'
  | 'FAILED';

export type DocumentType = 'SALARY_SLIP' | 'POSSIBLE_SALARY_SLIP' | 'NOT_SALARY_SLIP' | 'UNKNOWN';

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
  matchConfidence: number;
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
  month?: string;
  year?: string;
  approvalStatus: ApprovalStatus;
  ocrStatus: OcrStatus;
  documentType?: DocumentType;
  documentConfidence?: number;
  ocrAttemptCount?: number;
  ocrPageCount?: number;
  ocrProcessingTimeMs?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ScanError {
  path: string;
  errorKind: string;
  message: string;
}

export interface DiscoveredFile {
  filePath: string;
  fileName: string;
  fileExtension: string;
  fileSize: number;
  modifiedAt: string;
  fileHash: string;
  month?: string;
  year?: string;
}

export interface FolderScanDiagnostics {
  selectedPath: string;
  displayName: string;
  exists: boolean;
  isDirectory: boolean;
  readable: boolean;
  pdfCount: number;
  directoriesScanned: number;
  filesScanned: number;
  databaseRecords: number;
  scanErrors: ScanError[];
  files: DiscoveredFile[];
}

export interface ScanSummary {
  totalScanned: number;
  pdfCount: number;
  newCount: number;
  updatedCount: number;
  unchangedCount: number;
  duplicateCount: number;
  folderPath: string;
  displayName?: string;
  directoriesScanned?: number;
  filesScanned?: number;
  scanErrors?: (string | ScanError)[];
  files?: DiscoveredFile[];
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
