import { describe, it, expect, beforeEach } from 'vitest';
import { salarySlipService } from '../../../src/services/salarySlipService';
import { SalarySlip } from '../../../src/types/salarySlip';

describe('Phase 3 Final Fix — PDF Identifier Extraction & Status Verification', () => {
  beforeEach(async () => {
    await salarySlipService.setMemoryStoreForTesting([]);
  });

  it('1. Classifies as IDENTIFIED when Employee ID is successfully extracted', async () => {
    const slip: SalarySlip = {
      id: 'slip-1',
      filePath: '/path/emp001.pdf',
      fileName: 'emp001.pdf',
      fileHash: 'hash-emp-1',
      detectedEmployeeId: 'EMP1024',
      extractionMethod: 'NOT_IDENTIFIED',
      matchConfidence: 0.0,
      matchStatus: 'UNMATCHED',
      createdAt: '1000',
      updatedAt: '1000',
    };
    await salarySlipService.setMemoryStoreForTesting([slip]);

    const updated = await salarySlipService.extractSalarySlipText('slip-1');
    expect(updated?.matchStatus).toBe('IDENTIFIED');
    expect(updated?.extractionMethod).toBe('TEXT_EMBEDDED');
    expect(updated?.detectedEmployeeId).toBe('EMP1024');
  });

  it('2. Classifies as IDENTIFIED when Employee Code label is extracted', async () => {
    const slip: SalarySlip = {
      id: 'slip-2',
      filePath: '/path/emp002.pdf',
      fileName: 'emp002.pdf',
      fileHash: 'hash-emp-2',
      detectedEmployeeId: '5042',
      extractionMethod: 'NOT_IDENTIFIED',
      matchConfidence: 0.0,
      matchStatus: 'UNMATCHED',
      createdAt: '1000',
      updatedAt: '1000',
    };
    await salarySlipService.setMemoryStoreForTesting([slip]);

    const updated = await salarySlipService.extractSalarySlipText('slip-2');
    expect(updated?.matchStatus).toBe('IDENTIFIED');
    expect(updated?.detectedEmployeeId).toBe('5042');
  });

  it('3. Classifies as IDENTIFIED when Employee Number label is extracted', async () => {
    const slip: SalarySlip = {
      id: 'slip-3',
      filePath: '/path/emp003.pdf',
      fileName: 'emp003.pdf',
      fileHash: 'hash-emp-3',
      detectedEmployeeId: 'EMP-9088',
      extractionMethod: 'NOT_IDENTIFIED',
      matchConfidence: 0.0,
      matchStatus: 'UNMATCHED',
      createdAt: '1000',
      updatedAt: '1000',
    };
    await salarySlipService.setMemoryStoreForTesting([slip]);

    const updated = await salarySlipService.extractSalarySlipText('slip-3');
    expect(updated?.matchStatus).toBe('IDENTIFIED');
  });

  it('4. Classifies as IDENTIFIED when Multiline Employee ID is extracted', async () => {
    const slip: SalarySlip = {
      id: 'slip-4',
      filePath: '/path/emp004.pdf',
      fileName: 'emp004.pdf',
      fileHash: 'hash-emp-4',
      detectedEmployeeId: 'EMP999',
      extractionMethod: 'NOT_IDENTIFIED',
      matchConfidence: 0.0,
      matchStatus: 'UNMATCHED',
      createdAt: '1000',
      updatedAt: '1000',
    };
    await salarySlipService.setMemoryStoreForTesting([slip]);

    const updated = await salarySlipService.extractSalarySlipText('slip-4');
    expect(updated?.matchStatus).toBe('IDENTIFIED');
  });

  it('5. Classifies as PARTIALLY_IDENTIFIED when only Employee Name is extracted', async () => {
    const slip: SalarySlip = {
      id: 'slip-5',
      filePath: '/path/emp005.pdf',
      fileName: 'emp005.pdf',
      fileHash: 'hash-emp-5',
      detectedName: 'Rahul Sharma',
      extractionMethod: 'NOT_IDENTIFIED',
      matchConfidence: 0.0,
      matchStatus: 'UNMATCHED',
      createdAt: '1000',
      updatedAt: '1000',
    };
    await salarySlipService.setMemoryStoreForTesting([slip]);

    const updated = await salarySlipService.extractSalarySlipText('slip-5');
    expect(updated?.matchStatus).toBe('PARTIALLY_IDENTIFIED');
    expect(updated?.detectedName).toBe('Rahul Sharma');
    expect(updated?.detectedEmployeeId).toBeUndefined();
  });

  it('6. Classifies as PARTIALLY_IDENTIFIED when only Email is extracted', async () => {
    const slip: SalarySlip = {
      id: 'slip-6',
      filePath: '/path/emp006.pdf',
      fileName: 'emp006.pdf',
      fileHash: 'hash-emp-6',
      detectedEmail: 'rahul@example.com',
      extractionMethod: 'NOT_IDENTIFIED',
      matchConfidence: 0.0,
      matchStatus: 'UNMATCHED',
      createdAt: '1000',
      updatedAt: '1000',
    };
    await salarySlipService.setMemoryStoreForTesting([slip]);

    const updated = await salarySlipService.extractSalarySlipText('slip-6');
    expect(updated?.matchStatus).toBe('PARTIALLY_IDENTIFIED');
    expect(updated?.detectedEmail).toBe('rahul@example.com');
  });

  it('7. Classifies as PARTIALLY_IDENTIFIED when Phone is extracted without Employee ID', async () => {
    const slip: SalarySlip = {
      id: 'slip-7',
      filePath: '/path/emp007.pdf',
      fileName: 'emp007.pdf',
      fileHash: 'hash-emp-7',
      detectedPhone: '+91 9876543210',
      extractionMethod: 'NOT_IDENTIFIED',
      matchConfidence: 0.0,
      matchStatus: 'UNMATCHED',
      createdAt: '1000',
      updatedAt: '1000',
    };
    await salarySlipService.setMemoryStoreForTesting([slip]);

    const updated = await salarySlipService.extractSalarySlipText('slip-7');
    expect(updated?.matchStatus).toBe('PARTIALLY_IDENTIFIED');
    expect(updated?.detectedPhone).toBe('+91 9876543210');
  });

  it('8. Extracts Employee ID, Name, Email, and Phone together', async () => {
    const slip: SalarySlip = {
      id: 'slip-8',
      filePath: '/path/emp008.pdf',
      fileName: 'emp008.pdf',
      fileHash: 'hash-emp-8',
      detectedEmployeeId: 'EMP-8842',
      detectedName: 'Priya Patel',
      detectedEmail: 'priya@example.com',
      detectedPhone: '+91 9123456789',
      extractionMethod: 'NOT_IDENTIFIED',
      matchConfidence: 0.0,
      matchStatus: 'UNMATCHED',
      createdAt: '1000',
      updatedAt: '1000',
    };
    await salarySlipService.setMemoryStoreForTesting([slip]);

    const updated = await salarySlipService.extractSalarySlipText('slip-8');
    expect(updated?.matchStatus).toBe('IDENTIFIED');
    expect(updated?.detectedEmployeeId).toBe('EMP-8842');
    expect(updated?.detectedName).toBe('Priya Patel');
    expect(updated?.detectedEmail).toBe('priya@example.com');
    expect(updated?.detectedPhone).toBe('+91 9123456789');
  });

  it('9. Classifies as NOT_IDENTIFIED when no identifiers exist in extracted text', async () => {
    const slip: SalarySlip = {
      id: 'slip-9',
      filePath: '/path/emp009.pdf',
      fileName: 'emp009.pdf',
      fileHash: 'hash-emp-9',
      extractionMethod: 'NOT_IDENTIFIED',
      matchConfidence: 0.0,
      matchStatus: 'UNMATCHED',
      createdAt: '1000',
      updatedAt: '1000',
    };
    await salarySlipService.setMemoryStoreForTesting([slip]);

    const updated = await salarySlipService.extractSalarySlipText('slip-9');
    expect(updated?.matchStatus).toBe('NOT_IDENTIFIED');
  });

  it('10. Preserves DUPLICATE_CONTENT status from Phase 2 during text extraction', async () => {
    const slip: SalarySlip = {
      id: 'slip-dup',
      filePath: '/path/dup.pdf',
      fileName: 'dup.pdf',
      fileHash: 'hash-dup',
      detectedEmployeeId: 'EMP-DUP',
      extractionMethod: 'NOT_IDENTIFIED',
      matchConfidence: 0.0,
      matchStatus: 'DUPLICATE_CONTENT',
      duplicateOfId: 'slip-canonical',
      createdAt: '1000',
      updatedAt: '1000',
    };
    await salarySlipService.setMemoryStoreForTesting([slip]);

    const updated = await salarySlipService.extractSalarySlipText('slip-dup');
    expect(updated?.matchStatus).toBe('DUPLICATE_CONTENT');
    expect(updated?.duplicateOfId).toBe('slip-canonical');
  });

  it('11. Bulk extraction returns complete ExtractionSummary', async () => {
    const slips: SalarySlip[] = [
      { id: '1', filePath: '/p1.pdf', fileName: '1.pdf', fileHash: 'h1', detectedEmployeeId: 'E1', extractionMethod: 'NOT_IDENTIFIED', matchConfidence: 0, matchStatus: 'IDENTIFIED', createdAt: '1', updatedAt: '1' },
      { id: '2', filePath: '/p2.pdf', fileName: '2.pdf', fileHash: 'h2', detectedName: 'N2', extractionMethod: 'NOT_IDENTIFIED', matchConfidence: 0, matchStatus: 'PARTIALLY_IDENTIFIED', createdAt: '1', updatedAt: '1' },
    ];
    await salarySlipService.setMemoryStoreForTesting(slips);

    const summary = await salarySlipService.extractAllSalarySlips();
    expect(summary.total).toBe(2);
    expect(summary.processed).toBe(2);
    expect(summary.identified).toBe(1);
    expect(summary.partiallyIdentified).toBe(1);
  });
});
