import { SendJob } from '../types/sending';

/**
 * Message History & Audit Log Service
 */
export const historyService = {
  async getSendLogs(): Promise<SendJob[]> {
    return [];
  },

  async clearHistory(): Promise<boolean> {
    return true;
  },
};
