import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';
import { Table, Column } from '../../components/common/Table';
import { Button } from '../../components/common/Button';
import { SearchInput } from '../../components/common/SearchInput';
import { Toast } from '../../components/common/Toast';
import { EmptyState } from '../../components/feedback/EmptyState';
import { StatusBadge } from '../../components/feedback/StatusBadge';
import { SalarySlipReviewDrawer } from '../../features/review/SalarySlipReviewDrawer';
import { useSalarySlipStore } from '../../stores/salarySlipStore';
import { useMatchingStore } from '../../stores/matchingStore';
import { useEmployeeStore } from '../../stores/employeeStore';
import { SalarySlip } from '../../types/salarySlip';
import { ShieldCheck, Cpu, CheckSquare, Eye } from 'lucide-react';

export const MatchingPage: React.FC = () => {
  const { slips, fetchSalarySlips } = useSalarySlipStore();
  const { employees, fetchEmployees } = useEmployeeStore();
  const {
    isMatchingProcessing,
    lastBatchMatchSummary,
    runMatching,
    confirmMatch,
    rejectMatch,
    resetMatch,
  } = useMatchingStore();

  const [search, setSearch] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('ALL');
  const [selectedReviewSlip, setSelectedReviewSlip] = useState<SalarySlip | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchSalarySlips();
    fetchEmployees();
  }, [fetchSalarySlips, fetchEmployees]);

  const handleRunMatching = async () => {
    try {
      const summary = await runMatching();
      if (summary) {
        setToastMessage(
          `Matching complete: ${summary.exactMatches} exact matches, ${summary.strongMatches} strong matches, ${summary.possibleMatches} possible matches, ${summary.conflicts} conflicts.`
        );
      }
    } catch (_err) {
      setToastMessage('Failed to execute matching engine.');
    }
  };

  const getEmployeeName = (empId?: string) => {
    if (!empId) return null;
    const emp = employees.find((e) => e.id === empId || e.employeeId === empId);
    return emp ? emp.name : null;
  };

  const filteredSlips = slips.filter((slip) => {
    if (selectedFilter === 'NEEDS_REVIEW') {
      const isNeedsReview =
        slip.matchStatus === 'POSSIBLE_MATCH' ||
        slip.matchStatus === 'CONFLICT' ||
        slip.matchStatus === 'MANUAL_REVIEW' ||
        slip.matchStatus === 'UNMATCHED';
      if (!isNeedsReview) return false;
    } else if (selectedFilter === 'APPROVED') {
      const isApproved =
        slip.matchStatus === 'EXACT_MATCH' ||
        slip.matchStatus === 'STRONG_MATCH' ||
        slip.matchStatus === 'MANUALLY_CONFIRMED';
      if (!isApproved) return false;
    } else if (selectedFilter !== 'ALL') {
      if (slip.matchStatus !== selectedFilter) return false;
    }

    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    const matchedEmpName = getEmployeeName(slip.matchedEmployeeId)?.toLowerCase() || '';

    return (
      slip.fileName.toLowerCase().includes(q) ||
      (slip.detectedEmployeeId && slip.detectedEmployeeId.toLowerCase().includes(q)) ||
      (slip.detectedName && slip.detectedName.toLowerCase().includes(q)) ||
      (slip.detectedEmail && slip.detectedEmail.toLowerCase().includes(q)) ||
      matchedEmpName.includes(q)
    );
  });

  const totalSlips = slips.length;
  const exactMatches = slips.filter((s) => s.matchStatus === 'EXACT_MATCH').length;
  const needsReview = slips.filter(
    (s) =>
      s.matchStatus === 'POSSIBLE_MATCH' ||
      s.matchStatus === 'CONFLICT' ||
      s.matchStatus === 'MANUAL_REVIEW' ||
      s.matchStatus === 'UNMATCHED'
  ).length;
  const noMatch = slips.filter((s) => s.matchStatus === 'NO_MATCH').length;
  const approved = slips.filter(
    (s) =>
      s.matchStatus === 'EXACT_MATCH' ||
      s.matchStatus === 'STRONG_MATCH' ||
      s.matchStatus === 'MANUALLY_CONFIRMED'
  ).length;

  const columns: Column<SalarySlip>[] = [
    { key: 'fileName', header: 'Salary Slip File' },
    {
      key: 'extractedInfo',
      header: 'Extracted Details',
      render: (item) => (
        <div>
          <span className="font-mono font-semibold text-slate-900 block truncate max-w-xs">
            {item.detectedEmployeeId || 'No ID'}
          </span>
          <span className="text-xs text-slate-500 block truncate max-w-xs">
            {item.detectedName || item.detectedEmail || 'No extracted name'}
          </span>
        </div>
      ),
    },
    {
      key: 'suggestedEmp',
      header: 'Suggested Employee',
      render: (item) => {
        const empName = getEmployeeName(item.matchedEmployeeId);
        return (
          <div>
            {empName ? (
              <div>
                <span className="font-semibold text-slate-900 block truncate max-w-xs">
                  {empName}
                </span>
                <span className="text-xs text-slate-500 font-mono block">
                  ID: {item.matchedEmployeeId}
                </span>
              </div>
            ) : (
              <span className="text-xs text-slate-400 font-medium">Unassigned</span>
            )}
          </div>
        );
      },
    },
    {
      key: 'matchStatus',
      header: 'Match Status',
      render: (item) => <StatusBadge status={item.matchStatus} />,
    },
    {
      key: 'matchConfidence',
      header: 'Confidence',
      render: (item) => (
        <div className="flex items-center gap-2">
          <span className="font-semibold text-xs font-mono">
            {Math.round(item.matchConfidence * 100)}%
          </span>
          <div className="w-14 bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${
                item.matchConfidence >= 0.9
                  ? 'bg-emerald-500'
                  : item.matchConfidence >= 0.7
                  ? 'bg-amber-500'
                  : 'bg-rose-500'
              }`}
              style={{ width: `${item.matchConfidence * 100}%` }}
            />
          </div>
        </div>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      align: 'right',
      render: (item) => (
        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="outline"
            size="sm"
            icon={<Eye className="w-3.5 h-3.5" />}
            onClick={() => setSelectedReviewSlip(item)}
          >
            Review
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
        action={
          <Button
            variant="primary"
            icon={<Cpu className="w-4 h-4" />}
            isLoading={isMatchingProcessing}
            disabled={slips.length === 0}
            onClick={handleRunMatching}
          >
            Match Employees
          </Button>
        }
      />

      {/* Privacy Alert Banner */}
      <div className="p-3.5 bg-sky-50/80 border border-sky-200/80 rounded-xl flex items-center gap-3 text-xs text-sky-900">
        <ShieldCheck className="w-4 h-4 text-sky-600 shrink-0" />
        <span className="leading-relaxed">
          Salary slips contain confidential employee information. Review details carefully before approving delivery.
        </span>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-4 bg-white border border-slate-200/80 rounded-xl">
          <span className="text-xs font-semibold text-slate-500 block uppercase">Total Slips</span>
          <span className="text-xl font-bold text-slate-900 mt-1 block">{totalSlips}</span>
        </div>
        <div className="p-4 bg-white border border-slate-200/80 rounded-xl">
          <span className="text-xs font-semibold text-emerald-700 block uppercase">Exact Matches</span>
          <span className="text-xl font-bold text-emerald-900 mt-1 block">{exactMatches}</span>
        </div>
        <div className="p-4 bg-white border border-slate-200/80 rounded-xl">
          <span className="text-xs font-semibold text-amber-700 block uppercase">Needs Review</span>
          <span className="text-xl font-bold text-amber-900 mt-1 block">{needsReview}</span>
        </div>
        <div className="p-4 bg-white border border-slate-200/80 rounded-xl">
          <span className="text-xs font-semibold text-slate-600 block uppercase">No Match</span>
          <span className="text-xl font-bold text-slate-800 mt-1 block">{noMatch}</span>
        </div>
        <div className="p-4 bg-white border border-slate-200/80 rounded-xl">
          <span className="text-xs font-semibold text-blue-700 block uppercase">Approved</span>
          <span className="text-xl font-bold text-blue-900 mt-1 block">{approved}</span>
        </div>
      </div>

      {slips.length === 0 ? (
        <EmptyState
          icon={<CheckSquare className="w-6 h-6 text-slate-400" />}
          title="No salary slips registered"
          description="Scan a salary slip folder to discover PDFs and execute employee matching."
        />
      ) : (
        <Card noPadding>
          {/* Controls Bar: Search & Filter Tabs */}
          <div className="p-4 border-b border-slate-100 flex flex-col space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <SearchInput
                placeholder="Search by ID, name, email, or file name..."
                value={search}
                onSearchChange={setSearch}
              />
              <span className="text-xs text-slate-500 font-medium shrink-0">
                {filteredSlips.length} of {slips.length} salary slips showing
              </span>
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {[
                { id: 'ALL', label: 'All' },
                { id: 'NEEDS_REVIEW', label: 'Needs Review' },
                { id: 'EXACT_MATCH', label: 'Exact Match' },
                { id: 'STRONG_MATCH', label: 'Strong Match' },
                { id: 'POSSIBLE_MATCH', label: 'Possible Match' },
                { id: 'CONFLICT', label: 'Conflict' },
                { id: 'NO_MATCH', label: 'No Match' },
                { id: 'APPROVED', label: 'Approved' },
                { id: 'MANUALLY_REJECTED', label: 'Rejected' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedFilter(tab.id)}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                    selectedFilter === tab.id
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Batch Summary Bar */}
          {lastBatchMatchSummary && (
            <div className="px-4 py-2.5 bg-emerald-50/70 border-b border-emerald-100 flex flex-wrap items-center gap-4 text-xs text-emerald-900">
              <span>Exact Matches: <strong>{lastBatchMatchSummary.exactMatches}</strong></span>
              <span>Strong Matches: <strong>{lastBatchMatchSummary.strongMatches}</strong></span>
              <span>Possible Matches: <strong>{lastBatchMatchSummary.possibleMatches}</strong></span>
              <span>Conflicts: <strong className="text-rose-800">{lastBatchMatchSummary.conflicts}</strong></span>
              <span>No Match: <strong className="text-slate-700">{lastBatchMatchSummary.noMatches}</strong></span>
            </div>
          )}

          <Table<SalarySlip>
            columns={columns}
            data={filteredSlips}
            keyExtractor={(item) => item.id}
            onRowClick={(item) => setSelectedReviewSlip(item)}
            emptyMessage="No salary slips match your filter criteria."
          />
        </Card>
      )}

      {/* Review Modal / Drawer */}
      <SalarySlipReviewDrawer
        slip={selectedReviewSlip}
        onClose={() => setSelectedReviewSlip(null)}
        onConfirm={async (slipId, empId, note) => {
          await confirmMatch(slipId, empId, note);
          setToastMessage('Employee match manually confirmed.');
        }}
        onReject={async (slipId, note) => {
          await rejectMatch(slipId, note);
          setToastMessage('Salary slip match rejected.');
        }}
        onReset={async (slipId) => {
          await resetMatch(slipId);
          setToastMessage('Salary slip match reset to automatic calculation.');
        }}
      />

      {/* Toast Alert */}
      {toastMessage && (
        <Toast type="info" message={toastMessage} onClose={() => setToastMessage(null)} />
      )}
    </div>
  );
};
