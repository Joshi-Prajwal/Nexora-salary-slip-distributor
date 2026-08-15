import { describe, it, expect, beforeEach } from 'vitest';
import { salarySlipService } from '../../../src/services/salarySlipService';
import { SalarySlip } from '../../../src/types/salarySlip';
import { matchesSlipQuery } from '../../../src/utils/searchUtils';

describe('Salary Slips UI Bug Fix & Safe Bulk Remove Feature Unit Tests', () => {
  const mockSlips: SalarySlip[] = [
    {
      id: 'slip-101',
      filePath: 'C:\\SalarySlips\\101-Ashwini.pdf',
      fileName: '101-Ashwini.pdf',
      fileHash: 'hash-101',
      detectedEmployeeId: '101',
      detectedName: 'Ashwini Kulkarni',
      extractionMethod: 'TEXT_EMBEDDED',
      matchConfidence: 1.0,
      matchStatus: 'EXACT_MATCH',
      approvalStatus: 'APPROVED',
      ocrStatus: 'NOT_REQUIRED',
      createdAt: '1000',
      updatedAt: '1000',
    },
    {
      id: 'slip-102',
      filePath: 'C:\\SalarySlips\\102-Mahesh.pdf',
      fileName: '102-Mahesh.pdf',
      fileHash: 'hash-102',
      detectedEmployeeId: '102',
      detectedName: 'Mahesh Naik',
      extractionMethod: 'TEXT_EMBEDDED',
      matchConfidence: 1.0,
      matchStatus: 'EXACT_MATCH',
      approvalStatus: 'APPROVED',
      ocrStatus: 'NOT_REQUIRED',
      createdAt: '1000',
      updatedAt: '1000',
    },
    {
      id: 'slip-103',
      filePath: 'C:\\SalarySlips\\103-DrSingh.pdf',
      fileName: '103-DrSingh.pdf',
      fileHash: 'hash-103',
      detectedEmployeeId: '103',
      detectedName: 'Dr L B Singh',
      extractionMethod: 'TEXT_EMBEDDED',
      matchConfidence: 1.0,
      matchStatus: 'EXACT_MATCH',
      approvalStatus: 'PENDING',
      ocrStatus: 'NOT_REQUIRED',
      createdAt: '1000',
      updatedAt: '1000',
    },
  ];

  beforeEach(async () => {
    await salarySlipService.setMemoryStoreForTesting([...mockSlips]);
  });

  it('1. Search placeholder & input normalization operates on employee name and ID', () => {
    expect(matchesSlipQuery(mockSlips[0], 'Ashwini')).toBe(true);
    expect(matchesSlipQuery(mockSlips[0], '101')).toBe(true);
    expect(matchesSlipQuery(mockSlips[0], 'Mahesh')).toBe(false);
  });

  it('2. Search filtering is purely in-memory and does not alter store size', async () => {
    const initialSlips = await salarySlipService.getSalarySlips();
    expect(initialSlips.length).toBe(3);

    const filtered = initialSlips.filter((s) => matchesSlipQuery(s, 'Ashwini'));
    expect(filtered.length).toBe(1);

    const slipsAfterSearch = await salarySlipService.getSalarySlips();
    expect(slipsAfterSearch.length).toBe(3);
  });

  it('3. Single salary slip removal removes only the specified record', async () => {
    const success = await salarySlipService.removeRecord('slip-101');
    expect(success).toBe(true);

    const remaining = await salarySlipService.getSalarySlips();
    expect(remaining.length).toBe(2);
    expect(remaining.map((s) => s.id)).toEqual(['slip-102', 'slip-103']);
  });

  it('4. Bulk removal removes multiple specified IDs safely', async () => {
    const removedCount = await salarySlipService.removeRecordsBatch(['slip-101', 'slip-103']);
    expect(removedCount).toBe(2);

    const remaining = await salarySlipService.getSalarySlips();
    expect(remaining.length).toBe(1);
    expect(remaining[0].id).toBe('slip-102');
  });

  it('5. Removing non-existent IDs does not throw errors or alter existing database records', async () => {
    const removedCount = await salarySlipService.removeRecordsBatch(['non-existent-id']);
    expect(removedCount).toBe(0);

    const remaining = await salarySlipService.getSalarySlips();
    expect(remaining.length).toBe(3);
  });

  it('6. Remove All Filtered correctly removes only filtered IDs leaving unrelated records intact', async () => {
    const slips = await salarySlipService.getSalarySlips();
    const filteredSlips = slips.filter((s) => matchesSlipQuery(s, 'Mahesh'));
    expect(filteredSlips.length).toBe(1);

    const removedCount = await salarySlipService.removeRecordsBatch(filteredSlips.map((s) => s.id));
    expect(removedCount).toBe(1);

    const remaining = await salarySlipService.getSalarySlips();
    expect(remaining.length).toBe(2);
    expect(remaining.map((s) => s.id)).toEqual(['slip-101', 'slip-103']);
  });
});
