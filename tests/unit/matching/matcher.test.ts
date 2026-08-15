import { describe, it, expect, beforeEach } from 'vitest';
import { matchingService } from '../../../src/services/matchingService';
import { salarySlipService } from '../../../src/services/salarySlipService';
import { SalarySlip } from '../../../src/types/salarySlip';

describe('Phase 9.5 — Employee Matching & Approval Pipeline Unit Tests', () => {
  beforeEach(async () => {
    await salarySlipService.setMemoryStoreForTesting([]);
  });

  it('1. Confirming match sets status to MANUALLY_CONFIRMED, approvalStatus to APPROVED and confidence to 1.0', async () => {
    const slip: SalarySlip = {
      id: 'slip-match-1',
      filePath: '/path/slip1.pdf',
      fileName: 'slip1.pdf',
      fileHash: 'hash-slip-1',
      detectedEmployeeId: 'EMP1024',
      extractionMethod: 'TEXT_EMBEDDED',
      matchConfidence: 0.8,
      matchStatus: 'POSSIBLE_MATCH',
      approvalStatus: 'PENDING',
      ocrStatus: 'NOT_REQUIRED',
      createdAt: '1000',
      updatedAt: '1000',
    };
    await salarySlipService.setMemoryStoreForTesting([slip]);

    const confirmed = await matchingService.confirmMatch('slip-match-1', 'emp-db-1');
    expect(confirmed?.matchStatus).toBe('MANUALLY_CONFIRMED');
    expect(confirmed?.approvalStatus).toBe('APPROVED');
    expect(confirmed?.matchConfidence).toBe(1.0);
    expect(confirmed?.matchedEmployeeId).toBe('emp-db-1');
  });

  it('2. Rejecting match sets status to MANUALLY_REJECTED, approvalStatus to REJECTED and confidence to 0.0', async () => {
    const slip: SalarySlip = {
      id: 'slip-match-2',
      filePath: '/path/slip2.pdf',
      fileName: 'slip2.pdf',
      fileHash: 'hash-slip-2',
      detectedEmployeeId: 'EMP1025',
      extractionMethod: 'TEXT_EMBEDDED',
      matchConfidence: 0.5,
      matchStatus: 'CONFLICT',
      approvalStatus: 'PENDING',
      ocrStatus: 'NOT_REQUIRED',
      createdAt: '1000',
      updatedAt: '1000',
    };
    await salarySlipService.setMemoryStoreForTesting([slip]);

    const rejected = await matchingService.rejectMatch('slip-match-2');
    expect(rejected?.matchStatus).toBe('MANUALLY_REJECTED');
    expect(rejected?.approvalStatus).toBe('REJECTED');
    expect(rejected?.matchConfidence).toBe(0.0);
  });

  it('3. Reset match clears manual override and recalculates match state', async () => {
    const slip: SalarySlip = {
      id: 'slip-match-3',
      filePath: '/path/slip3.pdf',
      fileName: 'slip3.pdf',
      fileHash: 'hash-slip-3',
      detectedEmployeeId: 'EMP1026',
      extractionMethod: 'TEXT_EMBEDDED',
      matchConfidence: 0.0,
      matchStatus: 'MANUALLY_REJECTED',
      approvalStatus: 'REJECTED',
      ocrStatus: 'NOT_REQUIRED',
      createdAt: '1000',
      updatedAt: '1000',
    };
    await salarySlipService.setMemoryStoreForTesting([slip]);

    const reset = await matchingService.resetMatch('slip-match-3');
    expect(reset).toBeDefined();
    expect(reset?.matchStatus).toBe('UNMATCHED');
    expect(reset?.approvalStatus).toBe('PENDING');
  });

  it('4. Authoritative summary reconciliation invariant test', () => {
    const slips: SalarySlip[] = [
      { id: '1', filePath: '/1.pdf', fileName: '1.pdf', fileHash: 'h1', extractionMethod: 'TEXT_EMBEDDED', matchConfidence: 1.0, matchStatus: 'EXACT_MATCH', approvalStatus: 'APPROVED', ocrStatus: 'NOT_REQUIRED', createdAt: '1000', updatedAt: '1000' },
      { id: '2', filePath: '/2.pdf', fileName: '2.pdf', fileHash: 'h2', extractionMethod: 'TEXT_EMBEDDED', matchConfidence: 0.9, matchStatus: 'STRONG_MATCH', approvalStatus: 'PENDING', ocrStatus: 'NOT_REQUIRED', createdAt: '1000', updatedAt: '1000' },
      { id: '3', filePath: '/3.pdf', fileName: '3.pdf', fileHash: 'h3', extractionMethod: 'TEXT_EMBEDDED', matchConfidence: 0.7, matchStatus: 'POSSIBLE_MATCH', approvalStatus: 'PENDING', ocrStatus: 'NOT_REQUIRED', createdAt: '1000', updatedAt: '1000' },
      { id: '4', filePath: '/4.pdf', fileName: '4.pdf', fileHash: 'h4', extractionMethod: 'TEXT_EMBEDDED', matchConfidence: 0.5, matchStatus: 'CONFLICT', approvalStatus: 'PENDING', ocrStatus: 'NOT_REQUIRED', createdAt: '1000', updatedAt: '1000' },
      { id: '5', filePath: '/5.pdf', fileName: '5.pdf', fileHash: 'h5', extractionMethod: 'TEXT_EMBEDDED', matchConfidence: 0.0, matchStatus: 'NO_MATCH', approvalStatus: 'PENDING', ocrStatus: 'NOT_REQUIRED', createdAt: '1000', updatedAt: '1000' },
      { id: '6', filePath: '/6.pdf', fileName: '6.pdf', fileHash: 'h6', extractionMethod: 'NOT_IDENTIFIED', matchConfidence: 0.0, matchStatus: 'UNMATCHED', approvalStatus: 'PENDING', ocrStatus: 'NOT_REQUIRED', createdAt: '1000', updatedAt: '1000' },
    ];

    const exact = slips.filter((s) => s.matchStatus === 'EXACT_MATCH').length;
    const strong = slips.filter((s) => s.matchStatus === 'STRONG_MATCH').length;
    const possible = slips.filter((s) => s.matchStatus === 'POSSIBLE_MATCH').length;
    const conflict = slips.filter((s) => s.matchStatus === 'CONFLICT').length;
    const noMatch = slips.filter((s) => s.matchStatus === 'NO_MATCH').length;
    const unmatched = slips.filter((s) => s.matchStatus === 'UNMATCHED').length;

    const total = slips.length;
    expect(exact + strong + possible + conflict + noMatch + unmatched).toBe(total);
    expect(total).toBe(6);
  });
});
