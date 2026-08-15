import { describe, it, expect } from 'vitest';
import { matchesSlipQuery, normalizePhoneDigits, normalizeSearchTerm } from '../../../src/utils/searchUtils';
import { SalarySlip } from '../../../src/types/salarySlip';
import { Employee } from '../../../src/types/employee';

describe('Feature 1 — Multipurpose Search & Filtering Engine Unit Tests', () => {
  const mockEmployees: Employee[] = [
    {
      id: 'emp-101',
      employeeId: '111',
      name: 'Ashwini R Kulkarni',
      email: 'ashwinikulkarni@gmail.com',
      phone: '+91 98765 43210',
      whatsappNumber: '+91 98765 43210',
      department: 'Engineering',
      designation: 'Architect',
      createdAt: '1000',
      updatedAt: '1000',
    },
    {
      id: 'emp-203',
      employeeId: '203',
      name: 'Dr L B Singh',
      email: 'lbsingh@company.com',
      phone: '8888899999',
      whatsappNumber: '8888899999',
      department: 'Medical',
      designation: 'Doctor',
      createdAt: '1000',
      updatedAt: '1000',
    },
  ];

  const mockSlip: SalarySlip = {
    id: 'slip-111',
    filePath: 'C:\\SalarySlips\\111-Ashwini R Kulkarni.pdf',
    fileName: '111-Ashwini R Kulkarni.pdf',
    fileHash: 'hash-111',
    detectedEmployeeId: '111',
    detectedName: 'Ashwini R Kulkarni',
    detectedEmail: 'ashwinikulkarni@gmail.com',
    detectedPhone: '+91 98765 43210',
    matchedEmployeeId: 'emp-101',
    extractionMethod: 'TEXT_EMBEDDED',
    matchConfidence: 1.0,
    matchStatus: 'EXACT_MATCH',
    approvalStatus: 'PENDING',
    ocrStatus: 'NOT_REQUIRED',
    createdAt: '1000',
    updatedAt: '1000',
  };

  it('1. Phone digit normalization strips spaces, hyphens, and country codes correctly', () => {
    expect(normalizePhoneDigits('+91 98765-43210')).toBe('919876543210');
    expect(normalizePhoneDigits('98765 43210')).toBe('9876543210');
    expect(normalizePhoneDigits('')).toBe('');
  });

  it('2. Search term normalization ignores case, spaces, and punctuation', () => {
    expect(normalizeSearchTerm('Ashwini R. Kulkarni')).toBe('ashwinirkulkarni');
    expect(normalizeSearchTerm('111-Ashwini')).toBe('111ashwini');
  });

  it('3. Matches search by partial name (case insensitive)', () => {
    expect(matchesSlipQuery(mockSlip, 'ashwini', mockEmployees)).toBe(true);
    expect(matchesSlipQuery(mockSlip, 'KULKARNI', mockEmployees)).toBe(true);
  });

  it('4. Matches search by Employee ID and Filename', () => {
    expect(matchesSlipQuery(mockSlip, '111', mockEmployees)).toBe(true);
    expect(matchesSlipQuery(mockSlip, '111-Ashwini R Kulkarni.pdf', mockEmployees)).toBe(true);
  });

  it('5. Matches search by Email regardless of casing', () => {
    expect(matchesSlipQuery(mockSlip, 'ASHWINIKULKARNI@GMAIL.COM', mockEmployees)).toBe(true);
  });

  it('6. Matches search by Phone number across multiple formatting styles', () => {
    expect(matchesSlipQuery(mockSlip, '9876543210', mockEmployees)).toBe(true);
    expect(matchesSlipQuery(mockSlip, '+91 98765', mockEmployees)).toBe(true);
    expect(matchesSlipQuery(mockSlip, '98765-43210', mockEmployees)).toBe(true);
  });

  it('7. Returns false when query does not match any slip fields', () => {
    expect(matchesSlipQuery(mockSlip, 'NonExistentName', mockEmployees)).toBe(false);
    expect(matchesSlipQuery(mockSlip, '9999999999', mockEmployees)).toBe(false);
  });

  it('8. Empty search query matches everything', () => {
    expect(matchesSlipQuery(mockSlip, '', mockEmployees)).toBe(true);
    expect(matchesSlipQuery(mockSlip, '   ', mockEmployees)).toBe(true);
  });
});
