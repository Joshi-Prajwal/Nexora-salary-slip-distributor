import { MatchStatus } from './salarySlip';

export type MatchMethod =
  | 'EXACT_EMPLOYEE_ID'
  | 'NORMALIZED_EMPLOYEE_ID'
  | 'EXACT_NAME'
  | 'PHONE'
  | 'EMAIL'
  | 'COMBINED_SIGNALS'
  | 'MANUAL_REVIEW';

export interface MatchingResult {
  salarySlipId: string;
  candidateEmployeeId?: string;
  matchMethod: MatchMethod;
  confidence: number; // 0.0 to 1.0
  confirmed: boolean;
  status: MatchStatus;
  notes?: string;
}

export interface MatchingFilter {
  status?: MatchStatus;
  minConfidence?: number;
  searchQuery?: string;
}
