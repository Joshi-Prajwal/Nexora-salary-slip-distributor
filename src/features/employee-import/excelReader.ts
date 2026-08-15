import * as XLSX from 'xlsx';
import { EmployeeImportSummary } from './importTypes';
import { mapHeaders, validateImportRows } from './importValidator';
import { Employee } from '../../types/employee';

export interface ParseExcelOptions {
  existingEmployeeIds?: Set<string>;
  existingEmployees?: Map<string, Employee> | Employee[];
}

export async function parseExcelWorkbook(
  data: ArrayBuffer | Uint8Array,
  options: ParseExcelOptions = {}
): Promise<EmployeeImportSummary> {
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(data, { type: 'array' });
  } catch (_err) {
    throw new Error('Failed to read file. Please select a valid Excel file (.xlsx or .xls).');
  }

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error('No employee data was found in this Excel file.');
  }

  let selectedSheet: XLSX.WorkSheet | null = null;
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (sheet && sheet['!ref']) {
      selectedSheet = sheet;
      break;
    }
  }

  if (!selectedSheet) {
    throw new Error('No employee data was found in this Excel file.');
  }

  const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(selectedSheet, {
    defval: '',
    raw: false,
  });

  if (!rawRows || rawRows.length === 0) {
    throw new Error('No employee data was found in this Excel file.');
  }

  const rawHeaders = Object.keys(rawRows[0] || {});
  if (rawHeaders.length === 0) {
    throw new Error('No employee data was found in this Excel file.');
  }

  const { mapped, missingRequired } = mapHeaders(rawHeaders);
  if (missingRequired.length > 0) {
    const summary: EmployeeImportSummary = {
      totalRows: rawRows.length,
      newCount: 0,
      updatedCount: 0,
      unchangedCount: 0,
      needsAttentionCount: rawRows.length,
      readyCount: 0,
      alreadyImportedCount: 0,
      missingRequiredColumns: missingRequired,
      detectedColumns: rawHeaders,
      rows: [],
    };
    return summary;
  }

  let existingInput: Set<string> | Map<string, any> = options.existingEmployeeIds || new Set();
  if (options.existingEmployees) {
    if (options.existingEmployees instanceof Map) {
      existingInput = options.existingEmployees;
    } else if (Array.isArray(options.existingEmployees)) {
      existingInput = new Map(options.existingEmployees.map((e) => [e.employeeId.toLowerCase(), e]));
    }
  }

  const summary = validateImportRows(rawRows, mapped, existingInput);
  return summary;
}
