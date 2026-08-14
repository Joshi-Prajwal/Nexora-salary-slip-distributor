import { create } from 'zustand';

export type ActivePage = 'dashboard' | 'employees' | 'salary-slips' | 'review' | 'send' | 'history' | 'settings';

interface AppState {
  activePage: ActivePage;
  isLoading: boolean;
  globalError: string | null;
  setActivePage: (page: ActivePage) => void;
  setLoading: (loading: boolean) => void;
  setGlobalError: (error: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  activePage: 'dashboard',
  isLoading: false,
  globalError: null,
  setActivePage: (activePage) => set({ activePage }),
  setLoading: (isLoading) => set({ isLoading }),
  setGlobalError: (globalError) => set({ globalError }),
}));
