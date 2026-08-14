export type ImportRowStatus = 'READY' | 'ALREADY_IMPORTED' | 'NEEDS_ATTENTION';

export interface RawRowData {
  [key: string]: any;
}

export interface EmployeeImportRow {
  rowIndex: number;
  employeeId: string;
  fullName: string;
  email: string;
  phone: string;
  department: string;
  designation: string;
}

export interface EmployeeImportRowResult {
  rowIndex: number;
  status: ImportRowStatus;
  data: EmployeeImportRow;
  errors: string[];
  warnings: string[];
}

export interface EmployeeImportSummary {
  totalRows: number;
  readyCount: number;
  alreadyImportedCount: number;
  needsAttentionCount: number;
  missingRequiredColumns: string[];
  detectedColumns: string[];
  rows: EmployeeImportRowResult[];
}
