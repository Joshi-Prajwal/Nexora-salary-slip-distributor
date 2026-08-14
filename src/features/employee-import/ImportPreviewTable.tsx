import React from 'react';
import { EmployeeImportRowResult } from './importTypes';
import { Table, Column } from '../../components/common/Table';

interface ImportPreviewTableProps {
  rows: EmployeeImportRowResult[];
}

export const ImportPreviewTable: React.FC<ImportPreviewTableProps> = ({ rows }) => {
  const columns: Column<EmployeeImportRowResult>[] = [
    {
      key: 'status',
      header: 'Status',
      render: (item) => {
        if (item.status === 'READY') {
          return (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Ready
            </span>
          );
        }
        if (item.status === 'ALREADY_IMPORTED') {
          return (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
              Already imported
            </span>
          );
        }
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            Needs attention
          </span>
        );
      },
    },
    {
      key: 'data',
      header: 'Employee ID',
      render: (item) => <span className="font-mono font-medium text-slate-800">{item.data.employeeId || '-'}</span>,
    },
    {
      key: 'data',
      header: 'Full Name',
      render: (item) => <span className="font-medium text-slate-900">{item.data.fullName || '-'}</span>,
    },
    {
      key: 'data',
      header: 'Department',
      render: (item) => <span className="text-slate-600">{item.data.department || '-'}</span>,
    },
    {
      key: 'data',
      header: 'Email Address',
      render: (item) => <span className="text-slate-600">{item.data.email || '-'}</span>,
    },
    {
      key: 'data',
      header: 'Phone Number',
      render: (item) => <span className="text-slate-600">{item.data.phone || '-'}</span>,
    },
    {
      key: 'errors',
      header: 'Details / Reasons',
      render: (item) => {
        if (item.errors.length > 0) {
          return <span className="text-xs text-rose-600 font-medium">{item.errors.join(' ')}</span>;
        }
        if (item.status === 'ALREADY_IMPORTED') {
          return <span className="text-xs text-slate-400">Already imported</span>;
        }
        if (item.warnings.length > 0) {
          return <span className="text-xs text-amber-600 font-medium">{item.warnings.join(' ')}</span>;
        }
        return <span className="text-xs text-emerald-600 font-medium">Valid employee record</span>;
      },
    },
  ];

  return (
    <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-lg">
      <Table<EmployeeImportRowResult>
        columns={columns}
        data={rows}
        keyExtractor={(item) => `row-${item.rowIndex}-${item.data.employeeId}`}
        emptyMessage="No rows found in file."
      />
    </div>
  );
};
