import React from 'react';
import { Spinner } from '../common/Spinner';

export const LoadingOverlay: React.FC<{ message?: string }> = ({ message = 'Processing...' }) => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/20 backdrop-blur-xs">
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xl flex flex-col items-center gap-3">
        <Spinner size="lg" />
        <p className="text-sm font-medium text-slate-800">{message}</p>
      </div>
    </div>
  );
};

export const LoadingState: React.FC<{ message?: string }> = ({ message = 'Loading content...' }) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Spinner size="md" />
      <p className="text-xs text-slate-500 font-medium mt-3">{message}</p>
    </div>
  );
};
