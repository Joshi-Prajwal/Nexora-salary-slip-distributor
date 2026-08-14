import React, { useState } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';
import { Table, Column } from '../../components/common/Table';
import { SearchInput } from '../../components/common/SearchInput';
import { Select } from '../../components/common/Select';
import { StatusBadge } from '../../components/feedback/StatusBadge';
import { EmptyState } from '../../components/feedback/EmptyState';
import { Clock } from 'lucide-react';

interface HistoryItem {
  id: string;
  employeeName: string;
  employeeId: string;
  salarySlipName: string;
  channel: string;
  sentAt: string;
  status: string;
}

export const HistoryPage: React.FC = () => {
  const [channelFilter, setChannelFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const mockHistoryItems: HistoryItem[] = [
    {
      id: 'log-1',
      employeeName: 'John Doe',
      employeeId: 'EMP001',
      salarySlipName: 'EMP001_Jan_2026.pdf',
      channel: 'Email (SMTP)',
      sentAt: '2026-08-14 10:30 AM',
      status: 'DELIVERED',
    },
    {
      id: 'log-2',
      employeeName: 'Sam Taylor',
      employeeId: 'EMP002',
      salarySlipName: 'EMP002_Jan_2026.pdf',
      channel: 'WhatsApp Business',
      sentAt: '2026-08-14 10:31 AM',
      status: 'DELIVERED',
    },
  ];

  const columns: Column<HistoryItem>[] = [
    {
      key: 'employeeName',
      header: 'Employee',
      render: (item) => (
        <div>
          <span className="font-medium text-slate-900">{item.employeeName}</span>
          <span className="text-xs text-slate-400 block">{item.employeeId}</span>
        </div>
      ),
    },
    { key: 'salarySlipName', header: 'Salary Slip File' },
    { key: 'channel', header: 'Delivery Channel' },
    { key: 'sentAt', header: 'Sent At' },
    {
      key: 'status',
      header: 'Status',
      render: (item) => <StatusBadge status={item.status} />,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="History" subtitle="View previously sent salary slips and delivery status." />

      <Card noPadding>
        {/* Filter Controls */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <SearchInput
            placeholder="Search history by employee or file..."
            value={searchQuery}
            onSearchChange={setSearchQuery}
          />
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="w-36">
              <Select
                value={channelFilter}
                onChange={(e) => setChannelFilter(e.target.value)}
                options={[
                  { value: 'ALL', label: 'All Channels' },
                  { value: 'EMAIL', label: 'Email Only' },
                  { value: 'WHATSAPP', label: 'WhatsApp Only' },
                ]}
              />
            </div>
            <div className="w-36">
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={[
                  { value: 'ALL', label: 'All Statuses' },
                  { value: 'DELIVERED', label: 'Delivered' },
                  { value: 'FAILED', label: 'Failed' },
                  { value: 'PENDING', label: 'Pending' },
                ]}
              />
            </div>
          </div>
        </div>

        {mockHistoryItems.length === 0 ? (
          <EmptyState
            icon={<Clock className="w-6 h-6 text-slate-400" />}
            title="No history logs recorded"
            description="Sent salary slips and delivery logs will appear here after starting a distribution batch."
          />
        ) : (
          <Table<HistoryItem>
            columns={columns}
            data={mockHistoryItems}
            keyExtractor={(item) => item.id}
            emptyMessage="No historical distribution logs match the selected filters."
          />
        )}
      </Card>
    </div>
  );
};
