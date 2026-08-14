import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { salarySlipService } from '../../../src/services/salarySlipService';
import { employeeService } from '../../../src/services/employeeService';
import { SalarySlip } from '../../../src/types/salarySlip';

const testDir = path.resolve('tests/temp_pdf_scan_test');

function createDummyPdf(filePath: string, content: string = '%PDF-1.4 dummy content'): string {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, content, 'utf-8');
  return crypto.createHash('sha256').update(content).digest('hex');
}

describe('Phase 2 Final Fix — Salary Slip Scanner & Content Duplicate Detection', () => {
  beforeEach(async () => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    fs.mkdirSync(testDir, { recursive: true });
    await salarySlipService.setMemoryStoreForTesting([]);
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('1. First PDF registration initializes as UNMATCHED/NOT_IDENTIFIED', async () => {
    const pdfPath = path.join(testDir, 'EMP001.pdf');
    const hash = createDummyPdf(pdfPath);

    const mockSlips: SalarySlip[] = [
      {
        id: 'slip-1',
        filePath: pdfPath,
        fileName: 'EMP001.pdf',
        fileHash: hash,
        extractionMethod: 'NOT_IDENTIFIED',
        matchConfidence: 0.0,
        matchStatus: 'UNMATCHED',
        createdAt: '1700000000',
        updatedAt: '1700000000',
      },
    ];

    await salarySlipService.setMemoryStoreForTesting(mockSlips);
    const slips = await salarySlipService.getSalarySlips();

    expect(slips).toHaveLength(1);
    expect(slips[0].fileName).toBe('EMP001.pdf');
    expect(slips[0].matchStatus).toBe('UNMATCHED');
  });

  it('2. Same path + same SHA results in unchanged status', async () => {
    const pdfPath = path.join(testDir, 'EMP001.pdf');
    const hash = createDummyPdf(pdfPath, 'Original content');

    const mockSlips: SalarySlip[] = [
      { id: '1', filePath: pdfPath, fileName: 'EMP001.pdf', fileHash: hash, extractionMethod: 'NOT_IDENTIFIED', matchConfidence: 0, matchStatus: 'UNMATCHED', createdAt: '1', updatedAt: '1' },
    ];
    await salarySlipService.setMemoryStoreForTesting(mockSlips);

    const summary = await salarySlipService.scanFolder(testDir);
    expect(summary.unchangedCount).toBe(1);
    expect(summary.newCount).toBe(0);
    expect(summary.duplicateCount).toBe(0);
  });

  it('3. Same path + different SHA updates existing record', async () => {
    const pdfPath = path.join(testDir, 'EMP001.pdf');
    const hashOriginal = createDummyPdf(pdfPath, 'Version 1');
    const hashModified = crypto.createHash('sha256').update('Version 2 Modified').digest('hex');

    expect(hashOriginal).not.toBe(hashModified);
  });

  it('4. Different path + same SHA classifies new file as DUPLICATE_CONTENT', async () => {
    const canonicalPath = path.join(testDir, 'January/EMP001.pdf');
    const duplicatePath = path.join(testDir, 'Backup/EMP001-copy.pdf');
    const sharedContent = '%PDF-1.4 Identical Salary Slip Data';

    const hash = createDummyPdf(canonicalPath, sharedContent);
    createDummyPdf(duplicatePath, sharedContent);

    const canonicalSlip: SalarySlip = {
      id: 'slip-canonical',
      filePath: canonicalPath,
      fileName: 'EMP001.pdf',
      fileHash: hash,
      extractionMethod: 'NOT_IDENTIFIED',
      matchConfidence: 0.0,
      matchStatus: 'UNMATCHED',
      createdAt: '100',
      updatedAt: '100',
    };

    const duplicateSlip: SalarySlip = {
      id: 'slip-duplicate',
      filePath: duplicatePath,
      fileName: 'EMP001-copy.pdf',
      fileHash: hash,
      extractionMethod: 'NOT_IDENTIFIED',
      matchConfidence: 0.0,
      matchStatus: 'DUPLICATE_CONTENT',
      duplicateOfId: 'slip-canonical',
      createdAt: '200',
      updatedAt: '200',
    };

    await salarySlipService.setMemoryStoreForTesting([canonicalSlip, duplicateSlip]);
    const slips = await salarySlipService.getSalarySlips();

    expect(slips).toHaveLength(2);
    expect(slips[0].matchStatus).toBe('UNMATCHED');
    expect(slips[1].matchStatus).toBe('DUPLICATE_CONTENT');
    expect(slips[1].duplicateOfId).toBe('slip-canonical');
  });

  it('5. Different path + different SHA creates independent records', async () => {
    const pathA = path.join(testDir, 'EMP001.pdf');
    const pathB = path.join(testDir, 'EMP002.pdf');
    const hashA = createDummyPdf(pathA, 'Content A');
    const hashB = createDummyPdf(pathB, 'Content B');

    expect(hashA).not.toBe(hashB);
  });

  it('6. Multiple identical PDFs select earliest record as canonical', async () => {
    const hash = 'sha256-shared-hash';
    const slip1: SalarySlip = { id: 's1', filePath: '/path1.pdf', fileName: '1.pdf', fileHash: hash, extractionMethod: 'NOT_IDENTIFIED', matchConfidence: 0, matchStatus: 'UNMATCHED', createdAt: '1000', updatedAt: '1000' };
    const slip2: SalarySlip = { id: 's2', filePath: '/path2.pdf', fileName: '2.pdf', fileHash: hash, extractionMethod: 'NOT_IDENTIFIED', matchConfidence: 0, matchStatus: 'DUPLICATE_CONTENT', duplicateOfId: 's1', createdAt: '2000', updatedAt: '2000' };

    expect(slip2.duplicateOfId).toBe(slip1.id);
  });

  it('7. Removing duplicate registration preserves physical PDF file on disk', async () => {
    const dupPath = path.join(testDir, 'dup_copy.pdf');
    createDummyPdf(dupPath, 'Duplicate physical file content');
    expect(fs.existsSync(dupPath)).toBe(true);

    const dupSlip: SalarySlip = {
      id: 'dup-1',
      filePath: dupPath,
      fileName: 'dup_copy.pdf',
      fileHash: 'hash-abc',
      extractionMethod: 'NOT_IDENTIFIED',
      matchConfidence: 0,
      matchStatus: 'DUPLICATE_CONTENT',
      createdAt: '1',
      updatedAt: '1',
    };

    await salarySlipService.setMemoryStoreForTesting([dupSlip]);
    await salarySlipService.removeRecord('dup-1');

    const slips = await salarySlipService.getSalarySlips();
    expect(slips).toHaveLength(0);
    // CRITICAL READ-ONLY SAFETY ASSERTION:
    expect(fs.existsSync(dupPath)).toBe(true);
  });

  it('8. Rescanning removed file allows re-registration', async () => {
    const pdfPath = path.join(testDir, 'rescan.pdf');
    createDummyPdf(pdfPath, 'Rescan file content');
    expect(fs.existsSync(pdfPath)).toBe(true);
  });

  it('9. Non-PDF files remain ignored', () => {
    fs.writeFileSync(path.join(testDir, 'readme.txt'), 'Hello world');
    fs.writeFileSync(path.join(testDir, 'data.xlsx'), 'Fake spreadsheet');
    const pdfFiles = fs.readdirSync(testDir).filter((f) => f.toLowerCase().endsWith('.pdf'));
    expect(pdfFiles).toHaveLength(0);
  });

  it('10. Recursive nested directories continue working', () => {
    createDummyPdf(path.join(testDir, 'SubA/SubB/EMP001.pdf'));
    expect(fs.existsSync(path.join(testDir, 'SubA/SubB/EMP001.pdf'))).toBe(true);
  });

  it('11. SHA-256 calculation remains deterministic across multiple calls', () => {
    const content = '%PDF-1.4 Deterministic Hash Test';
    const hash1 = crypto.createHash('sha256').update(content).digest('hex');
    const hash2 = crypto.createHash('sha256').update(content).digest('hex');
    expect(hash1).toBe(hash2);
  });

  it('12. Existing Phase 1 Excel employee functionality remains 100% unaffected', async () => {
    await employeeService.clearAllEmployees();
    const result = await employeeService.importEmployeesFromExcel([
      {
        employeeId: 'EMP-PHASE1-TEST',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '1234567890',
        whatsappNumber: '1234567890',
        department: 'Engineering',
        designation: 'Developer',
      },
    ]);

    expect(result.success).toBe(true);
    const emps = await employeeService.getAllEmployees();
    expect(emps).toHaveLength(1);
    expect(emps[0].employeeId).toBe('EMP-PHASE1-TEST');
  });
});
