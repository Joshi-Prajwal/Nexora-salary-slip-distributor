import {
  EmployeeImportRow,
  EmployeeImportRowResult,
  EmployeeImportSummary,
  ImportRowStatus,
} from './importTypes';

const HEADER_ALIASES: Record<keyof Omit<EmployeeImportRow, 'rowIndex' | 'designation'>, string[]> = {
  employeeId: ['employee id', 'employeeid', 'employee code', 'emp code', 'employee code id', 'id', 'emp id', 'empid'],
  fullName: ['full name', 'name', 'employee name', 'employee full name', 'fullname'],
  email: ['email', 'email address', 'email id', 'emailaddress'],
  phone: ['phone', 'phone number', 'mobile', 'mobile number', 'contact number', 'phonenumber', 'contact'],
  department: ['department', 'dept'],
};

/**
 * Normalizes a header string for case-insensitive, whitespace-trimmed comparison.
 */
export function normalizeHeader(header: string): string {
  return (header || '').toString().toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Maps raw spreadsheet headers to logical employee data fields.
 */
export function mapHeaders(rawHeaders: string[]): {
  mapped: Record<string, keyof Omit<EmployeeImportRow, 'rowIndex' | 'designation'>>;
  missingRequired: string[];
} {
  const mapped: Record<string, keyof Omit<EmployeeImportRow, 'rowIndex' | 'designation'>> = {};
  const foundFields = new Set<string>();

  for (const rawHeader of rawHeaders) {
    const normalized = normalizeHeader(rawHeader);
    for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
      if (aliases.includes(normalized) && !foundFields.has(field)) {
        mapped[rawHeader] = field as keyof Omit<EmployeeImportRow, 'rowIndex' | 'designation'>;
        foundFields.add(field);
        break;
      }
    }
  }

  const missingRequired: string[] = [];
  if (!foundFields.has('employeeId')) missingRequired.push('Employee ID');
  if (!foundFields.has('fullName')) missingRequired.push('Full Name');
  if (!foundFields.has('email')) missingRequired.push('Email Address');

  return { mapped, missingRequired };
}

/**
 * Basic practical email validation regex.
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(trimmed);
}

/**
 * Parses and validates raw spreadsheet rows against Nexora validation rules.
 */
export function validateImportRows(
  rawRows: Record<string, any>[],
  headerMapping: Record<string, keyof Omit<EmployeeImportRow, 'rowIndex' | 'designation'>>,
  existingEmployeeIds: Set<string> = new Set()
): EmployeeImportSummary {
  const results: EmployeeImportRowResult[] = [];
  const seenFileEmployeeIds = new Set<string>();
  const duplicateFileEmployeeIds = new Set<string>();

  // Pass 1: Identify duplicates within the file
  for (const row of rawRows) {
    let empId = '';
    for (const [rawHeader, field] of Object.entries(headerMapping)) {
      if (field === 'employeeId' && row[rawHeader] !== undefined && row[rawHeader] !== null) {
        empId = String(row[rawHeader]).trim();
        break;
      }
    }
    if (empId) {
      if (seenFileEmployeeIds.has(empId.toLowerCase())) {
        duplicateFileEmployeeIds.add(empId.toLowerCase());
      } else {
        seenFileEmployeeIds.add(empId.toLowerCase());
      }
    }
  }

  let readyCount = 0;
  let alreadyImportedCount = 0;
  let needsAttentionCount = 0;

  // Pass 2: Validate each row
  rawRows.forEach((row, index) => {
    const rowIndex = index + 2; // 1-based row index (accounting for header at row 1)
    const errors: string[] = [];
    const warnings: string[] = [];

    let employeeId = '';
    let fullName = '';
    let email = '';
    let phone = '';
    let department = '';

    for (const [rawHeader, field] of Object.entries(headerMapping)) {
      const val = row[rawHeader] !== undefined && row[rawHeader] !== null ? String(row[rawHeader]).trim() : '';
      if (field === 'employeeId') employeeId = val;
      if (field === 'fullName') fullName = val;
      if (field === 'email') email = val;
      if (field === 'phone') phone = val;
      if (field === 'department') department = val;
    }

    // Required Field Checks
    if (!employeeId) {
      errors.push('Employee ID is required.');
    }
    if (!fullName) {
      errors.push('Full Name is required.');
    }
    if (!email) {
      errors.push('Email address is required.');
    } else if (!isValidEmail(email)) {
      errors.push('Email address is invalid.');
    }

    // File Duplicate Check
    if (employeeId && duplicateFileEmployeeIds.has(employeeId.toLowerCase())) {
      errors.push('Employee ID already appears in this file.');
    }

    // Optional Warnings
    if (!phone) {
      warnings.push('Phone number is missing.');
    }
    if (!department) {
      warnings.push('Department is missing.');
    }

    let status: ImportRowStatus = 'READY';

    if (errors.length > 0) {
      status = 'NEEDS_ATTENTION';
      needsAttentionCount++;
    } else if (existingEmployeeIds.has(employeeId.toLowerCase())) {
      status = 'ALREADY_IMPORTED';
      alreadyImportedCount++;
    } else {
      readyCount++;
    }

    results.push({
      rowIndex,
      status,
      data: {
        rowIndex,
        employeeId,
        fullName,
        email,
        phone,
        department,
        designation: '',
      },
      errors,
      warnings,
    });
  });

  return {
    totalRows: rawRows.length,
    readyCount,
    alreadyImportedCount,
    needsAttentionCount,
    missingRequiredColumns: [],
    detectedColumns: Object.keys(headerMapping),
    rows: results,
  };
}
