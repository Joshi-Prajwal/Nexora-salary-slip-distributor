import React, { useEffect, useRef } from 'react';

export interface ToastProps {
  id?: string;
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
  onClose?: () => void;
}

export const Toast: React.FC<ToastProps> = ({
  id,
  message,
  type = 'info',
  duration = 5000,
  onClose,
}) => {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!duration || duration <= 0) return;
    const timer = setTimeout(() => {
      onCloseRef.current?.();
    }, duration);

    return () => {
      clearTimeout(timer);
    };
  }, [id, duration]);

  const typeStyles = {
    success: 'bg-emerald-900 text-emerald-100 border-emerald-700',
    error: 'bg-rose-900 text-rose-100 border-rose-700',
    info: 'bg-slate-900 text-slate-100 border-slate-700',
    warning: 'bg-amber-900 text-amber-100 border-amber-700',
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg text-xs font-medium ${typeStyles[type]} animate-in slide-in-from-bottom-5 duration-200`}
    >
      <span>{message}</span>
      {onClose && (
        <button
          onClick={onClose}
          aria-label="Dismiss notification"
          className="opacity-70 hover:opacity-100 transition-opacity p-0.5"
        >
          ✕
        </button>
      )}
    </div>
  );
};
