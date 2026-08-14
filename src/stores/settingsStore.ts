import { create } from 'zustand';
import { AppSettings } from '../types/settings';
import { settingsService } from '../services/settingsService';

interface SettingsState {
  settings: AppSettings | null;
  isLoading: boolean;
  fetchSettings: () => Promise<void>;
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: null,
  isLoading: false,
  fetchSettings: async () => {
    set({ isLoading: true });
    try {
      const settings = await settingsService.getSettings();
      set({ settings, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },
  updateSettings: async (newSettings) => {
    const current = get().settings;
    if (current) {
      const updated = { ...current, ...newSettings };
      await settingsService.saveSettings(updated);
      set({ settings: updated });
    }
  },
}));
