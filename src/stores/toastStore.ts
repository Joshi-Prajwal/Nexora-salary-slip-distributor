import { create } from 'zustand';

export interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

interface ToastState {
  toasts: ToastItem[];
  addToast: (
    message: string,
    type?: 'success' | 'error' | 'info' | 'warning',
    duration?: number
  ) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

const timerMap = new Map<string, ReturnType<typeof setTimeout>>();

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  addToast: (message, type = 'info', duration = 5000) => {
    const id = crypto.randomUUID();
    const newToast: ToastItem = { id, message, type, duration };

    set((state) => ({
      toasts: [...state.toasts, newToast],
    }));

    if (duration > 0) {
      const timer = setTimeout(() => {
        get().removeToast(id);
      }, duration);
      timerMap.set(id, timer);
    }

    return id;
  },

  removeToast: (id) => {
    const timer = timerMap.get(id);
    if (timer) {
      clearTimeout(timer);
      timerMap.delete(id);
    }

    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  clearToasts: () => {
    timerMap.forEach((timer) => clearTimeout(timer));
    timerMap.clear();
    set({ toasts: [] });
  },
}));

export const showToast = (
  message: string,
  type: 'success' | 'error' | 'info' | 'warning' = 'info',
  duration = 5000
) => {
  return useToastStore.getState().addToast(message, type, duration);
};
