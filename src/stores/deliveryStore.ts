import { create } from 'zustand';
import { DeliveryRecord, DeliveryBatchSummary, DeliveryPreview } from '../types/delivery';
import { deliveryService } from '../services/deliveryService';
import { useSalarySlipStore } from './salarySlipStore';

interface DeliveryState {
  records: DeliveryRecord[];
  preview: DeliveryPreview | null;
  lastSummary: DeliveryBatchSummary | null;
  isSending: boolean;
  isCancelled: boolean;
  progress: {
    total: number;
    current: number;
    currentName: string;
    channel: string;
  };

  fetchRecords: () => Promise<void>;
  previewBatch: (slipIds: string[], channel: string) => Promise<DeliveryPreview | null>;
  sendBatch: (slipIds: string[], channel: string) => Promise<DeliveryBatchSummary | null>;
  retryRecord: (recordId: string) => Promise<DeliveryRecord | null>;
  cancelBatch: () => void;
}

export const useDeliveryStore = create<DeliveryState>((set, get) => ({
  records: [],
  preview: null,
  lastSummary: null,
  isSending: false,
  isCancelled: false,
  progress: {
    total: 0,
    current: 0,
    currentName: '',
    channel: 'EMAIL',
  },

  fetchRecords: async () => {
    try {
      const records = await deliveryService.getDeliveryRecords();
      set({ records });
    } catch {
      set({ records: [] });
    }
  },

  previewBatch: async (slipIds: string[], channel: string) => {
    try {
      const preview = await deliveryService.previewBatch(slipIds, channel);
      set({ preview });
      return preview;
    } catch {
      return null;
    }
  },

  sendBatch: async (slipIds: string[], channel: string) => {
    set({
      isSending: true,
      isCancelled: false,
      progress: {
        total: slipIds.length,
        current: 0,
        currentName: 'Preparing delivery batch...',
        channel,
      },
    });

    try {
      const summary = await deliveryService.sendBatch(slipIds, channel);
      await get().fetchRecords();
      await useSalarySlipStore.getState().fetchSalarySlips();

      set({
        lastSummary: summary,
        isSending: false,
        progress: {
          total: slipIds.length,
          current: slipIds.length,
          currentName: 'Batch complete',
          channel,
        },
      });

      return summary;
    } catch {
      set({ isSending: false });
      return null;
    }
  },

  retryRecord: async (recordId: string) => {
    const updated = await deliveryService.retryRecord(recordId);
    if (updated) {
      await get().fetchRecords();
    }
    return updated;
  },

  cancelBatch: () => {
    set({ isCancelled: true, isSending: false });
  },
}));
