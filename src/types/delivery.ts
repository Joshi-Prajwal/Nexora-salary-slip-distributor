export type DeliveryChannel = 'EMAIL' | 'WHATSAPP' | 'BOTH';

export type DeliveryStatus = 'PENDING' | 'PROCESSING' | 'SENT' | 'FAILED' | 'SKIPPED';

export interface DeliveryRecord {
  id: string;
  salarySlipId: string;
  employeeId: string;
  employeeName?: string;
  channel: string;
  status: DeliveryStatus;
  recipient: string;
  provider: string;
  message?: string;
  errorCode?: string;
  errorMessage?: string;
  providerMessageId?: string;
  attemptNumber: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface DeliveryPreview {
  totalRequested: number;
  eligibleCount: number;
  missingEmailCount: number;
  missingWhatsappCount: number;
  notConfiguredCount: number;
  alreadySentCount: number;
  ineligibleCount: number;
  estimatedDeliveries: number;
}

export interface DeliveryBatchSummary {
  total: number;
  sent: number;
  failed: number;
  skipped: number;
  alreadySent: number;
  emailSent: number;
  whatsappSent: number;
  emailFailed: number;
  whatsappFailed: number;
  records: DeliveryRecord[];
}
