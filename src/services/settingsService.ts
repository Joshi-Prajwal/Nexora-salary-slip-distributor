import { AppSettings } from '../types/settings';

/**
 * System Settings Service
 */
export const settingsService = {
  async getSettings(): Promise<AppSettings> {
    return {
      id: 'settings-default',
      companyName: '',
      emailConfig: {
        provider: 'smtp',
        host: '',
        port: 587,
        username: '',
        password: '',
        fromAddress: '',
        fromName: '',
        useTls: true,
        enabled: true,
      },
      whatsappConfig: {
        provider: 'official_cloud_api',
        apiUrl: '',
        apiToken: '',
        phoneNumberId: '',
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

  async saveSettings(_settings: Partial<AppSettings>): Promise<boolean> {
    return true;
  },
};
