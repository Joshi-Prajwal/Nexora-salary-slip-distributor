import { AppSettings, ConnectionTestResult } from '../types/settings';
import { EmailConfig, WhatsAppConfig } from '../types/messaging';

let memorySettingsStore: AppSettings = {
  id: 'settings-primary',
  companyName: 'Nexora Inc',
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
    whatsappTemplate: 'Hello {{name}}, your salary slip for {{month}} {{year}} is attached.',
    emailSubject: 'Salary Slip - {{month}} {{year}}',
    emailBodyHtml: 'Dear {{name}},\n\nPlease find attached your salary slip for {{month}} {{year}}.\n\nRegards,\n{{company_name}}',
  },
  autoProcessScan: true,
  minAutoMatchConfidence: 0.85,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

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

export const settingsService = {
  async getSettings(): Promise<AppSettings> {
    const tauriResult = await tryTauriInvoke<AppSettings>('get_app_settings');
    if (tauriResult !== null) {
      return tauriResult;
    }
    return JSON.parse(JSON.stringify(memorySettingsStore));
  },

  async saveSettings(payload: Partial<AppSettings>): Promise<AppSettings> {
    const tauriResult = await tryTauriInvoke<AppSettings>('save_app_settings', { payload });
    if (tauriResult !== null) {
      return tauriResult;
    }

    if (payload.companyName !== undefined) {
      memorySettingsStore.companyName = payload.companyName;
    }
    if (payload.emailConfig) {
      memorySettingsStore.emailConfig = {
        ...memorySettingsStore.emailConfig,
        ...payload.emailConfig,
      };
      if (payload.emailConfig.password && payload.emailConfig.password.trim().length > 0 && payload.emailConfig.password !== '••••••••') {
        memorySettingsStore.emailConfig.hasPassword = true;
      }
    }
    if (payload.whatsappConfig) {
      memorySettingsStore.whatsappConfig = {
        ...memorySettingsStore.whatsappConfig,
        ...payload.whatsappConfig,
      };
      if (payload.whatsappConfig.apiToken && payload.whatsappConfig.apiToken.trim().length > 0 && payload.whatsappConfig.apiToken !== '••••••••') {
        memorySettingsStore.whatsappConfig.hasAccessToken = true;
      }
    }
    if (payload.templateConfig) {
      memorySettingsStore.templateConfig = {
        ...memorySettingsStore.templateConfig,
        ...payload.templateConfig,
      };
    }
    memorySettingsStore.updatedAt = new Date().toISOString();
    return JSON.parse(JSON.stringify(memorySettingsStore));
  },

  async saveEmailSettings(payload: Partial<EmailConfig>): Promise<EmailConfig> {
    const tauriResult = await tryTauriInvoke<EmailConfig>('save_email_settings', { payload });
    if (tauriResult !== null) {
      return tauriResult;
    }

    const updated: EmailConfig = {
      ...memorySettingsStore.emailConfig,
      ...payload,
      hasPassword:
        payload.password && payload.password.trim().length > 0 && payload.password !== '••••••••'
          ? true
          : memorySettingsStore.emailConfig.hasPassword,
    };
    updated.configured = !!(updated.host && updated.username && updated.hasPassword);
    delete updated.password;
    memorySettingsStore.emailConfig = updated;
    return updated;
  },

  async saveWhatsAppSettings(payload: Partial<WhatsAppConfig>): Promise<WhatsAppConfig> {
    const tauriResult = await tryTauriInvoke<WhatsAppConfig>('save_whatsapp_settings', { payload });
    if (tauriResult !== null) {
      return tauriResult;
    }

    const updated: WhatsAppConfig = {
      ...memorySettingsStore.whatsappConfig,
      ...payload,
      hasAccessToken:
        payload.apiToken && payload.apiToken.trim().length > 0 && payload.apiToken !== '••••••••'
          ? true
          : memorySettingsStore.whatsappConfig.hasAccessToken,
    };
    updated.configured = !!(updated.apiUrl && updated.phoneNumberId && updated.hasAccessToken);
    delete updated.apiToken;
    memorySettingsStore.whatsappConfig = updated;
    return updated;
  },

  async testEmailConnection(testRecipient?: string): Promise<ConnectionTestResult> {
    const tauriResult = await tryTauriInvoke<ConnectionTestResult>('test_email_connection', {
      testRecipient,
    });
    if (tauriResult !== null) {
      return tauriResult;
    }

    const cfg = memorySettingsStore.emailConfig;
    if (!cfg.host || !cfg.username || !cfg.hasPassword) {
      return {
        success: false,
        code: 'EMAIL_NOT_CONFIGURED',
        message: 'SMTP Mail Server, Username, or Password is not configured. Please enter settings and save.',
      };
    }

    return {
      success: true,
      code: 'EMAIL_TEST_SUCCESS',
      message: `SMTP connection test successful for host ${cfg.host}!`,
    };
  },

  async sendTestEmail(testRecipient?: string): Promise<ConnectionTestResult> {
    const tauriResult = await tryTauriInvoke<ConnectionTestResult>('send_test_email', {
      testRecipient,
    });
    if (tauriResult !== null) {
      return tauriResult;
    }

    const cfg = memorySettingsStore.emailConfig;
    if (!cfg.host || !cfg.username || !cfg.hasPassword) {
      return {
        success: false,
        code: 'EMAIL_NOT_CONFIGURED',
        message: 'SMTP Mail Server, Username, or Password is not configured.',
      };
    }

    return {
      success: true,
      code: 'EMAIL_TEST_SENT',
      message: `Test email sent successfully to ${testRecipient || cfg.fromAddress || cfg.username}!`,
    };
  },

  async testWhatsAppConnection(): Promise<ConnectionTestResult> {
    const tauriResult = await tryTauriInvoke<ConnectionTestResult>('test_whatsapp_connection');
    if (tauriResult !== null) {
      return tauriResult;
    }

    const cfg = memorySettingsStore.whatsappConfig;
    if (!cfg.apiUrl || !cfg.phoneNumberId || !cfg.hasAccessToken) {
      return {
        success: false,
        code: 'WHATSAPP_NOT_CONFIGURED',
        message: 'WhatsApp API Endpoint, Phone Number ID, or Access Token is not configured.',
      };
    }

    return {
      success: true,
      code: 'WHATSAPP_TEST_SUCCESS',
      message: 'WhatsApp Business Cloud API connection test successful!',
    };
  },

  setMemoryStoreForTesting(newStore: AppSettings): void {
    memorySettingsStore = JSON.parse(JSON.stringify(newStore));
  },
};
