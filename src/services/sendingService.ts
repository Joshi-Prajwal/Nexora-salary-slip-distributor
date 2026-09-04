import { SendJob, SendProgress } from '../types/sending';
import { CommunicationChannel } from '../types/messaging';

/**
 * Bulk Distribution Queue Service
 * Handles queue submission, retry requests, and status monitoring
 */
export const sendingService = {
  async queueBatch(_salarySlipIds: string[], _channel: CommunicationChannel): Promise<SendJob[]> {
    return [];
  },

  async getProgress(): Promise<SendProgress> {
    return {
      total: 0,
      completed: 0,
      successful: 0,
      failed: 0,
      inProgress: false,
    };
  },

  async retryFailedJob(_jobId: string): Promise<boolean> {
    return true;
  },
};
