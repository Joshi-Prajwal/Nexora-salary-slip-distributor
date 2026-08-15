import { SalarySlip } from './salarySlip';

export type MatchStatus =
  | 'EXACT_MATCH'
  | 'STRONG_MATCH'
  | 'POSSIBLE_MATCH'
  | 'NO_MATCH'
  | 'CONFLICT'
  | 'MANUAL_REVIEW'
  | 'MANUALLY_CONFIRMED'
  | 'MANUALLY_REJECTED'
  | 'UNMATCHED';

export interface MatchCandidate {
  employeeDbId: string;
  employeeId: string;
  name: string;
  email?: string;
  phone?: string;
  department?: string;
  designation?: string;
  score: number;
  matchedFields: string[];
  unmatchedFields: string[];
  explanation: string;
}

export interface MatchResult {
  salarySlipId: string;
  status: MatchStatus;
  confidence: number; // 0.0 to 1.0
  matchedEmployeeId?: string;
  candidate?: MatchCandidate;
  allCandidates: MatchCandidate[];
  reason: string;
}

export interface BatchMatchSummary {
  total: number;
  exactMatches: number;
  strongMatches: number;
  possibleMatches: number;
  conflicts: number;
  noMatches: number;
  alreadyReviewed: number;
}

export interface BulkConfirmResult {
  confirmedCount: number;
  skippedCount: number;
  skippedReasons: string[];
  slips: SalarySlip[];
}

export interface MatchingFilter {
  status?: string;
  searchQuery?: string;
}
