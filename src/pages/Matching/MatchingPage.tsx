import React from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';
import { Table, Column } from '../../components/common/Table';
import { Button } from '../../components/common/Button';
import { Alert } from '../../components/common/Alert';
import { StatusBadge } from '../../components/feedback/StatusBadge';
import { useMatchingStore } from '../../stores/matchingStore';
import { formatConfidence } from '../../utils/formatting/formatter';
import { CheckCircle2, XCircle, ShieldCheck } from 'lucide-react';

interface ReviewItem {
  id: string;
  salarySlipName: string;
  employeeName: string;
  employeeId: string;
  matchSignal: string;
  confidence: number;
  status: string;
}

export const MatchingPage: React.FC = () => {
  const { confirmMatch, rejectMatch } = useMatchingStore();

  const mockReviewItems: ReviewItem[] = [
    {
      id: 'rev-1',
      salarySlipName: 'EMP001_Jan_2026.pdf',
      employeeName: 'John Doe',
      employeeId: 'EMP001',
      matchSignal: 'Exact Employee ID',
      confidence: 0.98,
      status: 'READY',
    },
    {
      id: 'rev-2',
      salarySlipName: 'Scanned_Slip_002.pdf',
      employeeName: 'Jane Smith',
      employeeId: 'EMP002',
      matchSignal: 'Name similarity match',
      confidence: 0.65,
      status: 'NEEDS_REVIEW',
    },
  ];

  const columns: Column<ReviewItem>[] = [
    { key: 'salarySlipName', header: 'Salary Slip File' },
    {
      key: 'employeeName',
      header: 'Matched Employee',
      render: (item) => (
        <div>
          <span className="font-medium">{item.employeeName}</span>
          <span className="text-xs text-slate-400 block">{item.employeeId}</span>
        </div>
      ),
    },
    { key: 'matchSignal', header: 'Match Signal' },
    {
      key: 'confidence',
      header: 'Confidence',
      render: (item) => (
        <div className="flex items-center gap-2">
          <span className="font-semibold text-xs">{formatConfidence(item.confidence)}</span>
          <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${
                item.confidence >= 0.85 ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
              style={{ width: `${item.confidence * 100}%` }}
            />
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item) => <StatusBadge status={item.status} />,
    },
    {
      key: 'action',
      header: 'Action',
      align: 'right',
      render: (item) => (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
            onClick={() => confirmMatch(item.id, item.employeeId)}
          >
            Confirm
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={<XCircle className="w-3.5 h-3.5 text-rose-600" />}
            onClick={() => rejectMatch(item.id)}
          >
            Reject
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Review Salary Slips"
        subtitle="Confirm that each salary slip belongs to the correct employee before sending."
      />

      <Alert type="info" title="Verification Security Standard">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-sky-600 shrink-0" />
          <span>
            Salary slips contain confidential payroll information. Ambiguous matches require manual confirmation before they can be sent.
          </span>
        </div>
      </Alert>

      <Card noPadding>
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-700">Salary Slip Matching Queue</span>
          <span className="text-xs text-slate-500">1 item requires attention</span>
        </div>
        <Table<ReviewItem>
          columns={columns}
          data={mockReviewItems}
          keyExtractor={(item) => item.id}
          emptyMessage="No salary slips pending review."
        />
      </Card>
    </div>
  );
};
