import React from 'react';
import { useToastStore } from '../../stores/toastStore';

export const ToastContainer: React.FC = () => {
  const toasts = useToastStore((state) => state.toasts);
  const removeToast = useToastStore((state) => state.removeToast);

  if (toasts.length === 0) return null;

  const typeStyles = {
    success: 'bg-emerald-900 text-emerald-100 border-emerald-700',
    error: 'bg-rose-900 text-rose-100 border-rose-700',
    info: 'bg-slate-900 text-slate-100 border-slate-700',
    warning: 'bg-amber-900 text-amber-100 border-amber-700',
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          aria-live="polite"
          className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-lg border shadow-lg text-xs font-medium ${typeStyles[toast.type]} animate-in slide-in-from-bottom-5 duration-200`}
        >
          <span>{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            aria-label="Dismiss notification"
            className="opacity-70 hover:opacity-100 transition-opacity p-0.5"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
};
