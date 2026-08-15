export type ImportRowStatus = 'NEW' | 'UPDATED' | 'UNCHANGED' | 'NEEDS_ATTENTION' | 'READY' | 'ALREADY_IMPORTED';

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
  newCount: number;
  updatedCount: number;
  unchangedCount: number;
  needsAttentionCount: number;
  readyCount: number;
  alreadyImportedCount: number;
  missingRequiredColumns: string[];
  detectedColumns: string[];
  rows: EmployeeImportRowResult[];
}
