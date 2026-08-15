import { CommunicationChannel } from './messaging';
import { DeliveryRecord, DeliveryBatchSummary, DeliveryPreview } from './delivery';

export type SendStatus = 'QUEUED' | 'PROCESSING' | 'SENT' | 'FAILED' | 'RETRYING' | 'CANCELLED';

export interface SendJob {
  id: string;
  employeeId: string;
  salarySlipId: string;
  channel: CommunicationChannel;
  status: SendStatus;
  attemptCount: number;
  maxAttempts: number;
  errorMessage?: string;
  providerMessageId?: string;
  queuedAt: string;
  sentAt?: string;
}

export interface SendProgress {
  total: number;
  completed: number;
  successful: number;
  failed: number;
  inProgress: boolean;
}

export type { DeliveryRecord, DeliveryBatchSummary, DeliveryPreview };
