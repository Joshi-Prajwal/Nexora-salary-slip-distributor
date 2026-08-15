import { DeliveryRecord } from '../types/delivery';
import { deliveryService } from './deliveryService';

/**
 * Message History & Audit Log Service
 */
export const historyService = {
  async getSendLogs(): Promise<DeliveryRecord[]> {
    return await deliveryService.getDeliveryRecords();
  },

  async clearHistory(): Promise<boolean> {
    return true;
  },
};
