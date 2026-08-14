import React from 'react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose?: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type = 'info', onClose }) => {
  const typeStyles = {
    success: 'bg-emerald-900 text-emerald-100 border-emerald-700',
    error: 'bg-rose-900 text-rose-100 border-rose-700',
    info: 'bg-slate-900 text-slate-100 border-slate-700',
  };

  return (
    <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg text-xs font-medium ${typeStyles[type]} animate-in slide-in-from-bottom-5 duration-200`}>
      <span>{message}</span>
      {onClose && (
        <button onClick={onClose} className="opacity-70 hover:opacity-100">
          ✕
        </button>
      )}
    </div>
  );
};
