import { MatchingResult } from '../types/matching';
import { MatchStatus } from '../types/salarySlip';

/**
 * Employee Matching Application Service
 * Coordinates automated matching rules and manual match confirmation
 */
export const matchingService = {
  async runMatching(): Promise<MatchingResult[]> {
    // Phase 0 placeholder - Matching algorithm belongs to matching engine phase
    console.log('[Phase 0 Scaffold] Run automated matching');
    return [];
  },

  async confirmMatch(salarySlipId: string, employeeId: string): Promise<MatchingResult> {
    console.log(`[Phase 0 Scaffold] Confirm match: slip ${salarySlipId} -> employee ${employeeId}`);
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
    console.log(`[Phase 0 Scaffold] Reject match for slip ${salarySlipId}`);
    return {
      salarySlipId,
      matchMethod: 'MANUAL_REVIEW',
      confidence: 0.0,
      confirmed: false,
      status: 'REJECTED' as MatchStatus,
    };
  },
};
