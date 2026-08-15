import { MatchCandidate, BatchMatchSummary } from '../types/matching';
import { SalarySlip } from '../types/salarySlip';
import { salarySlipService } from './salarySlipService';

async function tryTauriInvoke<T>(cmd: string, args?: Record<string, any>): Promise<T | null> {
  if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<T>(cmd, args);
    } catch (_err) {
      return null;
    }
  }
  return null;
}

export const matchingService = {
  async runMatchingEngine(): Promise<BatchMatchSummary> {
    const tauriResult = await tryTauriInvoke<BatchMatchSummary>('run_matching_engine');
    if (tauriResult !== null) {
      return tauriResult;
    }

    const slips = await salarySlipService.getSalarySlips();
    return {
      total: slips.length,
      exactMatches: slips.filter((s) => s.matchStatus === 'EXACT_MATCH').length,
      strongMatches: slips.filter((s) => s.matchStatus === 'STRONG_MATCH').length,
      possibleMatches: slips.filter((s) => s.matchStatus === 'POSSIBLE_MATCH').length,
      conflicts: slips.filter((s) => s.matchStatus === 'CONFLICT').length,
      noMatches: slips.filter((s) => s.matchStatus === 'NO_MATCH').length,
      alreadyReviewed: slips.filter(
        (s) => s.matchStatus === 'MANUALLY_CONFIRMED' || s.matchStatus === 'MANUALLY_REJECTED'
      ).length,
    };
  },

  async confirmMatch(slipId: string, employeeId: string, note?: string): Promise<SalarySlip | null> {
    const tauriResult = await tryTauriInvoke<SalarySlip>('confirm_salary_slip_match', {
      slipId,
      employeeId,
      note,
    });
    if (tauriResult !== null) {
      return tauriResult;
    }

    return await salarySlipService.confirmMatch(slipId, employeeId, note);
  },

  async rejectMatch(slipId: string, note?: string): Promise<SalarySlip | null> {
    const tauriResult = await tryTauriInvoke<SalarySlip>('reject_salary_slip_match', {
      slipId,
      note,
    });
    if (tauriResult !== null) {
      return tauriResult;
    }

    return await salarySlipService.rejectMatch(slipId, note);
  },

  async resetMatch(slipId: string): Promise<SalarySlip | null> {
    const tauriResult = await tryTauriInvoke<SalarySlip>('reset_salary_slip_match', {
      slipId,
    });
    if (tauriResult !== null) {
      return tauriResult;
    }

    return await salarySlipService.resetMatch(slipId);
  },

  async getCandidates(slipId: string): Promise<MatchCandidate[]> {
    const tauriResult = await tryTauriInvoke<MatchCandidate[]>('get_match_candidates', {
      slipId,
    });
    if (tauriResult !== null) {
      return tauriResult;
    }

    return [];
  },
};
