import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  statusBadge?: React.ReactNode;
  trend?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, icon, statusBadge, trend }) => {
  return (
    <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-2xs">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500">{label}</span>
        <div className="p-2.5 rounded-lg bg-slate-50 text-slate-600 border border-slate-100">{icon}</div>
      </div>
      <div className="mt-3 flex items-baseline justify-between">
        <span className="text-2xl font-bold text-slate-900 tracking-tight">{value}</span>
        {statusBadge && <div>{statusBadge}</div>}
      </div>
      {trend && <p className="text-[11px] text-slate-400 mt-1.5">{trend}</p>}
    </div>
  );
};
