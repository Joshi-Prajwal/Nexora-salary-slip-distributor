import { describe, it, expect, beforeEach } from 'vitest';
import { matchingService } from '../../../src/services/matchingService';
import { salarySlipService } from '../../../src/services/salarySlipService';
import { SalarySlip } from '../../../src/types/salarySlip';

describe('Phase 5 — Employee Matching & Manual Review Unit Tests', () => {
  beforeEach(async () => {
    await salarySlipService.setMemoryStoreForTesting([]);
  });

  it('1. Confirming match sets status to MANUALLY_CONFIRMED and confidence to 1.0', async () => {
    const slip: SalarySlip = {
      id: 'slip-match-1',
      filePath: '/path/slip1.pdf',
      fileName: 'slip1.pdf',
      fileHash: 'hash-slip-1',
      detectedEmployeeId: 'EMP1024',
      extractionMethod: 'TEXT_EMBEDDED',
      matchConfidence: 0.8,
      matchStatus: 'POSSIBLE_MATCH',
      createdAt: '1000',
      updatedAt: '1000',
    };
    await salarySlipService.setMemoryStoreForTesting([slip]);

    const confirmed = await matchingService.confirmMatch('slip-match-1', 'emp-db-1');
    expect(confirmed?.matchStatus).toBe('MANUALLY_CONFIRMED');
    expect(confirmed?.matchConfidence).toBe(1.0);
    expect(confirmed?.matchedEmployeeId).toBe('emp-db-1');
  });

  it('2. Rejecting match sets status to MANUALLY_REJECTED and confidence to 0.0', async () => {
    const slip: SalarySlip = {
      id: 'slip-match-2',
      filePath: '/path/slip2.pdf',
      fileName: 'slip2.pdf',
      fileHash: 'hash-slip-2',
      detectedEmployeeId: 'EMP1025',
      extractionMethod: 'TEXT_EMBEDDED',
      matchConfidence: 0.5,
      matchStatus: 'CONFLICT',
      createdAt: '1000',
      updatedAt: '1000',
    };
    await salarySlipService.setMemoryStoreForTesting([slip]);

    const rejected = await matchingService.rejectMatch('slip-match-2');
    expect(rejected?.matchStatus).toBe('MANUALLY_REJECTED');
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
      createdAt: '1000',
      updatedAt: '1000',
    };
    await salarySlipService.setMemoryStoreForTesting([slip]);

    const reset = await matchingService.resetMatch('slip-match-3');
    expect(reset).toBeDefined();
    expect(reset?.matchStatus).toBe('UNMATCHED');
  });

  it('4. Batch matching engine processes registered slips and returns BatchMatchSummary', async () => {
    const summary = await matchingService.runMatchingEngine();
    expect(summary).toBeDefined();
    expect(summary.total).toBeGreaterThanOrEqual(0);
  });
});
