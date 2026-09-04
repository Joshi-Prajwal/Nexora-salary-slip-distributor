import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';
import { Table, Column } from '../../components/common/Table';
import { Button } from '../../components/common/Button';
import { SearchInput } from '../../components/common/SearchInput';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { Toast } from '../../components/common/Toast';
import { EmptyState } from '../../components/feedback/EmptyState';
import { StatusBadge } from '../../components/feedback/StatusBadge';
import { TextHighlight } from '../../components/common/TextHighlight';
import { AdvancedFilterPopover, FilterState, initialFilterState } from '../../components/filters/AdvancedFilterPopover';
import { SalarySlipReviewDrawer } from '../../features/review/SalarySlipReviewDrawer';
import { useSalarySlipStore } from '../../stores/salarySlipStore';
import { useMatchingStore } from '../../stores/matchingStore';
import { useEmployeeStore } from '../../stores/employeeStore';
import { SalarySlip } from '../../types/salarySlip';
import { matchesSlipQuery } from '../../utils/searchUtils';
import {
  ShieldCheck,
  Cpu,
  CheckSquare,
  Eye,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FilterX,
  Sparkles
} from 'lucide-react';

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
    confirmAllSafeMatches,
    bulkUpdateApprovalStatus,
  } = useMatchingStore();

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [quickFilter, setQuickFilter] = useState<string>('ALL');
  const [advancedFilters, setAdvancedFilters] = useState<FilterState>(initialFilterState);
  const [selectedReviewSlip, setSelectedReviewSlip] = useState<SalarySlip | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [isBulkConfirmModalOpen, setIsBulkConfirmModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Debounce search input (200ms) for high performance on 156+ records
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 200);
    return () => clearTimeout(handler);
  }, [search]);

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

  const getEmployeeName = useCallback(
    (empId?: string) => {
      if (!empId) return null;
      const emp = employees.find((e) => e.id === empId || e.employeeId === empId);
      return emp ? emp.name : null;
    },
    [employees]
  );

  // Unified Filter Calculation
  const filteredSlips = useMemo(() => {
    return slips.filter((slip) => {
      // 1. Quick Filters
      if (quickFilter === 'NEEDS_REVIEW') {
        const isNeedsReview =
          slip.matchStatus === 'POSSIBLE_MATCH' ||
          slip.matchStatus === 'CONFLICT' ||
          slip.matchStatus === 'MANUAL_REVIEW' ||
          slip.matchStatus === 'UNMATCHED' ||
          slip.ocrStatus === 'FAILED' ||
          slip.approvalStatus === 'PENDING';
        if (!isNeedsReview) return false;
      } else if (quickFilter === 'MATCHED') {
        const isMatched = slip.matchStatus === 'EXACT_MATCH' || slip.matchStatus === 'STRONG_MATCH';
        if (!isMatched) return false;
      } else if (quickFilter === 'APPROVED') {
        const isApproved = slip.approvalStatus === 'APPROVED' || slip.matchStatus === 'MANUALLY_CONFIRMED';
        if (!isApproved) return false;
      } else if (quickFilter === 'PENDING') {
        const isPending = slip.approvalStatus === 'PENDING' || (!slip.approvalStatus && slip.matchStatus !== 'MANUALLY_CONFIRMED');
        if (!isPending) return false;
      } else if (quickFilter === 'REJECTED') {
        const isRejected = slip.approvalStatus === 'REJECTED' || slip.matchStatus === 'MANUALLY_REJECTED';
        if (!isRejected) return false;
      } else if (quickFilter !== 'ALL') {
        if (slip.matchStatus !== quickFilter && slip.approvalStatus !== quickFilter) return false;
      }

      // 2. Advanced Filters
      if (advancedFilters.matchStatus !== 'ALL') {
        if (advancedFilters.matchStatus === 'UNMATCHED') {
          if (slip.matchStatus !== 'UNMATCHED' && slip.matchStatus !== 'NOT_IDENTIFIED') return false;
        } else if (slip.matchStatus !== advancedFilters.matchStatus) {
          return false;
        }
      }

      if (advancedFilters.approvalStatus !== 'ALL') {
        const appStat = slip.approvalStatus || 'PENDING';
        if (appStat !== advancedFilters.approvalStatus) return false;
      }

      if (advancedFilters.ocrStatus !== 'ALL') {
        if (advancedFilters.ocrStatus === 'TEXT_EMBEDDED') {
          if (slip.extractionMethod !== 'TEXT_EMBEDDED') return false;
        } else if (advancedFilters.ocrStatus === 'OCR_REQUIRED') {
          if (slip.extractionMethod === 'TEXT_EMBEDDED' || slip.ocrStatus === 'COMPLETED') return false;
        } else if (advancedFilters.ocrStatus === 'OCR_COMPLETED') {
          if (slip.ocrStatus !== 'COMPLETED') return false;
        } else if (advancedFilters.ocrStatus === 'OCR_FAILED') {
          if (slip.ocrStatus !== 'FAILED' && slip.matchStatus !== 'TEXT_EXTRACTION_FAILED') return false;
        }
      }

      if (advancedFilters.deliveryStatus !== 'ALL') {
        if (advancedFilters.deliveryStatus === 'READY_TO_SEND') {
          const isReady = (slip.approvalStatus === 'APPROVED' || slip.matchStatus === 'MANUALLY_CONFIRMED') && slip.matchedEmployeeId;
          if (!isReady) return false;
        }
      }

      // 3. Search Query
      if (!debouncedSearch.trim()) return true;
      return matchesSlipQuery(slip, debouncedSearch, employees);
    });
  }, [slips, quickFilter, advancedFilters, debouncedSearch, employees]);

  // Authoritative Mathematical Summary Calculations
  const totalSlips = slips.length;
  const exactMatches = useMemo(() => slips.filter((s) => s.matchStatus === 'EXACT_MATCH').length, [slips]);
  const strongMatches = useMemo(() => slips.filter((s) => s.matchStatus === 'STRONG_MATCH').length, [slips]);
  const possibleMatches = useMemo(() => slips.filter((s) => s.matchStatus === 'POSSIBLE_MATCH').length, [slips]);
  const conflicts = useMemo(() => slips.filter((s) => s.matchStatus === 'CONFLICT').length, [slips]);
  const noMatch = useMemo(() => slips.filter((s) => s.matchStatus === 'NO_MATCH').length, [slips]);
  const unmatched = useMemo(
    () => slips.filter((s) => s.matchStatus === 'UNMATCHED' || s.matchStatus === 'NOT_IDENTIFIED' || s.matchStatus === 'DUPLICATE_CONTENT').length,
    [slips]
  );

  const pendingReview = useMemo(
    () => slips.filter((s) => s.approvalStatus === 'PENDING' || (!s.approvalStatus && s.matchStatus !== 'MANUALLY_CONFIRMED')).length,
    [slips]
  );
  const approved = useMemo(
    () => slips.filter((s) => s.approvalStatus === 'APPROVED' || s.matchStatus === 'MANUALLY_CONFIRMED').length,
    [slips]
  );

  // Safe Bulk Confirm Eligibility Calculation
  const safeConfirmableSlips = useMemo(() => {
    return slips.filter((s) => {
      const isExact = s.matchStatus === 'EXACT_MATCH';
      const hasEmp = !!s.matchedEmployeeId;
      const notRejected = s.approvalStatus !== 'REJECTED' && s.matchStatus !== 'MANUALLY_REJECTED';
      const notConflict = s.matchStatus !== 'CONFLICT';
      const notUnmatched = s.matchStatus !== 'UNMATCHED' && s.matchStatus !== 'NO_MATCH';
      const ocrOk = s.ocrStatus !== 'FAILED';
      const notAlreadyApproved = s.approvalStatus !== 'APPROVED' && s.matchStatus !== 'MANUALLY_CONFIRMED';
      return isExact && hasEmp && notRejected && notConflict && notUnmatched && ocrOk && notAlreadyApproved;
    });
  }, [slips]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (advancedFilters.matchStatus !== 'ALL') count++;
    if (advancedFilters.approvalStatus !== 'ALL') count++;
    if (advancedFilters.ocrStatus !== 'ALL') count++;
    if (advancedFilters.deliveryStatus !== 'ALL') count++;
    return count;
  }, [advancedFilters]);

  // Checkbox Row Selection Handlers
  const handleSelectKey = (key: string, selected: boolean) => {
    const next = new Set(selectedKeys);
    if (selected) next.add(key);
    else next.delete(key);
    setSelectedKeys(next);
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      const visibleKeys = new Set(filteredSlips.map((s) => s.id));
      setSelectedKeys(visibleKeys);
    } else {
      setSelectedKeys(new Set());
    }
  };

  const handleBulkApprove = async () => {
    if (selectedKeys.size === 0) return;
    const ids = Array.from(selectedKeys);
    
    // Count records that are ineligible (CONFLICT, NO_MATCH, UNMATCHED, or missing employee)
    const selectedSlips = slips.filter((s) => selectedKeys.has(s.id));
    const ineligibleCount = selectedSlips.filter(
      (s) => s.matchStatus === 'CONFLICT' || s.matchStatus === 'NO_MATCH' || s.matchStatus === 'UNMATCHED' || !s.matchedEmployeeId
    ).length;
    const eligibleCount = ids.length - ineligibleCount;

    await bulkUpdateApprovalStatus(ids, 'APPROVED');
    if (ineligibleCount > 0) {
      setToastMessage(`Bulk approved ${eligibleCount} eligible slips. (${ineligibleCount} conflict/unmatched record(s) skipped for manual review)`);
    } else {
      setToastMessage(`Bulk approved ${eligibleCount} selected salary slips.`);
    }
    setSelectedKeys(new Set());
  };

  const handleBulkReject = async () => {
    if (selectedKeys.size === 0) return;
    const ids = Array.from(selectedKeys);
    await bulkUpdateApprovalStatus(ids, 'REJECTED');
    setToastMessage(`Bulk rejected ${ids.length} selected salary slips.`);
    setSelectedKeys(new Set());
  };

  const handleConfirmAllSafe = async () => {
    setIsBulkConfirmModalOpen(false);
    const result = await confirmAllSafeMatches();
    if (result) {
      setToastMessage(
        `${result.confirmedCount} salary slips confirmed and approved. ${result.skippedCount} salary slips still require review.`
      );
    }
  };

  const clearAllFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setQuickFilter('ALL');
    setAdvancedFilters(initialFilterState);
  };

  const columns: Column<SalarySlip>[] = [
    {
      key: 'fileName',
      header: 'Salary Slip File',
      render: (item) => <TextHighlight text={item.fileName} query={debouncedSearch} className="font-semibold text-slate-900" />,
    },
    {
      key: 'extractedInfo',
      header: 'Extracted Details',
      render: (item) => (
        <div>
          <span className="font-mono font-semibold text-slate-900 block truncate max-w-xs">
            <TextHighlight text={item.detectedEmployeeId || 'No ID'} query={debouncedSearch} />
          </span>
          <span className="text-xs text-slate-500 block truncate max-w-xs">
            <TextHighlight text={item.detectedName || item.detectedEmail || 'No extracted name'} query={debouncedSearch} />
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
                  <TextHighlight text={empName} query={debouncedSearch} />
                </span>
                <span className="text-xs text-slate-500 font-mono block">
                  ID: <TextHighlight text={item.matchedEmployeeId || ''} query={debouncedSearch} />
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
      key: 'approvalStatus',
      header: 'Approval',
      render: (item) => (
        <span
          className={`px-2.5 py-0.5 rounded-md text-xs font-bold inline-block ${
            item.approvalStatus === 'APPROVED' || item.matchStatus === 'MANUALLY_CONFIRMED'
              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
              : item.approvalStatus === 'REJECTED' || item.matchStatus === 'MANUALLY_REJECTED'
              ? 'bg-rose-100 text-rose-800 border border-rose-300'
              : 'bg-amber-100 text-amber-800 border border-amber-300'
          }`}
        >
          {item.approvalStatus === 'APPROVED' || item.matchStatus === 'MANUALLY_CONFIRMED'
            ? 'APPROVED'
            : item.approvalStatus === 'REJECTED' || item.matchStatus === 'MANUALLY_REJECTED'
            ? 'REJECTED'
            : 'PENDING'}
        </span>
      ),
    },
    {
      key: 'matchConfidence',
      header: 'Confidence',
      render: (item) => (
        <div className="flex items-center gap-2">
          <span className="font-semibold text-xs font-mono">{Math.round(item.matchConfidence * 100)}%</span>
          <div className="w-14 bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${
                item.matchConfidence >= 0.9 ? 'bg-emerald-500' : item.matchConfidence >= 0.7 ? 'bg-amber-500' : 'bg-rose-500'
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
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={<Sparkles className="w-4 h-4 text-emerald-600" />}
              disabled={safeConfirmableSlips.length === 0 || isMatchingProcessing}
              onClick={() => setIsBulkConfirmModalOpen(true)}
              title={
                safeConfirmableSlips.length === 0
                  ? 'No safe matches available for bulk confirmation.'
                  : `Confirm ${safeConfirmableSlips.length} safe matches in one click`
              }
            >
              Confirm All Safe Matches ({safeConfirmableSlips.length})
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Cpu className="w-4 h-4" />}
              isLoading={isMatchingProcessing}
              disabled={slips.length === 0}
              onClick={handleRunMatching}
            >
              Match Employees
            </Button>
          </div>
        }
      />

      {/* Privacy Alert Banner */}
      <div className="p-3.5 bg-sky-50/80 border border-sky-200/80 rounded-xl flex items-center justify-between gap-3 text-xs text-sky-900">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-4 h-4 text-sky-600 shrink-0" />
          <span className="leading-relaxed">
            Salary slips contain confidential employee information. Review details carefully before approving delivery.
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setQuickFilter('NEEDS_REVIEW')}
          className="shrink-0 text-sky-900 bg-sky-100 hover:bg-sky-200"
        >
          Review Remaining ({conflicts + possibleMatches + noMatch + unmatched})
        </Button>
      </div>

      {/* Summary Cards with Authoritative Mathematical Reconciliation */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        <div className="p-4 bg-white border border-slate-200/80 rounded-xl">
          <span className="text-xs font-semibold text-slate-500 block uppercase">Total Slips</span>
          <span className="text-xl font-bold text-slate-900 mt-1 block">{totalSlips}</span>
        </div>
        <div className="p-4 bg-white border border-slate-200/80 rounded-xl">
          <span className="text-xs font-semibold text-emerald-700 block uppercase">Exact Matches</span>
          <span className="text-xl font-bold text-emerald-900 mt-1 block">{exactMatches}</span>
        </div>
        <div className="p-4 bg-white border border-slate-200/80 rounded-xl">
          <span className="text-xs font-semibold text-sky-700 block uppercase">Strong Matches</span>
          <span className="text-xl font-bold text-sky-900 mt-1 block">{strongMatches}</span>
        </div>
        <div className="p-4 bg-white border border-slate-200/80 rounded-xl">
          <span className="text-xs font-semibold text-rose-700 block uppercase">Conflicts / Review</span>
          <span className="text-xl font-bold text-rose-900 mt-1 block">{conflicts + possibleMatches + noMatch + unmatched}</span>
        </div>
        <div className="p-4 bg-white border border-slate-200/80 rounded-xl">
          <span className="text-xs font-semibold text-amber-700 block uppercase">Pending Review</span>
          <span className="text-xl font-bold text-amber-900 mt-1 block">{pendingReview}</span>
        </div>
        <div className="p-4 bg-white border border-slate-200/80 rounded-xl">
          <span className="text-xs font-semibold text-emerald-700 block uppercase">Approved</span>
          <span className="text-xl font-bold text-emerald-900 mt-1 block">{approved}</span>
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
          {/* Controls Bar: Large Search + Advanced Filter Popover */}
          <div className="p-4 border-b border-slate-100 space-y-3">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              {/* Large Desktop Search Box (min 500px, flex 1) */}
              <SearchInput
                value={search}
                onSearchChange={setSearch}
                onClear={() => setSearch('')}
                containerClassName="w-full md:w-auto flex-1 max-w-3xl"
              />

              <div className="flex items-center gap-2 shrink-0">
                <AdvancedFilterPopover
                  filters={advancedFilters}
                  onApplyFilters={setAdvancedFilters}
                  onResetFilters={() => setAdvancedFilters(initialFilterState)}
                  activeFilterCount={activeFilterCount}
                />

                {(search || quickFilter !== 'ALL' || activeFilterCount > 0) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<FilterX className="w-3.5 h-3.5" />}
                    onClick={clearAllFilters}
                  >
                    Clear All
                  </Button>
                )}
              </div>
            </div>

            {/* Quick Filter Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: 'ALL', label: 'All Slips' },
                  { id: 'NEEDS_REVIEW', label: `Needs Review (${conflicts + possibleMatches + noMatch + unmatched})` },
                  { id: 'MATCHED', label: `Matched (${exactMatches + strongMatches})` },
                  { id: 'EXACT_MATCH', label: `Exact (${exactMatches})` },
                  { id: 'STRONG_MATCH', label: `Strong (${strongMatches})` },
                  { id: 'PENDING', label: `Pending Approval (${pendingReview})` },
                  { id: 'APPROVED', label: `Approved (${approved})` },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setQuickFilter(tab.id)}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                      quickFilter === tab.id
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <span className="text-xs text-slate-500 font-medium">
                <strong className="text-slate-900">{filteredSlips.length}</strong> of <strong>{slips.length}</strong> slips showing
              </span>
            </div>
          </div>

          {/* Bulk Selection Action Toolbar */}
          {selectedKeys.size > 0 && (
            <div className="px-4 py-3 bg-sky-900 text-white flex flex-wrap items-center justify-between gap-3 text-xs shadow-inner">
              <div className="flex items-center gap-2 font-semibold">
                <CheckSquare className="w-4 h-4 text-sky-400" />
                <span>{selectedKeys.size} salary slips selected</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                  className="text-white hover:bg-sky-800"
                  onClick={handleBulkApprove}
                >
                  Approve Selected ({selectedKeys.size})
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<XCircle className="w-3.5 h-3.5 text-rose-400" />}
                  className="text-white hover:bg-sky-800"
                  onClick={handleBulkReject}
                >
                  Reject Selected ({selectedKeys.size})
                </Button>
                <button
                  onClick={() => setSelectedKeys(new Set())}
                  className="text-sky-300 hover:text-white transition-colors text-xs font-mono ml-2"
                >
                  Deselect All
                </button>
              </div>
            </div>
          )}

          {/* Batch Summary Bar */}
          {lastBatchMatchSummary && (
            <div className="px-4 py-2.5 bg-emerald-50/70 border-b border-emerald-100 flex flex-wrap items-center gap-4 text-xs text-emerald-900 font-mono">
              <span>Total: <strong>{lastBatchMatchSummary.total}</strong></span>
              <span>Exact: <strong>{lastBatchMatchSummary.exactMatches}</strong></span>
              <span>Strong: <strong>{lastBatchMatchSummary.strongMatches}</strong></span>
              <span>Possible: <strong>{lastBatchMatchSummary.possibleMatches}</strong></span>
              <span>Conflicts: <strong className="text-rose-800">{lastBatchMatchSummary.conflicts}</strong></span>
              <span>No Match: <strong className="text-slate-700">{lastBatchMatchSummary.noMatches}</strong></span>
            </div>
          )}

          <Table<SalarySlip>
            columns={columns}
            data={filteredSlips}
            keyExtractor={(item) => item.id}
            onRowClick={(item) => setSelectedReviewSlip(item)}
            selectable
            selectedKeys={selectedKeys}
            onSelectKey={handleSelectKey}
            onSelectAll={handleSelectAll}
            emptyMessage="No salary slips match your search query or selected filters."
          />
        </Card>
      )}

      {/* Bulk Confirm Dialog */}
      {isBulkConfirmModalOpen && (
        <ConfirmDialog
          isOpen={isBulkConfirmModalOpen}
          onClose={() => setIsBulkConfirmModalOpen(false)}
          onConfirm={handleConfirmAllSafe}
          title="Confirm Safe Matches"
          confirmLabel={`Confirm ${safeConfirmableSlips.length} Safe Matches`}
          message={`${safeConfirmableSlips.length} salary slips meet the strict safe matching criteria. They will be marked as Confirmed & Approved.`}
        >
          <div className="space-y-3 pt-3 text-xs text-slate-700">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg space-y-1">
              <div className="flex items-center gap-2 font-bold text-emerald-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{safeConfirmableSlips.length} Salary Slips Eligible for One-Click Confirmation</span>
              </div>
              <p className="text-emerald-800 text-[11px]">
                Deterministic exact match, non-conflicting employee identity, valid file on disk, and non-rejected status verified.
              </p>
            </div>

            {totalSlips - safeConfirmableSlips.length > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2.5 text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block">
                    {totalSlips - safeConfirmableSlips.length} records excluded from bulk action
                  </span>
                  <span className="text-[11px] text-amber-800">
                    Records with conflicts, possible matches, missing files, or manual rejections are safely preserved for individual human review.
                  </span>
                </div>
              </div>
            )}
          </div>
        </ConfirmDialog>
      )}

      {/* Review Modal / Drawer */}
      <SalarySlipReviewDrawer
        slip={selectedReviewSlip}
        onClose={() => setSelectedReviewSlip(null)}
        onConfirm={async (slipId, empId, note) => {
          await confirmMatch(slipId, empId, note);
          setToastMessage('Employee match manually confirmed & approved.');
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
