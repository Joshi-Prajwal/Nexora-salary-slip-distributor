import { MatchCandidate, BatchMatchSummary, BulkConfirmResult } from '../types/matching';
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

  async confirmAllSafeMatches(): Promise<BulkConfirmResult> {
    const tauriResult = await tryTauriInvoke<BulkConfirmResult>('confirm_all_safe_matches');
    if (tauriResult !== null) {
      return tauriResult;
    }

    const slips = await salarySlipService.getSalarySlips();
    let confirmedCount = 0;
    let skippedCount = 0;
    const skippedReasons: string[] = [];

    const updatedSlips = slips.map((slip) => {
      const isSafeExact = slip.matchStatus === 'EXACT_MATCH' && slip.matchedEmployeeId && slip.approvalStatus !== 'REJECTED';
      if (isSafeExact) {
        confirmedCount++;
        return {
          ...slip,
          matchStatus: 'MANUALLY_CONFIRMED' as const,
          approvalStatus: 'APPROVED' as const,
          matchConfidence: 1.0,
        };
      } else {
        skippedCount++;
        skippedReasons.push(`${slip.fileName}: Safe criteria not met (${slip.matchStatus})`);
        return slip;
      }
    });

    await salarySlipService.setMemoryStoreForTesting(updatedSlips);

    return {
      confirmedCount,
      skippedCount,
      skippedReasons,
      slips: updatedSlips,
    };
  },

  async bulkUpdateApprovalStatus(slipIds: string[], targetApproval: 'APPROVED' | 'REJECTED' | 'PENDING'): Promise<SalarySlip[]> {
    const tauriResult = await tryTauriInvoke<SalarySlip[]>('bulk_update_approval_status', {
      slipIds,
      targetApproval,
    });
    if (tauriResult !== null) {
      return tauriResult;
    }

    const slips = await salarySlipService.getSalarySlips();
    const updatedSlips = slips.map((slip) => {
      if (slipIds.includes(slip.id)) {
        return {
          ...slip,
          approvalStatus: targetApproval,
          matchStatus: targetApproval === 'APPROVED' ? ('MANUALLY_CONFIRMED' as const) : targetApproval === 'REJECTED' ? ('MANUALLY_REJECTED' as const) : slip.matchStatus,
        };
      }
      return slip;
    });

    await salarySlipService.setMemoryStoreForTesting(updatedSlips);
    return updatedSlips;
  },
};
