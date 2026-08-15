import { create } from 'zustand';
import { AppSettings, ConnectionTestResult } from '../types/settings';
import { EmailConfig, WhatsAppConfig, MessageTemplateConfig } from '../types/messaging';
import { settingsService } from '../services/settingsService';

interface SettingsState {
  settings: AppSettings | null;
  isLoading: boolean;
  isSaving: boolean;
  fetchSettings: () => Promise<AppSettings | null>;
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<boolean>;
  saveEmailConfig: (emailPayload: Partial<EmailConfig>) => Promise<boolean>;
  saveWhatsAppConfig: (whatsappPayload: Partial<WhatsAppConfig>) => Promise<boolean>;
  saveTemplateConfig: (templatePayload: Partial<MessageTemplateConfig>) => Promise<boolean>;
  testEmailConnection: (recipient?: string) => Promise<ConnectionTestResult>;
  sendTestEmail: (recipient?: string) => Promise<ConnectionTestResult>;
  testWhatsAppConnection: () => Promise<ConnectionTestResult>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: null,
  isLoading: false,
  isSaving: false,

  fetchSettings: async () => {
    set({ isLoading: true });
    try {
      const settings = await settingsService.getSettings();
      set({ settings, isLoading: false });
      return settings;
    } catch {
      set({ isLoading: false });
      return null;
    }
  },

  updateSettings: async (newSettings) => {
    set({ isSaving: true });
    try {
      const updated = await settingsService.saveSettings(newSettings);
      set({ settings: updated, isSaving: false });
      return true;
    } catch {
      set({ isSaving: false });
      return false;
    }
  },

  saveEmailConfig: async (emailPayload) => {
    set({ isSaving: true });
    try {
      const updatedEmail = await settingsService.saveEmailSettings(emailPayload);
      const current = get().settings;
      if (current) {
        set({
          settings: {
            ...current,
            emailConfig: updatedEmail,
          },
          isSaving: false,
        });
      } else {
        await get().fetchSettings();
      }
      set({ isSaving: false });
      return true;
    } catch {
      set({ isSaving: false });
      return false;
    }
  },

  saveWhatsAppConfig: async (whatsappPayload) => {
    set({ isSaving: true });
    try {
      const updatedWa = await settingsService.saveWhatsAppSettings(whatsappPayload);
      const current = get().settings;
      if (current) {
        set({
          settings: {
            ...current,
            whatsappConfig: updatedWa,
          },
          isSaving: false,
        });
      } else {
        await get().fetchSettings();
      }
      set({ isSaving: false });
      return true;
    } catch {
      set({ isSaving: false });
      return false;
    }
  },

  saveTemplateConfig: async (templatePayload) => {
    const current = get().settings;
    if (current) {
      return await get().updateSettings({
        templateConfig: {
          ...current.templateConfig,
          ...templatePayload,
        },
      });
    }
    return false;
  },

  testEmailConnection: async (recipient) => {
    return await settingsService.testEmailConnection(recipient);
  },

  sendTestEmail: async (recipient) => {
    return await settingsService.sendTestEmail(recipient);
  },

  testWhatsAppConnection: async () => {
    return await settingsService.testWhatsAppConnection();
  },
}));
