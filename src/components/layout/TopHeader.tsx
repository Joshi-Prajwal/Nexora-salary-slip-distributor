import React from 'react';
import { useAppStore } from '../../stores/appStore';

export const TopHeader: React.FC = () => {
  const { activePage } = useAppStore();

  const titleMap: Record<string, string> = {
    dashboard: 'Distribution Overview',
    employees: 'Employee Database',
    'salary-slips': 'Salary Slip Files',
    review: 'Review & Approvals',
    send: 'Send Salary Slips',
    history: 'Distribution History',
    settings: 'Application Settings',
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between shrink-0 z-10 shadow-2xs">
      <div>
        <h2 className="text-sm font-semibold text-slate-800">{titleMap[activePage] || 'Nexora'}</h2>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-slate-500 font-medium bg-slate-100 px-3 py-1 rounded-full border border-slate-200/60">
          Desktop Edition
        </span>
      </div>
    </header>
  );
};
