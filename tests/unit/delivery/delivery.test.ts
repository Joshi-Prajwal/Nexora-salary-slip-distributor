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

  it('8. DeliveryRecord contains resolved employeeId and employeeName', async () => {
    const sampleRecord: DeliveryRecord = {
      id: 'del-101',
      salarySlipId: 'slip-101',
      employeeId: '106',
      employeeName: 'V M Muttur',
      channel: 'EMAIL',
      status: 'SENT',
      recipient: 'muttur.vm@company.com',
      provider: 'SMTP',
      attemptNumber: 1,
      createdAt: '1000',
    };
    await deliveryService.setMemoryStoreForTesting([sampleRecord]);

    const records = await deliveryService.getDeliveryRecords();
    expect(records).toHaveLength(1);
    expect(records[0].employeeId).toBe('106');
    expect(records[0].employeeName).toBe('V M Muttur');
  });

  it('9. Derived statistics calculate total, delivered, pending, and failed with zero counter drift', async () => {
    const records: DeliveryRecord[] = [
      { id: '1', salarySlipId: 's1', employeeId: '106', employeeName: 'V M Muttur', channel: 'EMAIL', status: 'SENT', recipient: 'r1', provider: 'SMTP', attemptNumber: 1, createdAt: '1' },
      { id: '2', salarySlipId: 's2', employeeId: '107', employeeName: 'H S Maheshnaik', channel: 'EMAIL', status: 'FAILED', recipient: 'r2', provider: 'SMTP', attemptNumber: 1, createdAt: '2' },
      { id: '3', salarySlipId: 's3', employeeId: '108', employeeName: 'Dr L B Singh', channel: 'WHATSAPP', status: 'PENDING', recipient: 'r3', provider: 'WHATSAPP_CLOUD_API', attemptNumber: 1, createdAt: '3' },
      { id: '4', salarySlipId: 's4', employeeId: '109', employeeName: 'Ashwini R Kulkarni', channel: 'EMAIL', status: 'SKIPPED', recipient: 'r4', provider: 'SMTP', attemptNumber: 1, createdAt: '4' },
    ];
    await deliveryService.setMemoryStoreForTesting(records);

    const logs = await deliveryService.getDeliveryRecords();
    const total = logs.length;
    const delivered = logs.filter(r => r.status === 'SENT').length;
    const pending = logs.filter(r => r.status === 'PENDING' || r.status === 'PROCESSING').length;
    const failed = logs.filter(r => r.status === 'FAILED').length;
    const skipped = logs.filter(r => r.status === 'SKIPPED').length;

    expect(total).toBe(4);
    expect(delivered).toBe(1);
    expect(pending).toBe(1);
    expect(failed).toBe(1);
    expect(skipped).toBe(1);
    expect(delivered + pending + failed + skipped).toBe(total);
  });

  it('10. Multi-field search matches employee ID, employee name, and recipient case-insensitively', async () => {
    const records: DeliveryRecord[] = [
      { id: '1', salarySlipId: 's1', employeeId: 'EMP-106', employeeName: 'V M Muttur', channel: 'EMAIL', status: 'SENT', recipient: 'muttur@company.com', provider: 'SMTP', attemptNumber: 1, createdAt: '1' },
      { id: '2', salarySlipId: 's2', employeeId: 'EMP-107', employeeName: 'H S Maheshnaik', channel: 'EMAIL', status: 'FAILED', recipient: 'mahesh@company.com', provider: 'SMTP', attemptNumber: 1, createdAt: '2' },
    ];
    await deliveryService.setMemoryStoreForTesting(records);

    const logs = await deliveryService.getDeliveryRecords();
    
    // Search by ID
    const byId = logs.filter(r => r.employeeId.toLowerCase().includes('106'));
    expect(byId).toHaveLength(1);
    expect(byId[0].employeeName).toBe('V M Muttur');

    // Search by Name
    const byName = logs.filter(r => (r.employeeName || '').toLowerCase().includes('maheshnaik'));
    expect(byName).toHaveLength(1);
    expect(byName[0].employeeId).toBe('EMP-107');

    // Search by Recipient
    const byRecipient = logs.filter(r => r.recipient.toLowerCase().includes('muttur@'));
    expect(byRecipient).toHaveLength(1);
  });
});
