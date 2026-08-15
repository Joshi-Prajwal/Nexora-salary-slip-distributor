import React, { useState } from 'react';
import { Filter, X, RotateCcw } from 'lucide-react';
import { Button } from '../common/Button';

export interface FilterState {
  matchStatus: string;
  approvalStatus: string;
  ocrStatus: string;
  deliveryStatus: string;
}

export const initialFilterState: FilterState = {
  matchStatus: 'ALL',
  approvalStatus: 'ALL',
  ocrStatus: 'ALL',
  deliveryStatus: 'ALL',
};

interface AdvancedFilterPopoverProps {
  filters: FilterState;
  onApplyFilters: (filters: FilterState) => void;
  onResetFilters: () => void;
  activeFilterCount: number;
}

export const AdvancedFilterPopover: React.FC<AdvancedFilterPopoverProps> = ({
  filters,
  onApplyFilters,
  onResetFilters,
  activeFilterCount,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState<FilterState>(filters);

  const handleToggle = () => {
    if (!isOpen) {
      setLocalFilters(filters);
    }
    setIsOpen(!isOpen);
  };

  const handleApply = () => {
    onApplyFilters(localFilters);
    setIsOpen(false);
  };

  const handleReset = () => {
    setLocalFilters(initialFilterState);
    onResetFilters();
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={handleToggle}
        className={`flex items-center gap-2 h-11 px-3.5 border rounded-xl text-xs font-semibold transition-all ${
          activeFilterCount > 0
            ? 'bg-sky-50 text-sky-900 border-sky-300 ring-2 ring-sky-200'
            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
        }`}
      >
        <Filter className="w-3.5 h-3.5 text-slate-500" />
        <span>Advanced Filters</span>
        {activeFilterCount > 0 && (
          <span className="ml-0.5 bg-sky-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
            {activeFilterCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-4 space-y-4 text-xs font-sans">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-sky-600" />
              <h4 className="font-bold text-slate-900 text-sm">Advanced Filter Controls</h4>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3.5 max-h-96 overflow-y-auto pr-1">
            {/* 1. Match Status Filter */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Match Status
              </label>
              <select
                value={localFilters.matchStatus}
                onChange={(e) => setLocalFilters({ ...localFilters, matchStatus: e.target.value })}
                className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs font-medium focus:ring-2 focus:ring-sky-500"
              >
                <option value="ALL">All Match States</option>
                <option value="EXACT_MATCH">Exact Match</option>
                <option value="STRONG_MATCH">Strong Match</option>
                <option value="POSSIBLE_MATCH">Possible Match</option>
                <option value="CONFLICT">Conflict</option>
                <option value="NO_MATCH">No Match</option>
                <option value="UNMATCHED">Unmatched / Not Identified</option>
              </select>
            </div>

            {/* 2. Approval Status Filter */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Approval Status
              </label>
              <select
                value={localFilters.approvalStatus}
                onChange={(e) => setLocalFilters({ ...localFilters, approvalStatus: e.target.value })}
                className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs font-medium focus:ring-2 focus:ring-sky-500"
              >
                <option value="ALL">All Approval States</option>
                <option value="PENDING">Pending Approval</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>

            {/* 3. Extraction / OCR Status Filter */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Text Extraction / OCR Status
              </label>
              <select
                value={localFilters.ocrStatus}
                onChange={(e) => setLocalFilters({ ...localFilters, ocrStatus: e.target.value })}
                className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs font-medium focus:ring-2 focus:ring-sky-500"
              >
                <option value="ALL">All Extraction States</option>
                <option value="TEXT_EMBEDDED">Text Embedded</option>
                <option value="OCR_REQUIRED">OCR Required / Run Needed</option>
                <option value="OCR_COMPLETED">OCR Completed</option>
                <option value="OCR_FAILED">OCR Failed / Failed Extraction</option>
              </select>
            </div>

            {/* 4. Delivery Status Filter */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Delivery Status
              </label>
              <select
                value={localFilters.deliveryStatus}
                onChange={(e) => setLocalFilters({ ...localFilters, deliveryStatus: e.target.value })}
                className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs font-medium focus:ring-2 focus:ring-sky-500"
              >
                <option value="ALL">All Delivery States</option>
                <option value="READY_TO_SEND">Ready to Send (Approved + Valid)</option>
                <option value="SENT">Sent Successfully</option>
                <option value="FAILED">Delivery Failed</option>
                <option value="NOT_SENT">Not Sent Yet</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 pt-3 gap-2">
            <Button
              variant="ghost"
              size="sm"
              icon={<RotateCcw className="w-3.5 h-3.5" />}
              onClick={handleReset}
            >
              Clear Filters
            </Button>
            <Button variant="primary" size="sm" onClick={handleApply}>
              Apply Filters
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
