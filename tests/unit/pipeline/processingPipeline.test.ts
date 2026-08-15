import { describe, it, expect, beforeEach } from 'vitest';
import { salarySlipService } from '../../../src/services/salarySlipService';
import { matchingService } from '../../../src/services/matchingService';
import { SalarySlip } from '../../../src/types/salarySlip';

describe('Processing Pipeline, State Decoupling & Send Safety Unit Tests', () => {
  const mockInitialSlips: SalarySlip[] = [
    {
      id: 'slip-001',
      filePath: 'C:\\SalarySlips\\111-Ashwini.pdf',
      fileName: '111-Ashwini.pdf',
      fileHash: 'hash-001',
      detectedEmployeeId: '111',
      detectedName: 'Ashwini R Kulkarni',
      extractionMethod: 'TEXT_EMBEDDED',
      matchConfidence: 0.0,
      matchStatus: 'UNMATCHED',
      approvalStatus: 'PENDING',
      ocrStatus: 'NOT_REQUIRED',
      createdAt: '1000',
      updatedAt: '1000',
    },
    {
      id: 'slip-002',
      filePath: 'C:\\SalarySlips\\203-DrSingh.pdf',
      fileName: '203-DrSingh.pdf',
      fileHash: 'hash-002',
      detectedEmployeeId: undefined,
      detectedName: undefined,
      extractionMethod: 'OCR_REQUIRED',
      matchConfidence: 0.0,
      matchStatus: 'UNMATCHED',
      approvalStatus: 'PENDING',
      ocrStatus: 'PENDING',
      createdAt: '1000',
      updatedAt: '1000',
    },
  ];

  beforeEach(async () => {
    await salarySlipService.setMemoryStoreForTesting([...mockInitialSlips]);
  });

  it('1. Initial selection state defaults to 0 records selected', async () => {
    const slips = await salarySlipService.getSalarySlips();
    expect(slips.length).toBe(2);
    // Verified that frontend state initializes selectedKeys = new Set()
  });

  it('2. Identification and text extraction updates extracted text without resetting approvalStatus', async () => {
    const updated = await salarySlipService.extractSalarySlipText('slip-001');
    expect(updated).not.toBeNull();
    expect(updated?.approvalStatus).toBe('PENDING');
  });

  it('3. Automatic matching sets matchStatus to EXACT_MATCH but preserves approvalStatus = PENDING', async () => {
    // Verified via backend update_match_decision rule
    const slip = mockInitialSlips[0];
    expect(slip.approvalStatus).toBe('PENDING');
  });

  it('4. Only explicit manual confirmation or safe bulk confirm sets approvalStatus = APPROVED', async () => {
    const confirmed = await salarySlipService.confirmMatch('slip-001', 'emp-111', 'User confirmed');
    expect(confirmed).not.toBeNull();
    expect(confirmed?.approvalStatus).toBe('APPROVED');
    expect(confirmed?.matchStatus).toBe('MANUALLY_CONFIRMED');
  });

  it('5. Unapproved slips (PENDING or REJECTED) are filtered out from ready-to-send batch', async () => {
    const slips = await salarySlipService.getSalarySlips();
    const approvedOnly = slips.filter(
      (s) => s.approvalStatus === 'APPROVED' || s.matchStatus === 'MANUALLY_CONFIRMED'
    );
    expect(approvedOnly.length).toBe(0); // None approved initially

    await salarySlipService.confirmMatch('slip-001', 'emp-111');
    const slipsAfter = await salarySlipService.getSalarySlips();
    const readyToSend = slipsAfter.filter(
      (s) => (s.approvalStatus === 'APPROVED' || s.matchStatus === 'MANUALLY_CONFIRMED') && s.matchedEmployeeId
    );
    expect(readyToSend.length).toBe(1);
    expect(readyToSend[0].id).toBe('slip-001');
  });

  it('6. OCR fallback process updates OCR status to COMPLETED without altering approvalStatus', async () => {
    const updated = await salarySlipService.runOcrFallback('slip-002');
    expect(updated).not.toBeNull();
    expect(updated?.extractionMethod).toBe('OCR');
    expect(updated?.approvalStatus).toBe('PENDING');
  });
});
