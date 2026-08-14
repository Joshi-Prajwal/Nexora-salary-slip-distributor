import React from 'react';

interface AlertProps {
  type?: 'info' | 'warning' | 'error' | 'success';
  title?: string;
  children: React.ReactNode;
}

export const Alert: React.FC<AlertProps> = ({ type = 'info', title, children }) => {
  const styles = {
    info: 'bg-sky-50/70 border-sky-200 text-sky-900',
    warning: 'bg-amber-50/70 border-amber-200 text-amber-900',
    error: 'bg-rose-50/70 border-rose-200 text-rose-900',
    success: 'bg-emerald-50/70 border-emerald-200 text-emerald-900',
  };

  return (
    <div className={`p-4 rounded-xl border text-sm ${styles[type]}`}>
      {title && <h4 className="font-semibold text-xs tracking-wide uppercase mb-1">{title}</h4>}
      <div className="text-sm leading-relaxed">{children}</div>
    </div>
  );
};
