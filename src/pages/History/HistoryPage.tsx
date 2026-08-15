import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';
import { Table, Column } from '../../components/common/Table';
import { SearchInput } from '../../components/common/SearchInput';
import { Select } from '../../components/common/Select';
import { Button } from '../../components/common/Button';
import { Toast } from '../../components/common/Toast';
import { EmptyState } from '../../components/feedback/EmptyState';
import { StatusBadge } from '../../components/feedback/StatusBadge';
import { useHistoryStore } from '../../stores/historyStore';
import { DeliveryRecord } from '../../types/delivery';
import { Clock, RotateCcw } from 'lucide-react';

export const HistoryPage: React.FC = () => {
  const { historyLogs, fetchHistory, retryRecord } = useHistoryStore();
  const [search, setSearch] = useState('');
  const [channelFilter, setChannelFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleRetry = async (recordId: string) => {
    const res = await retryRecord(recordId);
    if (res) {
      setToastMessage(`Retry attempt completed with status: ${res.status}`);
    } else {
      setToastMessage('Failed to retry delivery attempt.');
    }
  };

  const filteredLogs = historyLogs.filter((log) => {
    const matchesSearch = search
      ? log.employeeId.toLowerCase().includes(search.toLowerCase()) ||
        log.salarySlipId.toLowerCase().includes(search.toLowerCase()) ||
        log.recipient.toLowerCase().includes(search.toLowerCase())
      : true;
    const matchesChannel = channelFilter === 'ALL' || log.channel.toUpperCase() === channelFilter;
    const matchesStatus = statusFilter === 'ALL' || log.status.toUpperCase() === statusFilter;
    return matchesSearch && matchesChannel && matchesStatus;
  });

  const columns: Column<DeliveryRecord>[] = [
    {
      key: 'employeeId',
      header: 'Employee ID',
      render: (item) => (
        <span className="font-mono font-semibold text-xs text-slate-900">{item.employeeId}</span>
      ),
    },
    {
      key: 'recipient',
      header: 'Recipient Target',
      render: (item) => (
        <div>
          <span className="font-mono text-xs text-slate-900 block truncate max-w-xs">{item.recipient}</span>
          <span className="text-[11px] text-slate-500 block uppercase font-medium">{item.channel}</span>
        </div>
      ),
    },
    {
      key: 'provider',
      header: 'Provider',
      render: (item) => <span className="text-xs text-slate-600 font-mono">{item.provider}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (item) => <StatusBadge status={item.status} />,
    },
    {
      key: 'sentAt',
      header: 'Dispatched At',
      render: (item) => (
        <span className="text-xs text-slate-500">{item.completedAt || item.createdAt || '-'}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Action',
      align: 'right',
      render: (item) => (
        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
          {item.status === 'FAILED' && (
            <Button
              variant="outline"
              size="sm"
              icon={<RotateCcw className="w-3.5 h-3.5 text-rose-600" />}
              onClick={() => handleRetry(item.id)}
            >
              Retry
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Delivery History"
        subtitle="Audit log of dispatched salary slips, delivery channels, and attempt statuses."
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
            <SearchInput placeholder="Search employee ID, recipient..." value={search} onSearchChange={setSearch} />
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
                { value: 'SKIPPED', label: 'Skipped' },
              ]}
            />
          </div>

          <Table<DeliveryRecord>
            columns={columns}
            data={filteredLogs}
            keyExtractor={(item) => item.id}
            emptyMessage="No delivery history records match your search criteria."
          />
        </Card>
      )}

      {toastMessage && (
        <Toast type="info" message={toastMessage} onClose={() => setToastMessage(null)} />
      )}
    </div>
  );
};
