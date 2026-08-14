import { create } from 'zustand';
import { SendJob, SendProgress } from '../types/sending';
import { sendingService } from '../services/sendingService';

interface SendingState {
  jobs: SendJob[];
  progress: SendProgress;
  isSending: boolean;
  refreshProgress: () => Promise<void>;
}

export const useSendingStore = create<SendingState>((set) => ({
  jobs: [],
  progress: { total: 0, completed: 0, successful: 0, failed: 0, inProgress: false },
  isSending: false,
  refreshProgress: async () => {
    const progress = await sendingService.getProgress();
    set({ progress, isSending: progress.inProgress });
  },
}));
