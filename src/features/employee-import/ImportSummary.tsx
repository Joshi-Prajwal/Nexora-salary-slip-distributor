import React from 'react';
import { EmployeeImportSummary } from './importTypes';

interface ImportSummaryProps {
  summary: EmployeeImportSummary;
}

export const ImportSummary: React.FC<ImportSummaryProps> = ({ summary }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl">
      <div className="p-2.5 bg-white border border-slate-200/60 rounded-lg">
        <span className="text-[11px] font-medium text-slate-500 block">Total Rows</span>
        <span className="text-lg font-bold text-slate-900 mt-0.5 block">{summary.totalRows}</span>
      </div>
      <div className="p-2.5 bg-emerald-50/50 border border-emerald-200/60 rounded-lg">
        <span className="text-[11px] font-medium text-emerald-700 block">Ready to Import</span>
        <span className="text-lg font-bold text-emerald-800 mt-0.5 block">{summary.readyCount}</span>
      </div>
      <div className="p-2.5 bg-sky-50/50 border border-sky-200/60 rounded-lg">
        <span className="text-[11px] font-medium text-sky-700 block">Already Imported</span>
        <span className="text-lg font-bold text-sky-800 mt-0.5 block">{summary.alreadyImportedCount}</span>
      </div>
      <div className="p-2.5 bg-amber-50/50 border border-amber-200/60 rounded-lg">
        <span className="text-[11px] font-medium text-amber-700 block">Needs Attention</span>
        <span className="text-lg font-bold text-amber-800 mt-0.5 block">{summary.needsAttentionCount}</span>
      </div>
    </div>
  );
};
