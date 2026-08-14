import { create } from 'zustand';
import { SendJob } from '../types/sending';
import { historyService } from '../services/historyService';

interface HistoryState {
  historyLogs: SendJob[];
  isLoading: boolean;
  fetchHistory: () => Promise<void>;
}

export const useHistoryStore = create<HistoryState>((set) => ({
  historyLogs: [],
  isLoading: false,
  fetchHistory: async () => {
    set({ isLoading: true });
    try {
      const historyLogs = await historyService.getSendLogs();
      set({ historyLogs, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },
}));
