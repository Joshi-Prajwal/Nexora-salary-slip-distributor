import { create } from 'zustand';
import { DeliveryRecord } from '../types/delivery';
import { historyService } from '../services/historyService';
import { deliveryService } from '../services/deliveryService';

interface HistoryState {
  historyLogs: DeliveryRecord[];
  isLoading: boolean;
  fetchHistory: () => Promise<void>;
  retryRecord: (recordId: string) => Promise<DeliveryRecord | null>;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
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
  retryRecord: async (recordId: string) => {
    const res = await deliveryService.retryRecord(recordId);
    if (res) {
      await get().fetchHistory();
    }
    return res;
  },
}));
