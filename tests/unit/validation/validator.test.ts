import { describe, it, expect } from 'vitest';
import { isValidEmail, isValidPhone, normalizeEmployeeId, normalizeName } from '../../../src/utils/validation/validator';

describe('Validation Utilities', () => {
  it('should correctly validate email addresses', () => {
    expect(isValidEmail('test@example.com')).toBe(true);
    expect(isValidEmail('invalid-email')).toBe(false);
    expect(isValidEmail('')).toBe(false);
  });

  it('should correctly validate phone numbers', () => {
    expect(isValidPhone('+12345678901')).toBe(true);
    expect(isValidPhone('123-456-7890')).toBe(true);
    expect(isValidPhone('abc')).toBe(false);
  });

  it('should normalize employee IDs', () => {
    expect(normalizeEmployeeId(' emp-001 ')).toBe('EMP001');
    expect(normalizeEmployeeId('emp#123')).toBe('EMP123');
  });

  it('should normalize names', () => {
    expect(normalizeName('  John   Doe  ')).toBe('john doe');
  });
});
