import { AppSettings } from '../types/settings';

/**
 * System Settings Service
 */
export const settingsService = {
  async getSettings(): Promise<AppSettings> {
    return {
      id: 'settings-default',
      companyName: 'Acme Corporation',
      emailConfig: {
        provider: 'smtp',
        host: 'smtp.example.com',
        port: 587,
        username: 'user@example.com',
        fromAddress: 'hr@example.com',
        fromName: 'Company HR',
        useTls: true,
        enabled: true,
      },
      whatsappConfig: {
        provider: 'official_cloud_api',
        apiUrl: 'https://graph.facebook.com/v18.0',
        apiToken: 'placeholder_token',
        phoneNumberId: 'placeholder_id',
        enabled: false,
      },
      templateConfig: {
        whatsappTemplate: 'Hello {{name}}, your salary slip for {{month}} is attached.',
        emailSubject: 'Salary Slip - {{month}}',
        emailBodyHtml: '<p>Dear {{name}},</p><p>Please find attached your salary slip.</p>',
      },
      autoProcessScan: true,
      minAutoMatchConfidence: 0.85,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  },

  async saveSettings(settings: Partial<AppSettings>): Promise<boolean> {
    console.log('[Phase 0 Scaffold] Save settings:', settings);
    return true;
  },
};
