import React from 'react';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
}

export const Dialog: React.FC<DialogProps> = ({ isOpen, onClose, title, children, footer, maxWidth = 'max-w-lg' }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className={`bg-white border border-slate-200 rounded-xl w-full ${maxWidth} shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-lg leading-none">
            ✕
          </button>
        </div>
        <div className="p-6 text-sm text-slate-700">{children}</div>
        {footer && <div className="flex justify-end gap-3 px-6 py-3.5 bg-slate-50 border-t border-slate-100">{footer}</div>}
      </div>
    </div>
  );
};
