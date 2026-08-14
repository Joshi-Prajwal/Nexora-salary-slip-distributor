import React from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';
import { Table, Column } from '../../components/common/Table';
import { Button } from '../../components/common/Button';
import { SearchInput } from '../../components/common/SearchInput';
import { EmptyState } from '../../components/feedback/EmptyState';
import { StatusBadge } from '../../components/feedback/StatusBadge';
import { useSalarySlipStore } from '../../stores/salarySlipStore';
import { SalarySlip } from '../../types/salarySlip';
import { FolderOpen, FileText } from 'lucide-react';

export const SalarySlipsPage: React.FC = () => {
  const { slips, scanFolder, isScanning, scannedFolderPath } = useSalarySlipStore();

  const handleSelectFolder = () => {
    scanFolder('');
  };

  const columns: Column<SalarySlip>[] = [
    { key: 'fileName', header: 'File Name' },
    {
      key: 'detectedName',
      header: 'Identified Employee',
      render: (item: SalarySlip) => (
        <div>
          <span className="font-medium">{item.detectedName || 'Unidentified'}</span>
          {item.detectedEmployeeId && <span className="text-xs text-slate-400 block">{item.detectedEmployeeId}</span>}
        </div>
      ),
    },
    { key: 'extractionMethod', header: 'Identification' },
    {
      key: 'matchStatus',
      header: 'Status',
      render: (item: SalarySlip) => <StatusBadge status={item.matchStatus} />,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Salary Slips"
        subtitle="Scan your salary slip folder and prepare files for review."
        action={
          <Button
            variant="primary"
            icon={<FolderOpen className="w-4 h-4" />}
            isLoading={isScanning}
            onClick={handleSelectFolder}
          >
            Select Folder
          </Button>
        }
      />

      {slips.length === 0 ? (
        <EmptyState
          icon={<FileText className="w-6 h-6 text-slate-400" />}
          title="No salary slips found"
          description="Select a folder containing salary slip files to get started."
          actionLabel="Select Folder"
          onAction={handleSelectFolder}
        />
      ) : (
        <Card noPadding>
          <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-4">
            <SearchInput placeholder="Search salary slip files..." />
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <span>Path: {scannedFolderPath}</span>
              <span className="text-slate-300">•</span>
              <span>{slips.length} files scanned</span>
            </div>
          </div>
          <Table<SalarySlip>
            columns={columns}
            data={slips}
            keyExtractor={(item) => item.id}
            emptyMessage="No salary slips found in folder."
          />
        </Card>
      )}
    </div>
  );
};
