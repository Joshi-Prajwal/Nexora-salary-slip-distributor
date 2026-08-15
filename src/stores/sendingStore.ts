import { create } from 'zustand';
import { SendProgress } from '../types/sending';
import { DeliveryRecord } from '../types/delivery';
import { deliveryService } from '../services/deliveryService';

interface SendingState {
  records: DeliveryRecord[];
  progress: SendProgress;
  isSending: boolean;
  fetchRecords: () => Promise<void>;
}

export const useSendingStore = create<SendingState>((set) => ({
  records: [],
  progress: { total: 0, completed: 0, successful: 0, failed: 0, inProgress: false },
  isSending: false,
  fetchRecords: async () => {
    const records = await deliveryService.getDeliveryRecords();
    const successful = records.filter((r) => r.status === 'SENT').length;
    const failed = records.filter((r) => r.status === 'FAILED').length;
    set({
      records,
      progress: {
        total: records.length,
        completed: records.length,
        successful,
        failed,
        inProgress: false,
      },
    });
  },
}));
