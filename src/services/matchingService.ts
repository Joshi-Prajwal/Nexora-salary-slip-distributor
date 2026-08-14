import { MatchingResult } from '../types/matching';
import { MatchStatus } from '../types/salarySlip';

/**
 * Employee Matching Application Service
 * Coordinates automated matching rules and manual match confirmation
 */
export const matchingService = {
  async runMatching(): Promise<MatchingResult[]> {
    return [];
  },

  async confirmMatch(salarySlipId: string, employeeId: string): Promise<MatchingResult> {
    return {
      salarySlipId,
      candidateEmployeeId: employeeId,
      matchMethod: 'MANUAL_REVIEW',
      confidence: 1.0,
      confirmed: true,
      status: 'CONFIRMED' as MatchStatus,
    };
  },

  async rejectMatch(salarySlipId: string): Promise<MatchingResult> {
    return {
      salarySlipId,
      matchMethod: 'MANUAL_REVIEW',
      confidence: 0.0,
      confirmed: false,
      status: 'REJECTED' as MatchStatus,
    };
  },
};
