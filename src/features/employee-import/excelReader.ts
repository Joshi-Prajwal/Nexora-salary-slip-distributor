import * as XLSX from 'xlsx';
import { EmployeeImportSummary } from './importTypes';
import { mapHeaders, validateImportRows } from './importValidator';

export interface ParseExcelOptions {
  existingEmployeeIds?: Set<string>;
}

/**
 * Reads an Excel workbook (.xlsx or .xls) locally and validates its contents.
 */
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

  // Find the first non-empty worksheet
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

  // Parse worksheet to raw JSON array of objects
  const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(selectedSheet, {
    defval: '',
    raw: false,
  });

  if (!rawRows || rawRows.length === 0) {
    throw new Error('No employee data was found in this Excel file.');
  }

  // Detect raw headers from the first row object keys
  const rawHeaders = Object.keys(rawRows[0] || {});
  if (rawHeaders.length === 0) {
    throw new Error('No employee data was found in this Excel file.');
  }

  // Map headers and validate required columns
  const { mapped, missingRequired } = mapHeaders(rawHeaders);
  if (missingRequired.length > 0) {
    const summary: EmployeeImportSummary = {
      totalRows: rawRows.length,
      readyCount: 0,
      alreadyImportedCount: 0,
      needsAttentionCount: rawRows.length,
      missingRequiredColumns: missingRequired,
      detectedColumns: rawHeaders,
      rows: [],
    };
    return summary;
  }

  // Run row validation & duplicate checks
  const summary = validateImportRows(rawRows, mapped, options.existingEmployeeIds || new Set());
  return summary;
}
