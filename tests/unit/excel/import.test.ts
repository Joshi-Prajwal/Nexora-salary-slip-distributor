import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import { parseExcelWorkbook } from '../../../src/features/employee-import/excelReader';
import { mapHeaders, validateImportRows, isValidEmail, normalizeHeader } from '../../../src/features/employee-import/importValidator';
import { employeeService } from '../../../src/services/employeeService';

function createBuffer(data: any[][]): ArrayBuffer {
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Employees');
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
}

describe('Phase 1 — Excel Employee Import Module', () => {
  beforeEach(async () => {
    await employeeService.clearAllEmployees();
  });

  it('1. Parses a valid Excel workbook correctly', async () => {
    const buf = createBuffer([
      ['Employee ID', 'Full Name', 'Email Address', 'Phone Number', 'Department'],
      ['EMP001', 'Test Employee 1', 'emp1@example.com', '9876543210', 'Engineering'],
      ['EMP002', 'Test Employee 2', 'emp2@example.com', '9876543211', 'HR'],
    ]);

    const summary = await parseExcelWorkbook(buf);
    expect(summary.totalRows).toBe(2);
    expect(summary.readyCount).toBe(2);
    expect(summary.needsAttentionCount).toBe(0);
    expect(summary.rows[0].data.employeeId).toBe('EMP001');
    expect(summary.rows[0].data.fullName).toBe('Test Employee 1');
  });

  it('2. Blocks import when Employee ID column is missing', async () => {
    const buf = createBuffer([
      ['Full Name', 'Email Address', 'Phone Number'],
      ['Test Employee', 'emp1@example.com', '9876543210'],
    ]);

    const summary = await parseExcelWorkbook(buf);
    expect(summary.missingRequiredColumns).toContain('Employee ID');
    expect(summary.readyCount).toBe(0);
  });

  it('3. Blocks import when Full Name column is missing', async () => {
    const buf = createBuffer([
      ['Employee ID', 'Email Address'],
      ['EMP001', 'emp1@example.com'],
    ]);

    const summary = await parseExcelWorkbook(buf);
    expect(summary.missingRequiredColumns).toContain('Full Name');
    expect(summary.readyCount).toBe(0);
  });

  it('4. Blocks import when Email column is missing', async () => {
    const buf = createBuffer([
      ['Employee ID', 'Full Name'],
      ['EMP001', 'Test Employee'],
    ]);

    const summary = await parseExcelWorkbook(buf);
    expect(summary.missingRequiredColumns).toContain('Email Address');
    expect(summary.readyCount).toBe(0);
  });

  it('5. Marks rows with invalid email formats for attention', async () => {
    const buf = createBuffer([
      ['Employee ID', 'Full Name', 'Email Address'],
      ['EMP001', 'Valid Email', 'valid@example.com'],
      ['EMP002', 'Invalid Email', 'invalid-email-address'],
    ]);

    const summary = await parseExcelWorkbook(buf);
    expect(summary.readyCount).toBe(1);
    expect(summary.needsAttentionCount).toBe(1);
    expect(summary.rows[1].errors).toContain('Email address is invalid.');
  });

  it('6. Throws user-friendly error on empty workbook or sheet', async () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([]);
    XLSX.utils.book_append_sheet(wb, ws, 'EmptySheet');
    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });

    await expect(parseExcelWorkbook(buf)).rejects.toThrow(
      'No employee data was found in this Excel file.'
    );
  });

  it('7. Detects duplicate Employee IDs within the spreadsheet file', async () => {
    const buf = createBuffer([
      ['Employee ID', 'Full Name', 'Email Address'],
      ['EMP001', 'First Copy', 'first@example.com'],
      ['EMP001', 'Second Copy', 'second@example.com'],
    ]);

    const summary = await parseExcelWorkbook(buf);
    expect(summary.rows[0].errors).toContain('Employee ID already appears in this file.');
    expect(summary.rows[1].errors).toContain('Employee ID already appears in this file.');
    expect(summary.needsAttentionCount).toBe(2);
  });

  it('8. Identifies existing employees in database as ALREADY_IMPORTED', async () => {
    const buf = createBuffer([
      ['Employee ID', 'Full Name', 'Email Address'],
      ['EMP001', 'Test Employee 1', 'emp1@example.com'],
      ['EMP002', 'Test Employee 2', 'emp2@example.com'],
    ]);

    const existingEmployeeIds = new Set(['emp001']);
    const summary = await parseExcelWorkbook(buf, { existingEmployeeIds });

    expect(summary.readyCount).toBe(1);
    expect(summary.alreadyImportedCount).toBe(1);
    expect(summary.rows[0].status).toBe('ALREADY_IMPORTED');
  });

  it('9. Resolves header aliases deterministically', () => {
    const rawHeaders = ['Emp Code', 'Name', 'Email Id', 'Mobile Number', 'Dept'];
    const { mapped, missingRequired } = mapHeaders(rawHeaders);

    expect(missingRequired).toHaveLength(0);
    expect(mapped['Emp Code']).toBe('employeeId');
    expect(mapped['Name']).toBe('fullName');
    expect(mapped['Email Id']).toBe('email');
    expect(mapped['Mobile Number']).toBe('phone');
    expect(mapped['Dept']).toBe('department');
  });

  it('10. Normalizes header whitespace and letter case', () => {
    const h1 = normalizeHeader('  EMPLOYEE  ID  ');
    const h2 = normalizeHeader('employee id');
    expect(h1).toBe(h2);
  });

  it('11. Allows optional fields (phone/department) to be missing with warnings', async () => {
    const buf = createBuffer([
      ['Employee ID', 'Full Name', 'Email Address'],
      ['EMP001', 'Test Employee 1', 'emp1@example.com'],
    ]);

    const summary = await parseExcelWorkbook(buf);
    expect(summary.readyCount).toBe(1);
    expect(summary.rows[0].warnings).toContain('Phone number is missing.');
    expect(summary.rows[0].warnings).toContain('Department is missing.');
  });

  it('12. Persists imported employees into local storage repository', async () => {
    const inputs = [
      {
        employeeId: 'EMP001',
        name: 'Test Employee 1',
        email: 'emp1@example.com',
        phone: '9876543210',
        whatsappNumber: '9876543210',
        department: 'Engineering',
        designation: '',
      },
    ];

    const result = await employeeService.importEmployeesFromExcel(inputs);
    expect(result.success).toBe(true);
    expect(result.importedCount).toBe(1);

    const stored = await employeeService.getAllEmployees();
    expect(stored).toHaveLength(1);
    expect(stored[0].employeeId).toBe('EMP001');
  });

  it('13. Validates basic email validation function', () => {
    expect(isValidEmail('employee@example.com')).toBe(true);
    expect(isValidEmail('employee@sub.example.co.uk')).toBe(true);
    expect(isValidEmail('invalid-email')).toBe(false);
    expect(isValidEmail('@example.com')).toBe(false);
    expect(isValidEmail('employee@')).toBe(false);
  });
});
