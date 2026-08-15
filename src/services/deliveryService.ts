import { DeliveryRecord, DeliveryBatchSummary, DeliveryPreview } from '../types/delivery';

let memoryDeliveryRecordsStore: DeliveryRecord[] = [];

async function tryTauriInvoke<T>(cmd: string, args?: Record<string, any>): Promise<T | null> {
  if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<T>(cmd, args);
    } catch (_err) {
      return null;
    }
  }
  return null;
}

export const deliveryService = {
  async previewBatch(slipIds: string[], channel: string): Promise<DeliveryPreview> {
    const tauriResult = await tryTauriInvoke<DeliveryPreview>('preview_delivery_batch', {
      slipIds,
      channel,
    });
    if (tauriResult !== null) {
      return tauriResult;
    }

    const checkEmail = channel === 'EMAIL' || channel === 'BOTH';
    const checkWa = channel === 'WHATSAPP' || channel === 'BOTH';

    let alreadySent = 0;
    let estimated = 0;

    for (const id of slipIds) {
      if (checkEmail) {
        const existing = memoryDeliveryRecordsStore.find(
          (r) => r.salarySlipId === id && r.channel === 'EMAIL' && r.status === 'SENT'
        );
        if (existing) alreadySent++;
        else estimated++;
      }
      if (checkWa) {
        const existing = memoryDeliveryRecordsStore.find(
          (r) => r.salarySlipId === id && r.channel === 'WHATSAPP' && r.status === 'SENT'
        );
        if (existing) alreadySent++;
        else estimated++;
      }
    }

    return {
      totalRequested: slipIds.length,
      eligibleCount: slipIds.length,
      missingEmailCount: 0,
      missingWhatsappCount: 0,
      notConfiguredCount: 0,
      alreadySentCount: alreadySent,
      ineligibleCount: 0,
      estimatedDeliveries: estimated,
    };
  },

  async sendBatch(slipIds: string[], channel: string): Promise<DeliveryBatchSummary> {
    const tauriResult = await tryTauriInvoke<DeliveryBatchSummary>('send_salary_slips_batch', {
      slipIds,
      channel,
    });
    if (tauriResult !== null) {
      return tauriResult;
    }

    const processEmail = channel === 'EMAIL' || channel === 'BOTH';
    const processWa = channel === 'WHATSAPP' || channel === 'BOTH';

    let sent = 0;
    let skipped = 0;
    let alreadySent = 0;
    let emailSent = 0;
    let whatsappSent = 0;
    const newRecords: DeliveryRecord[] = [];

    for (const slipId of slipIds) {
      if (processEmail) {
        const existing = memoryDeliveryRecordsStore.find(
          (r) => r.salarySlipId === slipId && r.channel === 'EMAIL' && r.status === 'SENT'
        );
        if (existing) {
          alreadySent++;
          skipped++;
        } else {
          const rec: DeliveryRecord = {
            id: `del_${Math.random().toString(36).substring(2, 9)}`,
            salarySlipId: slipId,
            employeeId: 'emp-1',
            employeeName: 'Sample Employee',
            channel: 'EMAIL',
            status: 'SENT',
            recipient: 'employee@company.com',
            provider: 'SMTP',
            attemptNumber: 1,
            createdAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
          };
          memoryDeliveryRecordsStore.push(rec);
          newRecords.push(rec);
          sent++;
          emailSent++;
        }
      }

      if (processWa) {
        const existing = memoryDeliveryRecordsStore.find(
          (r) => r.salarySlipId === slipId && r.channel === 'WHATSAPP' && r.status === 'SENT'
        );
        if (existing) {
          alreadySent++;
          skipped++;
        } else {
          const rec: DeliveryRecord = {
            id: `del_${Math.random().toString(36).substring(2, 9)}`,
            salarySlipId: slipId,
            employeeId: 'emp-1',
            employeeName: 'Sample Employee',
            channel: 'WHATSAPP',
            status: 'SENT',
            recipient: '+919876543210',
            provider: 'WHATSAPP_CLOUD_API',
            attemptNumber: 1,
            createdAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
          };
          memoryDeliveryRecordsStore.push(rec);
          newRecords.push(rec);
          sent++;
          whatsappSent++;
        }
      }
    }

    return {
      total: slipIds.length,
      sent,
      failed: 0,
      skipped,
      alreadySent,
      emailSent,
      whatsappSent,
      emailFailed: 0,
      whatsappFailed: 0,
      records: newRecords,
    };
  },

  async retryRecord(recordId: string): Promise<DeliveryRecord | null> {
    const tauriResult = await tryTauriInvoke<DeliveryRecord>('retry_delivery_record', {
      recordId,
    });
    if (tauriResult !== null) {
      return tauriResult;
    }

    const index = memoryDeliveryRecordsStore.findIndex((r) => r.id === recordId);
    if (index !== -1) {
      const updated: DeliveryRecord = {
        ...memoryDeliveryRecordsStore[index],
        status: 'SENT',
        attemptNumber: memoryDeliveryRecordsStore[index].attemptNumber + 1,
        completedAt: new Date().toISOString(),
      };
      memoryDeliveryRecordsStore[index] = updated;
      return updated;
    }
    return null;
  },

  async getDeliveryRecords(): Promise<DeliveryRecord[]> {
    const tauriResult = await tryTauriInvoke<DeliveryRecord[]>('get_delivery_records');
    if (tauriResult !== null) {
      return tauriResult;
    }
    return [...memoryDeliveryRecordsStore];
  },

  async testEmailConnection(
    host: string,
    port: number,
    username: string,
    password?: string,
    fromAddress?: string
  ): Promise<boolean> {
    const tauriResult = await tryTauriInvoke<boolean>('test_email_connection', {
      host,
      port,
      username,
      password: password || '',
      fromAddress: fromAddress || '',
    });
    if (tauriResult !== null) {
      return tauriResult;
    }
    return host.trim().length > 0 && username.trim().length > 0;
  },

  async testWhatsappConnection(
    apiUrl: string,
    apiToken: string,
    phoneNumberId: string
  ): Promise<boolean> {
    const tauriResult = await tryTauriInvoke<boolean>('test_whatsapp_connection', {
      apiUrl,
      apiToken,
      phoneNumberId,
    });
    if (tauriResult !== null) {
      return tauriResult;
    }
    return apiUrl.trim().length > 0 && apiToken.trim().length > 0 && phoneNumberId.trim().length > 0;
  },

  async setMemoryStoreForTesting(records: DeliveryRecord[]): Promise<void> {
    memoryDeliveryRecordsStore = records;
  },
};
