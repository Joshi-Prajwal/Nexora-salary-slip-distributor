import { create } from 'zustand';
import { MatchingFilter, MatchCandidate, BatchMatchSummary, BulkConfirmResult } from '../types/matching';
import { matchingService } from '../services/matchingService';
import { useSalarySlipStore } from './salarySlipStore';

interface MatchingState {
  filter: MatchingFilter;
  isMatchingProcessing: boolean;
  lastBatchMatchSummary: BatchMatchSummary | null;
  lastBulkConfirmResult: BulkConfirmResult | null;
  candidates: Record<string, MatchCandidate[]>;
  setFilter: (filter: MatchingFilter) => void;
  runMatching: () => Promise<BatchMatchSummary | null>;
  fetchCandidates: (slipId: string) => Promise<MatchCandidate[]>;
  confirmMatch: (slipId: string, employeeId: string, note?: string) => Promise<void>;
  rejectMatch: (slipId: string, note?: string) => Promise<void>;
  resetMatch: (slipId: string) => Promise<void>;
  confirmAllSafeMatches: () => Promise<BulkConfirmResult | null>;
  bulkUpdateApprovalStatus: (slipIds: string[], targetApproval: 'APPROVED' | 'REJECTED' | 'PENDING') => Promise<void>;
}

export const useMatchingStore = create<MatchingState>((set, get) => ({
  filter: {},
  isMatchingProcessing: false,
  lastBatchMatchSummary: null,
  lastBulkConfirmResult: null,
  candidates: {},
  setFilter: (filter) => set({ filter }),
  runMatching: async () => {
    set({ isMatchingProcessing: true });
    try {
      const summary = await matchingService.runMatchingEngine();
      await useSalarySlipStore.getState().fetchSalarySlips();
      set({
        lastBatchMatchSummary: summary,
        isMatchingProcessing: false,
      });
      return summary;
    } catch {
      set({ isMatchingProcessing: false });
      return null;
    }
  },
  fetchCandidates: async (slipId: string) => {
    try {
      const cand = await matchingService.getCandidates(slipId);
      set({
        candidates: { ...get().candidates, [slipId]: cand },
      });
      return cand;
    } catch {
      return [];
    }
  },
  confirmMatch: async (slipId: string, employeeId: string, note?: string) => {
    await matchingService.confirmMatch(slipId, employeeId, note);
    await useSalarySlipStore.getState().fetchSalarySlips();
  },
  rejectMatch: async (slipId: string, note?: string) => {
    await matchingService.rejectMatch(slipId, note);
    await useSalarySlipStore.getState().fetchSalarySlips();
  },
  resetMatch: async (slipId: string) => {
    await matchingService.resetMatch(slipId);
    await useSalarySlipStore.getState().fetchSalarySlips();
  },
  confirmAllSafeMatches: async () => {
    set({ isMatchingProcessing: true });
    try {
      const result = await matchingService.confirmAllSafeMatches();
      await useSalarySlipStore.getState().fetchSalarySlips();
      set({
        lastBulkConfirmResult: result,
        isMatchingProcessing: false,
      });
      return result;
    } catch {
      set({ isMatchingProcessing: false });
      return null;
    }
  },
  bulkUpdateApprovalStatus: async (slipIds: string[], targetApproval: 'APPROVED' | 'REJECTED' | 'PENDING') => {
    set({ isMatchingProcessing: true });
    try {
      await matchingService.bulkUpdateApprovalStatus(slipIds, targetApproval);
      await useSalarySlipStore.getState().fetchSalarySlips();
    } finally {
      set({ isMatchingProcessing: false });
    }
  },
}));
