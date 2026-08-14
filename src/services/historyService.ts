import { SendJob } from '../types/sending';

/**
 * Message History & Audit Log Service
 */
export const historyService = {
  async getSendLogs(): Promise<SendJob[]> {
    console.log('[Phase 0 Scaffold] Fetch send logs');
    return [];
  },

  async clearHistory(): Promise<boolean> {
    console.log('[Phase 0 Scaffold] Clear message history');
    return true;
  },
};
