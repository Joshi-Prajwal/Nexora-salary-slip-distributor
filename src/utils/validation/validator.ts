/**
 * Validation utilities for Employee records and system inputs
 */

export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

export function isValidPhone(phone: string): boolean {
  if (!phone || typeof phone !== 'string') return false;
  // Basic validation: must contain digits, optional leading +
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  return /^\+?[0-9]{8,15}$/.test(cleaned);
}

export function normalizeEmployeeId(employeeId: string): string {
  if (!employeeId) return '';
  return employeeId.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function normalizeName(name: string): string {
  if (!name) return '';
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}
