import {
  EmployeeImportRow,
  EmployeeImportRowResult,
  EmployeeImportSummary,
  ImportRowStatus,
} from './importTypes';

const HEADER_ALIASES: Record<keyof Omit<EmployeeImportRow, 'rowIndex'>, string[]> = {
  employeeId: [
    'employee id',
    'employeeid',
    'employee code',
    'emp code',
    'employee code id',
    'id',
    'emp id',
    'empid',
    'staff id',
    'staff number',
    'emp_id',
    'employee_id',
  ],
  fullName: ['full name', 'name', 'employee name', 'employee full name', 'fullname'],
  email: ['email', 'email address', 'email id', 'emailaddress'],
  phone: [
    'phone',
    'phone number',
    'mobile',
    'mobile number',
    'contact number',
    'phonenumber',
    'contact',
    'contact_number',
    'mobile_number',
  ],
  department: ['department', 'dept'],
  designation: ['designation', 'role', 'job title', 'job_title', 'title'],
};

export function normalizeHeader(header: string): string {
  return (header || '').toString().toLowerCase().trim().replace(/[\s_-]+/g, ' ');
}

export function sanitizeCellString(val: any, isPhone = false): string {
  if (val === undefined || val === null) return '';
  let str = String(val).trim();
  if (isPhone) {
    if (/^\d+(\.\d+)?e\+\d+$/i.test(str)) {
      try {
        str = BigInt(Math.round(Number(val))).toString();
      } catch {
        // keep string
      }
    }
    if (/^\d+\.0$/.test(str)) {
      str = str.replace(/\.0$/, '');
    }
  }
  return str;
}

export function mapHeaders(rawHeaders: string[]): {
  mapped: Record<string, keyof Omit<EmployeeImportRow, 'rowIndex'>>;
  missingRequired: string[];
} {
  const mapped: Record<string, keyof Omit<EmployeeImportRow, 'rowIndex'>> = {};
  const foundFields = new Set<string>();

  for (const rawHeader of rawHeaders) {
    const normalized = normalizeHeader(rawHeader);
    for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
      if (aliases.includes(normalized) && !foundFields.has(field)) {
        mapped[rawHeader] = field as keyof Omit<EmployeeImportRow, 'rowIndex'>;
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

export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(trimmed);
}

export function validateImportRows(
  rawRows: Record<string, any>[],
  headerMapping: Record<string, keyof Omit<EmployeeImportRow, 'rowIndex'>>,
  existingEmployeesInput: Set<string> | Map<string, { name: string; email?: string; phone?: string; department?: string; designation?: string }> = new Set()
): EmployeeImportSummary {
  const isSetInput = existingEmployeesInput instanceof Set;
  const existingMap =
    existingEmployeesInput instanceof Map
      ? existingEmployeesInput
      : new Map(Array.from(existingEmployeesInput).map((id) => [id.toLowerCase(), { name: '', email: '', phone: '', department: '', designation: '' }]));

  const results: EmployeeImportRowResult[] = [];
  const seenFileEmployeeIds = new Set<string>();
  const duplicateFileEmployeeIds = new Set<string>();

  for (const row of rawRows) {
    let empId = '';
    for (const [rawHeader, field] of Object.entries(headerMapping)) {
      if (field === 'employeeId' && row[rawHeader] !== undefined && row[rawHeader] !== null) {
        empId = sanitizeCellString(row[rawHeader]);
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

  let newCount = 0;
  let updatedCount = 0;
  let unchangedCount = 0;
  let readyCount = 0;
  let alreadyImportedCount = 0;
  let needsAttentionCount = 0;

  rawRows.forEach((row, index) => {
    const rowIndex = index + 2;
    const errors: string[] = [];
    const warnings: string[] = [];

    let employeeId = '';
    let fullName = '';
    let email = '';
    let phone = '';
    let department = '';
    let designation = '';

    for (const [rawHeader, field] of Object.entries(headerMapping)) {
      const val = sanitizeCellString(row[rawHeader], field === 'phone');
      if (field === 'employeeId') employeeId = val;
      if (field === 'fullName') fullName = val;
      if (field === 'email') email = val;
      if (field === 'phone') phone = val;
      if (field === 'department') department = val;
      if (field === 'designation') designation = val;
    }

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

    if (employeeId && duplicateFileEmployeeIds.has(employeeId.toLowerCase())) {
      errors.push('Employee ID already appears in this file.');
    }

    if (!phone) {
      warnings.push('Phone number is missing.');
    }
    if (!department) {
      warnings.push('Department is missing.');
    }

    let status: ImportRowStatus = 'NEW';

    if (errors.length > 0) {
      status = 'NEEDS_ATTENTION';
      needsAttentionCount++;
    } else {
      const existing = existingMap.get(employeeId.toLowerCase());
      if (!existing && !isSetInput) {
        status = 'NEW';
        newCount++;
        readyCount++;
      } else if (!existing && isSetInput && !existingEmployeesInput.has(employeeId.toLowerCase())) {
        status = 'READY';
        readyCount++;
      } else {
        const hasNameChange = Boolean(fullName && existing && existing.name && fullName !== existing.name);
        const hasEmailChange = Boolean(email && existing && existing.email && email !== existing.email);
        const hasPhoneChange = Boolean(phone && existing && existing.phone && phone !== existing.phone);
        const hasDeptChange = Boolean(department && existing && existing.department && department !== existing.department);
        const hasDesigChange = Boolean(designation && existing && existing.designation && designation !== existing.designation);

        if (hasNameChange || hasEmailChange || hasPhoneChange || hasDeptChange || hasDesigChange) {
          status = 'UPDATED';
          updatedCount++;
          readyCount++;
        } else {
          status = isSetInput ? 'ALREADY_IMPORTED' : 'UNCHANGED';
          unchangedCount++;
          alreadyImportedCount++;
        }
      }
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
        designation,
      },
      errors,
      warnings,
    });
  });

  return {
    totalRows: rawRows.length,
    newCount,
    updatedCount,
    unchangedCount,
    needsAttentionCount,
    readyCount,
    alreadyImportedCount,
    missingRequiredColumns: [],
    detectedColumns: Object.keys(headerMapping),
    rows: results,
  };
}
