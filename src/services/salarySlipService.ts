import { SalarySlip } from '../types/salarySlip';

/**
 * Salary Slip Processing Service
 * Provides abstraction for PDF directory scanning & metadata extraction
 */
export const salarySlipService = {
  async scanFolder(_folderPath: string): Promise<SalarySlip[]> {
    // Phase 0 placeholder - folder scanner and text/OCR extraction belong to future phases
    console.log('[Phase 0 Scaffold] Scanning folder:', _folderPath);
    return [
      {
        id: 'slip-1',
        filePath: `${_folderPath}/EMP001_Jan_2026.pdf`,
        fileName: 'EMP001_Jan_2026.pdf',
        fileHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        detectedEmployeeId: 'EMP001',
        detectedName: 'John Doe',
        extractionMethod: 'TEXT_EMBEDDED',
        matchConfidence: 0.95,
        matchStatus: 'READY',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'slip-2',
        filePath: `${_folderPath}/Scanned_Slip_002.pdf`,
        fileName: 'Scanned_Slip_002.pdf',
        fileHash: 'f4c8996fb92427ae41e4649b934ca495991b7852b855e3b0c44298fc1c149afb',
        detectedName: 'Jane Smith',
        extractionMethod: 'OCR',
        matchConfidence: 0.65,
        matchStatus: 'REVIEW_REQUIRED',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
  },

  async getSalarySlips(): Promise<SalarySlip[]> {
    return [];
  },
};
