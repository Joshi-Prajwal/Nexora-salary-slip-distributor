import { create } from 'zustand';
import { MatchingResult, MatchingFilter } from '../types/matching';
import { matchingService } from '../services/matchingService';

interface MatchingState {
  matches: MatchingResult[];
  filter: MatchingFilter;
  isProcessing: boolean;
  setFilter: (filter: MatchingFilter) => void;
  runMatching: () => Promise<void>;
  confirmMatch: (slipId: string, empId: string) => Promise<void>;
  rejectMatch: (slipId: string) => Promise<void>;
}

export const useMatchingStore = create<MatchingState>((set, get) => ({
  matches: [],
  filter: {},
  isProcessing: false,
  setFilter: (filter) => set({ filter }),
  runMatching: async () => {
    set({ isProcessing: true });
    try {
      const matches = await matchingService.runMatching();
      set({ matches, isProcessing: false });
    } catch {
      set({ isProcessing: false });
    }
  },
  confirmMatch: async (slipId: string, empId: string) => {
    const updated = await matchingService.confirmMatch(slipId, empId);
    set({
      matches: get().matches.map((m) => (m.salarySlipId === slipId ? updated : m)),
    });
  },
  rejectMatch: async (slipId: string) => {
    const updated = await matchingService.rejectMatch(slipId);
    set({
      matches: get().matches.map((m) => (m.salarySlipId === slipId ? updated : m)),
    });
  },
}));
