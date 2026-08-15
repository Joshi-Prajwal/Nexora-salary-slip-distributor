import { describe, it, expect, beforeEach } from 'vitest';
import { settingsService } from '../../../src/services/settingsService';

describe('Settings Service & Provider Configuration Unit Tests', () => {
  beforeEach(() => {
    settingsService.setMemoryStoreForTesting({
      id: 'settings-primary',
      companyName: 'Nexora Corp',
      emailConfig: {
        provider: 'smtp',
        host: '',
        port: 587,
        username: '',
        hasPassword: false,
        fromAddress: '',
        fromName: '',
        securityMode: 'STARTTLS',
        useTls: true,
        enabled: false,
        configured: false,
      },
      whatsappConfig: {
        provider: 'official_cloud_api',
        apiUrl: '',
        hasAccessToken: false,
        phoneNumberId: '',
        enabled: false,
        configured: false,
      },
      templateConfig: {
        whatsappTemplate: 'Hello {{name}}, salary slip is attached.',
        emailSubject: 'Salary Slip - {{month}}',
        emailBodyHtml: 'Dear {{name}}, please find attached your salary slip.',
      },
      autoProcessScan: true,
      minAutoMatchConfidence: 0.85,
      createdAt: '1000000',
      updatedAt: '1000000',
    });
  });

  it('1. Fetches initial settings with empty/unconfigured state', async () => {
    const settings = await settingsService.getSettings();
    expect(settings).toBeDefined();
    expect(settings.emailConfig.configured).toBe(false);
    expect(settings.emailConfig.hasPassword).toBe(false);
    expect(settings.whatsappConfig.configured).toBe(false);
  });

  it('2. Saves email configuration and sets hasPassword flag without exposing plaintext password', async () => {
    const saved = await settingsService.saveEmailSettings({
      host: 'smtp.gmail.com',
      port: 587,
      username: 'joshiiprajwal@gmail.com',
      password: 'real_app_password',
      fromAddress: 'joshiiprajwal@gmail.com',
      fromName: 'Nexora HR',
      securityMode: 'STARTTLS',
    });

    expect(saved.host).toBe('smtp.gmail.com');
    expect(saved.username).toBe('joshiiprajwal@gmail.com');
    expect(saved.hasPassword).toBe(true);
    expect(saved.password).toBeUndefined();
    expect(saved.configured).toBe(true);
  });

  it('3. Preserves existing password when user saves with masked string', async () => {
    // 1st save: Set password
    await settingsService.saveEmailSettings({
      host: 'smtp.gmail.com',
      port: 587,
      username: 'joshiiprajwal@gmail.com',
      password: 'real_app_password',
    });

    // 2nd save: Pass masked string '••••••••'
    const saved2 = await settingsService.saveEmailSettings({
      host: 'smtp.gmail.com',
      port: 587,
      username: 'joshiiprajwal@gmail.com',
      password: '••••••••',
    });

    expect(saved2.hasPassword).toBe(true);
    expect(saved2.configured).toBe(true);
  });

  it('4. Saves WhatsApp configuration and sets hasAccessToken flag', async () => {
    const saved = await settingsService.saveWhatsAppSettings({
      apiUrl: 'https://graph.facebook.com/v18.0',
      phoneNumberId: '100020003000',
      apiToken: 'EAAB_real_token',
    });

    expect(saved.apiUrl).toBe('https://graph.facebook.com/v18.0');
    expect(saved.phoneNumberId).toBe('100020003000');
    expect(saved.hasAccessToken).toBe(true);
    expect(saved.apiToken).toBeUndefined();
    expect(saved.configured).toBe(true);
  });

  it('5. Test Email Connection returns EMAIL_NOT_CONFIGURED when unconfigured', async () => {
    const res = await settingsService.testEmailConnection();
    expect(res.success).toBe(false);
    expect(res.code).toBe('EMAIL_NOT_CONFIGURED');
  });

  it('6. Test Email Connection returns EMAIL_TEST_SUCCESS when configured', async () => {
    await settingsService.saveEmailSettings({
      host: 'smtp.gmail.com',
      port: 587,
      username: 'joshiiprajwal@gmail.com',
      password: 'app_password_123',
    });

    const res = await settingsService.testEmailConnection();
    expect(res.success).toBe(true);
    expect(res.code).toBe('EMAIL_TEST_SUCCESS');
  });

  it('7. Send Test Email transmits test email and returns EMAIL_TEST_SENT', async () => {
    await settingsService.saveEmailSettings({
      host: 'smtp.gmail.com',
      port: 587,
      username: 'joshiiprajwal@gmail.com',
      password: 'app_password_123',
      fromAddress: 'joshiiprajwal@gmail.com',
    });

    const res = await settingsService.sendTestEmail('recipient@example.com');
    expect(res.success).toBe(true);
    expect(res.code).toBe('EMAIL_TEST_SENT');
  });

  it('8. Test WhatsApp Connection returns WHATSAPP_NOT_CONFIGURED when unconfigured', async () => {
    const res = await settingsService.testWhatsAppConnection();
    expect(res.success).toBe(false);
    expect(res.code).toBe('WHATSAPP_NOT_CONFIGURED');
  });

  it('9. Test WhatsApp Connection returns WHATSAPP_TEST_SUCCESS when configured', async () => {
    await settingsService.saveWhatsAppSettings({
      apiUrl: 'https://graph.facebook.com/v18.0',
      phoneNumberId: '100020003000',
      apiToken: 'token_123',
    });

    const res = await settingsService.testWhatsAppConnection();
    expect(res.success).toBe(true);
    expect(res.code).toBe('WHATSAPP_TEST_SUCCESS');
  });
});
