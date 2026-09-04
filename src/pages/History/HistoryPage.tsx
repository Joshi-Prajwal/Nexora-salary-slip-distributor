import React, { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';
import { Table, Column } from '../../components/common/Table';
import { SearchInput } from '../../components/common/SearchInput';
import { Select } from '../../components/common/Select';
import { Button } from '../../components/common/Button';
import { Toast } from '../../components/common/Toast';
import { EmptyState } from '../../components/feedback/EmptyState';
import { StatusBadge } from '../../components/feedback/StatusBadge';
import { Dialog } from '../../components/common/Dialog';
import { useHistoryStore } from '../../stores/historyStore';
import { DeliveryRecord } from '../../types/delivery';
import { Clock, RotateCcw, Eye, CheckCircle2, AlertTriangle, Send, ShieldAlert, FileText, User } from 'lucide-react';

export const HistoryPage: React.FC = () => {
  const { historyLogs, isLoading, fetchHistory, retryRecord } = useHistoryStore();
  const [search, setSearch] = useState('');
  const [channelFilter, setChannelFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<DeliveryRecord | null>(null);

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

  // Pure Client-side Filter across Employee ID, Employee Name, Recipient Target, Provider, Status
  const filteredLogs = useMemo(() => {
    const query = search.trim().toLowerCase();
    return historyLogs.filter((log) => {
      if (channelFilter !== 'ALL' && log.channel.toUpperCase() !== channelFilter) {
        return false;
      }
      if (statusFilter !== 'ALL') {
        const normStatus = log.status.toUpperCase();
        if (statusFilter === 'SENT' && normStatus !== 'SENT') return false;
        if (statusFilter === 'FAILED' && normStatus !== 'FAILED') return false;
        if (statusFilter === 'PENDING' && normStatus !== 'PENDING' && normStatus !== 'PROCESSING') return false;
        if (statusFilter === 'SKIPPED' && normStatus !== 'SKIPPED') return false;
      }
      if (!query) return true;

      const empIdMatches = log.employeeId.toLowerCase().includes(query);
      const empNameMatches = (log.employeeName || '').toLowerCase().includes(query);
      const recipientMatches = log.recipient.toLowerCase().includes(query);
      const providerMatches = log.provider.toLowerCase().includes(query);
      const statusMatches = log.status.toLowerCase().includes(query);

      return empIdMatches || empNameMatches || recipientMatches || providerMatches || statusMatches;
    });
  }, [historyLogs, search, channelFilter, statusFilter]);

  // Derived Statistics from Canonical Delivery Records (No Counter Drift)
  const stats = useMemo(() => {
    const total = historyLogs.length;
    let delivered = 0;
    let pending = 0;
    let failed = 0;
    let skipped = 0;

    historyLogs.forEach((rec) => {
      const s = rec.status.toUpperCase();
      if (s === 'SENT') delivered += 1;
      else if (s === 'PENDING' || s === 'PROCESSING') pending += 1;
      else if (s === 'FAILED') failed += 1;
      else if (s === 'SKIPPED') skipped += 1;
      else pending += 1;
    });

    return { total, delivered, pending, failed, skipped };
  }, [historyLogs]);

  const columns: Column<DeliveryRecord>[] = [
    {
      key: 'employeeId',
      header: 'Employee ID',
      render: (item) => (
        <span className="font-mono font-bold text-xs text-slate-900">
          {item.employeeId && item.employeeId !== 'unknown' ? item.employeeId : 'Unidentified'}
        </span>
      ),
    },
    {
      key: 'employeeName',
      header: 'Employee Name',
      render: (item) => (
        <div className="flex items-center gap-1.5">
          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="font-semibold text-xs text-slate-900 truncate max-w-xs">
            {item.employeeName && item.employeeName.trim() !== '' ? item.employeeName : 'Unidentified'}
          </span>
        </div>
      ),
    },
    {
      key: 'period',
      header: 'Period',
      render: (item) => (
        <span className="font-semibold text-xs text-slate-800">
          {item.month && item.year ? `${item.month} ${item.year}` : item.month || '—'}
        </span>
      ),
    },
    {
      key: 'recipient',
      header: 'Recipient Target',
      render: (item) => (
        <span className="font-mono text-xs text-slate-800 truncate max-w-xs block" title={item.recipient}>
          {item.recipient}
        </span>
      ),
    },
    {
      key: 'channel',
      header: 'Channel / Provider',
      render: (item) => (
        <div className="flex items-center gap-1.5 text-xs">
          <span className="font-semibold text-slate-800 uppercase">{item.channel}</span>
          <span className="text-slate-400">({item.provider})</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item) => <StatusBadge status={item.status} />,
    },
    {
      key: 'sentAt',
      header: 'Dispatched At',
      render: (item) => {
        const timestamp = item.completedAt || item.startedAt || item.createdAt;
        if (!timestamp) return <span className="text-xs text-slate-400">-</span>;
        const dateObj = new Date(isNaN(Number(timestamp)) ? timestamp : Number(timestamp) * 1000);
        return (
          <span className="text-xs text-slate-600 font-mono">
            {isNaN(dateObj.getTime()) ? timestamp : dateObj.toLocaleString()}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: 'Action',
      align: 'right',
      render: (item) => (
        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            icon={<Eye className="w-3.5 h-3.5 text-slate-600" />}
            onClick={() => setSelectedRecord(item)}
            className="text-xs text-slate-600 hover:text-slate-900"
          >
            View
          </Button>
          {item.status === 'FAILED' && (
            <Button
              variant="outline"
              size="sm"
              icon={<RotateCcw className="w-3.5 h-3.5 text-rose-600" />}
              onClick={() => handleRetry(item.id)}
              className="text-xs text-rose-600 border-rose-200 hover:bg-rose-50"
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

      {/* Delivery Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="bg-white border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Deliveries</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600">
              <Send className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="bg-white border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Delivered</p>
              <p className="text-2xl font-bold text-emerald-700 mt-1">{stats.delivered}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="bg-white border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Pending</p>
              <p className="text-2xl font-bold text-amber-700 mt-1">{stats.pending}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="bg-white border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-rose-600 uppercase tracking-wider">Failed</p>
              <p className="text-2xl font-bold text-rose-700 mt-1">{stats.failed}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
        </Card>
      </div>

      {isLoading ? (
        <Card className="p-12 text-center text-slate-500 font-medium space-y-3">
          <div className="w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm">Loading delivery history records...</p>
        </Card>
      ) : historyLogs.length === 0 ? (
        <EmptyState
          icon={<Clock className="w-6 h-6 text-slate-400" />}
          title="No Delivery History"
          description="No salary slips have been dispatched yet."
        />
      ) : (
        <Card noPadding>
          {/* Search and Filters Bar */}
          <div className="p-4 border-b border-slate-100 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <SearchInput
                placeholder="Search employee ID or employee name..."
                value={search}
                onSearchChange={setSearch}
                onClear={() => setSearch('')}
              />
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
                  { value: 'PENDING', label: 'Pending' },
                  { value: 'FAILED', label: 'Failed' },
                  { value: 'SKIPPED', label: 'Skipped' },
                ]}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 font-medium pt-1">
              <span>
                Showing <strong className="text-slate-900">{filteredLogs.length}</strong> of{' '}
                <strong className="text-slate-900">{historyLogs.length}</strong> deliveries
              </span>
              {(search || channelFilter !== 'ALL' || statusFilter !== 'ALL') && (
                <button
                  onClick={() => {
                    setSearch('');
                    setChannelFilter('ALL');
                    setStatusFilter('ALL');
                  }}
                  className="text-sky-600 hover:text-sky-800 underline font-semibold"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          <Table<DeliveryRecord>
            columns={columns}
            data={filteredLogs}
            keyExtractor={(item) => item.id}
            onRowClick={(item) => setSelectedRecord(item)}
            emptyMessage="No delivery records match your active search or filter criteria."
          />
        </Card>
      )}

      {/* Delivery Details Audit Modal */}
      {selectedRecord && (
        <Dialog
          isOpen={!!selectedRecord}
          onClose={() => setSelectedRecord(null)}
          title="Delivery Audit Details"
        >
          <div className="space-y-4 text-xs text-slate-700">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="font-semibold text-slate-500 uppercase">Audit Record ID</span>
                <span className="font-mono font-bold text-slate-900">{selectedRecord.id}</span>
              </div>
              <div className="grid grid-cols-3 gap-3 pt-1">
                <div>
                  <span className="text-slate-500 block">Employee ID</span>
                  <span className="font-mono font-bold text-slate-900">
                    {selectedRecord.employeeId && selectedRecord.employeeId !== 'unknown'
                      ? selectedRecord.employeeId
                      : 'Unidentified'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Employee Name</span>
                  <span className="font-semibold text-slate-900">
                    {selectedRecord.employeeName && selectedRecord.employeeName.trim() !== ''
                      ? selectedRecord.employeeName
                      : 'Unidentified'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Salary Period</span>
                  <span className="font-semibold text-slate-900">
                    {selectedRecord.month && selectedRecord.year
                      ? `${selectedRecord.month} ${selectedRecord.year}`
                      : selectedRecord.month || 'Unspecified'}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <div>
                <span className="text-slate-500 block">Recipient Target</span>
                <span className="font-mono font-semibold text-slate-900 truncate block">{selectedRecord.recipient}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Channel / Provider</span>
                <span className="font-semibold text-slate-900 uppercase">
                  {selectedRecord.channel} ({selectedRecord.provider})
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Status</span>
                <StatusBadge status={selectedRecord.status} />
              </div>
              <div>
                <span className="text-slate-500 block">Attempt Number</span>
                <span className="font-mono font-semibold text-slate-900">{selectedRecord.attemptNumber}</span>
              </div>
            </div>

            {selectedRecord.status === 'FAILED' && (selectedRecord.errorCode || selectedRecord.errorMessage) && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1 text-rose-900">
                <div className="flex items-center gap-1.5 font-bold text-rose-700">
                  <ShieldAlert className="w-4 h-4" />
                  <span>Failure Diagnostic</span>
                </div>
                {selectedRecord.errorCode && (
                  <p>
                    <strong>Error Code:</strong> <code className="font-mono">{selectedRecord.errorCode}</code>
                  </p>
                )}
                {selectedRecord.errorMessage && (
                  <p className="leading-relaxed">
                    <strong>Message:</strong> {selectedRecord.errorMessage}
                  </p>
                )}
              </div>
            )}

            {selectedRecord.message && (
              <div className="space-y-1">
                <div className="flex items-center gap-1 font-semibold text-slate-600">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Dispatched Message Preview</span>
                </div>
                <pre className="p-3 bg-slate-900 text-slate-200 rounded-xl text-[11px] font-mono leading-relaxed overflow-x-auto max-h-40">
                  {selectedRecord.message}
                </pre>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-[11px] text-slate-400">
                Created: {selectedRecord.createdAt || 'N/A'}
              </span>
              <div className="flex items-center gap-2">
                {selectedRecord.status === 'FAILED' && (
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<RotateCcw className="w-3.5 h-3.5 text-rose-600" />}
                    onClick={() => {
                      const id = selectedRecord.id;
                      setSelectedRecord(null);
                      handleRetry(id);
                    }}
                    className="text-xs text-rose-600 border-rose-200 hover:bg-rose-50"
                  >
                    Retry Delivery
                  </Button>
                )}
                <Button variant="secondary" size="sm" onClick={() => setSelectedRecord(null)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </Dialog>
      )}

      {toastMessage && (
        <Toast type="info" message={toastMessage} onClose={() => setToastMessage(null)} />
      )}
    </div>
  );
};
