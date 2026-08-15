import { describe, it, expect, beforeEach } from 'vitest';
import { deliveryService } from '../../../src/services/deliveryService';
import { DeliveryRecord } from '../../../src/types/delivery';

describe('Phase 6 — Delivery Engine Unit Tests', () => {
  beforeEach(async () => {
    await deliveryService.setMemoryStoreForTesting([]);
  });

  it('1. Batch preview calculates total requested and estimated deliveries', async () => {
    const slipIds = ['slip-1', 'slip-2'];
    const preview = await deliveryService.previewBatch(slipIds, 'EMAIL');

    expect(preview).toBeDefined();
    expect(preview.totalRequested).toBe(2);
    expect(preview.estimatedDeliveries).toBe(2);
  });

  it('2. Batch delivery executes sending and returns DeliveryBatchSummary', async () => {
    const slipIds = ['slip-1', 'slip-2'];
    const summary = await deliveryService.sendBatch(slipIds, 'EMAIL');

    expect(summary).toBeDefined();
    expect(summary.total).toBe(2);
    expect(summary.sent).toBe(2);
    expect(summary.emailSent).toBe(2);
  });

  it('3. Duplicate delivery attempt enforces idempotency and marks status as skipped/alreadySent', async () => {
    const initialRecord: DeliveryRecord = {
      id: 'del-existing-1',
      salarySlipId: 'slip-1',
      employeeId: 'emp-1',
      channel: 'EMAIL',
      status: 'SENT',
      recipient: 'user@company.com',
      provider: 'SMTP',
      attemptNumber: 1,
      createdAt: '1000',
    };
    await deliveryService.setMemoryStoreForTesting([initialRecord]);

    const summary = await deliveryService.sendBatch(['slip-1'], 'EMAIL');

    expect(summary.total).toBe(1);
    expect(summary.skipped).toBe(1);
    expect(summary.alreadySent).toBe(1);
  });

  it('4. Failed delivery record can be retried successfully', async () => {
    const failedRecord: DeliveryRecord = {
      id: 'del-failed-1',
      salarySlipId: 'slip-2',
      employeeId: 'emp-2',
      channel: 'EMAIL',
      status: 'FAILED',
      recipient: 'user2@company.com',
      provider: 'SMTP',
      attemptNumber: 1,
      createdAt: '1000',
    };
    await deliveryService.setMemoryStoreForTesting([failedRecord]);

    const retried = await deliveryService.retryRecord('del-failed-1');
    expect(retried?.status).toBe('SENT');
    expect(retried?.attemptNumber).toBe(2);
  });

  it('5. Email + WhatsApp (BOTH) channel processes each provider independently', async () => {
    const summary = await deliveryService.sendBatch(['slip-3'], 'BOTH');

    expect(summary.total).toBe(1);
    expect(summary.sent).toBe(2); // 1 email + 1 whatsapp
    expect(summary.emailSent).toBe(1);
    expect(summary.whatsappSent).toBe(1);
  });

  it('6. Test Email Connection validates configuration input', async () => {
    const valid = await deliveryService.testEmailConnection('mail.company.com', 587, 'user@company.com');
    expect(valid).toBe(true);

    const invalid = await deliveryService.testEmailConnection('', 587, '');
    expect(invalid).toBe(false);
  });

  it('7. Test WhatsApp Connection validates endpoint, token, and phone number ID', async () => {
    const valid = await deliveryService.testWhatsappConnection(
      'https://graph.facebook.com/v18.0',
      'token123',
      '10002000'
    );
    expect(valid).toBe(true);

    const invalid = await deliveryService.testWhatsappConnection('', '', '');
    expect(invalid).toBe(false);
  });
});
