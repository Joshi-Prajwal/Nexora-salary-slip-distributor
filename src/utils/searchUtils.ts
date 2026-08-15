import { SalarySlip } from '../types/salarySlip';
import { Employee } from '../types/employee';

/**
 * Normalizes phone numbers to digits only for flexible matching (e.g. +91 98765-43210 -> 9876543210)
 */
export function normalizePhoneDigits(phone?: string | null): string {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
}

/**
 * Normalizes text for case-insensitive, space/hyphen/dot agnostic search comparison
 */
export function normalizeSearchTerm(text?: string | null): string {
  if (!text) return '';
  return text.toLowerCase().trim().replace(/[\s.\-_]+/g, '');
}

/**
 * Multipurpose search matcher for a SalarySlip against a search query
 */
export function matchesSlipQuery(
  slip: SalarySlip,
  query: string,
  employees: Employee[] = []
): boolean {
  if (!query.trim()) return true;

  const rawQ = query.toLowerCase().trim();
  const normQ = normalizeSearchTerm(query);
  const digitsQ = normalizePhoneDigits(query);

  // 1. Filename match
  if (slip.fileName.toLowerCase().includes(rawQ) || normalizeSearchTerm(slip.fileName).includes(normQ)) {
    return true;
  }

  // 2. Extracted Employee ID
  if (slip.detectedEmployeeId) {
    if (
      slip.detectedEmployeeId.toLowerCase().includes(rawQ) ||
      normalizeSearchTerm(slip.detectedEmployeeId).includes(normQ)
    ) {
      return true;
    }
  }

  // 3. Extracted Name
  if (slip.detectedName) {
    if (
      slip.detectedName.toLowerCase().includes(rawQ) ||
      normalizeSearchTerm(slip.detectedName).includes(normQ)
    ) {
      return true;
    }
  }

  // 4. Extracted Email
  if (slip.detectedEmail) {
    if (
      slip.detectedEmail.toLowerCase().includes(rawQ) ||
      normalizeSearchTerm(slip.detectedEmail).includes(normQ)
    ) {
      return true;
    }
  }

  // 5. Extracted Phone
  if (slip.detectedPhone) {
    const slipPhoneDigits = normalizePhoneDigits(slip.detectedPhone);
    if (
      slip.detectedPhone.toLowerCase().includes(rawQ) ||
      (digitsQ.length >= 3 && slipPhoneDigits.includes(digitsQ))
    ) {
      return true;
    }
  }

  // 6. Matched Employee Details in Master Database
  if (slip.matchedEmployeeId && employees.length > 0) {
    const emp = employees.find((e) => e.id === slip.matchedEmployeeId || e.employeeId === slip.matchedEmployeeId);
    if (emp) {
      if (emp.name.toLowerCase().includes(rawQ) || normalizeSearchTerm(emp.name).includes(normQ)) {
        return true;
      }
      if (emp.employeeId.toLowerCase().includes(rawQ) || normalizeSearchTerm(emp.employeeId).includes(normQ)) {
        return true;
      }
      if (emp.email && (emp.email.toLowerCase().includes(rawQ) || normalizeSearchTerm(emp.email).includes(normQ))) {
        return true;
      }
      if (emp.phone) {
        const empPhoneDigits = normalizePhoneDigits(emp.phone);
        if (emp.phone.toLowerCase().includes(rawQ) || (digitsQ.length >= 3 && empPhoneDigits.includes(digitsQ))) {
          return true;
        }
      }
    }
  }

  return false;
}
