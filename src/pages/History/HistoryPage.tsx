import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';
import { Table, Column } from '../../components/common/Table';
import { SearchInput } from '../../components/common/SearchInput';
import { Select } from '../../components/common/Select';
import { EmptyState } from '../../components/feedback/EmptyState';
import { StatusBadge } from '../../components/feedback/StatusBadge';
import { useHistoryStore } from '../../stores/historyStore';
import { SendJob } from '../../types/sending';
import { Clock } from 'lucide-react';

export const HistoryPage: React.FC = () => {
  const { historyLogs, fetchHistory } = useHistoryStore();
  const [search, setSearch] = useState('');
  const [channelFilter, setChannelFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const filteredLogs = historyLogs.filter((log) => {
    const matchesSearch = search
      ? log.employeeId.toLowerCase().includes(search.toLowerCase()) ||
        log.salarySlipId.toLowerCase().includes(search.toLowerCase())
      : true;
    const matchesChannel = channelFilter === 'ALL' || log.channel === channelFilter;
    const matchesStatus = statusFilter === 'ALL' || log.status === statusFilter;
    return matchesSearch && matchesChannel && matchesStatus;
  });

  const columns: Column<SendJob>[] = [
    { key: 'employeeId', header: 'Employee ID' },
    { key: 'salarySlipId', header: 'Salary Slip File' },
    { key: 'channel', header: 'Channel' },
    {
      key: 'status',
      header: 'Status',
      render: (item) => <StatusBadge status={item.status} />,
    },
    {
      key: 'sentAt',
      header: 'Dispatched At',
      render: (item) => <span className="text-xs text-slate-500">{item.sentAt || '-'}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="History"
        subtitle="View previously sent salary slips and delivery status."
      />

      {historyLogs.length === 0 ? (
        <EmptyState
          icon={<Clock className="w-6 h-6 text-slate-400" />}
          title="No delivery history yet"
          description="Completed deliveries will appear here."
        />
      ) : (
        <Card noPadding>
          {/* Controls Bar */}
          <div className="p-4 border-b border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-3">
            <SearchInput placeholder="Search recipient or ID..." value={search} onSearchChange={setSearch} />
            <Select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              options={[
                { value: 'ALL', label: 'All Channels' },
                { value: 'EMAIL', label: 'Email' },
                { value: 'WHATSAPP', label: 'WhatsApp' },
              ]}
            />
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: 'ALL', label: 'All Statuses' },
                { value: 'SENT', label: 'Delivered' },
                { value: 'FAILED', label: 'Failed' },
                { value: 'RETRYING', label: 'Retrying' },
              ]}
            />
          </div>

          <Table<SendJob>
            columns={columns}
            data={filteredLogs}
            keyExtractor={(item) => item.id}
            emptyMessage="No delivery history records match your search."
          />
        </Card>
      )}
    </div>
  );
};
