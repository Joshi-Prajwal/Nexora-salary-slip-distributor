import { describe, it, expect, beforeEach } from 'vitest';
import { salarySlipService } from '../../../src/services/salarySlipService';
import { SalarySlip } from '../../../src/types/salarySlip';

describe('Phase 4 — OCR Fallback Engine & Integration Tests', () => {
  beforeEach(async () => {
    await salarySlipService.setMemoryStoreForTesting([]);
  });

  it('1. Classifies slip as IDENTIFIED when OCR extracts Employee ID', async () => {
    const slip: SalarySlip = {
      id: 'slip-ocr-1',
      filePath: '/path/scanned_001.pdf',
      fileName: 'scanned_001.pdf',
      fileHash: 'hash-scanned-1',
      detectedEmployeeId: 'EMP-OCR-1024',
      extractionMethod: 'NOT_IDENTIFIED',
      matchConfidence: 0.0,
      matchStatus: 'TEXT_EXTRACTION_FAILED',
      approvalStatus: 'PENDING',
      ocrStatus: 'PENDING',
      createdAt: '1000',
      updatedAt: '1000',
    };
    await salarySlipService.setMemoryStoreForTesting([slip]);

    const updated = await salarySlipService.runOcrFallback('slip-ocr-1');
    expect(updated?.extractionMethod).toBe('OCR');
    expect(updated?.matchStatus).toBe('IDENTIFIED');
    expect(updated?.detectedEmployeeId).toBe('EMP-OCR-1024');
    expect(updated?.ocrConfidence).toBeGreaterThan(0);
  });

  it('2. Classifies slip as PARTIALLY_IDENTIFIED when OCR extracts Name/Email without Employee ID', async () => {
    const slip: SalarySlip = {
      id: 'slip-ocr-2',
      filePath: '/path/scanned_002.pdf',
      fileName: 'scanned_002.pdf',
      fileHash: 'hash-scanned-2',
      detectedName: 'Aarav Patel',
      detectedEmail: 'aarav@example.com',
      extractionMethod: 'NOT_IDENTIFIED',
      matchConfidence: 0.0,
      matchStatus: 'TEXT_EXTRACTION_FAILED',
      approvalStatus: 'PENDING',
      ocrStatus: 'PENDING',
      createdAt: '1000',
      updatedAt: '1000',
    };
    await salarySlipService.setMemoryStoreForTesting([slip]);

    const updated = await salarySlipService.runOcrFallback('slip-ocr-2');
    expect(updated?.extractionMethod).toBe('OCR');
    expect(updated?.matchStatus).toBe('PARTIALLY_IDENTIFIED');
    expect(updated?.detectedName).toBe('Aarav Patel');
    expect(updated?.detectedEmployeeId).toBeUndefined();
  });

  it('3. Preserves DUPLICATE_CONTENT status during OCR fallback execution', async () => {
    const slip: SalarySlip = {
      id: 'slip-ocr-dup',
      filePath: '/path/dup_scanned.pdf',
      fileName: 'dup_scanned.pdf',
      fileHash: 'hash-dup-ocr',
      detectedEmployeeId: 'EMP-DUP-OCR',
      extractionMethod: 'NOT_IDENTIFIED',
      matchConfidence: 0.0,
      matchStatus: 'DUPLICATE_CONTENT',
      duplicateOfId: 'canonical-id-001',
      approvalStatus: 'PENDING',
      ocrStatus: 'PENDING',
      createdAt: '1000',
      updatedAt: '1000',
    };
    await salarySlipService.setMemoryStoreForTesting([slip]);

    const updated = await salarySlipService.runOcrFallback('slip-ocr-dup');
    expect(updated?.matchStatus).toBe('DUPLICATE_CONTENT');
    expect(updated?.duplicateOfId).toBe('canonical-id-001');
    expect(updated?.extractionMethod).toBe('OCR');
  });

  it('4. Batch OCR fallback runs across eligible scanned PDFs and returns OcrBatchSummary', async () => {
    const slips: SalarySlip[] = [
      {
        id: 'b1',
        filePath: '/scan1.pdf',
        fileName: 'scan1.pdf',
        fileHash: 'h1',
        detectedEmployeeId: 'EMP100',
        extractionMethod: 'NOT_IDENTIFIED',
        matchConfidence: 0,
        matchStatus: 'TEXT_EXTRACTION_FAILED',
        approvalStatus: 'PENDING',
        ocrStatus: 'PENDING',
        createdAt: '1',
        updatedAt: '1',
      },
      {
        id: 'b2',
        filePath: '/scan2.pdf',
        fileName: 'scan2.pdf',
        fileHash: 'h2',
        detectedName: 'Dev Sharma',
        extractionMethod: 'NOT_IDENTIFIED',
        matchConfidence: 0,
        matchStatus: 'TEXT_EXTRACTION_FAILED',
        approvalStatus: 'PENDING',
        ocrStatus: 'PENDING',
        createdAt: '1',
        updatedAt: '1',
      },
    ];
    await salarySlipService.setMemoryStoreForTesting(slips);

    const summary = await salarySlipService.runBatchOcrFallback();
    expect(summary.total).toBe(2);
    expect(summary.processed).toBe(2);
    expect(summary.identified).toBe(1);
    expect(summary.partiallyIdentified).toBe(1);
  });
});
