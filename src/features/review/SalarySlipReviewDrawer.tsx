import React, { useEffect, useState } from 'react';
import { Drawer } from '../../components/common/Drawer';
import { Button } from '../../components/common/Button';
import { StatusBadge } from '../../components/feedback/StatusBadge';
import { SalarySlip } from '../../types/salarySlip';
import { useMatchingStore } from '../../stores/matchingStore';
import { useEmployeeStore } from '../../stores/employeeStore';
import { MatchCandidate } from '../../types/matching';
import {
  Mail,
  Phone,
  Building2,
  Briefcase,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Search,
  Check,
  AlertTriangle,
} from 'lucide-react';

interface SalarySlipReviewDrawerProps {
  slip: SalarySlip | null;
  onClose: () => void;
  onConfirm: (slipId: string, employeeId: string, note?: string) => Promise<void>;
  onReject: (slipId: string, note?: string) => Promise<void>;
  onReset: (slipId: string) => Promise<void>;
}

export const SalarySlipReviewDrawer: React.FC<SalarySlipReviewDrawerProps> = ({
  slip,
  onClose,
  onConfirm,
  onReject,
  onReset,
}) => {
  const { candidates, fetchCandidates } = useMatchingStore();
  const { employees } = useEmployeeStore();

  const [selectedEmpId, setSelectedEmpId] = useState<string | null>(null);
  const [empSearch, setEmpSearch] = useState('');
  const [isChangingEmployee, setIsChangingEmployee] = useState(false);

  useEffect(() => {
    if (slip) {
      fetchCandidates(slip.id);
      setSelectedEmpId(slip.matchedEmployeeId || null);
      setIsChangingEmployee(false);
      setEmpSearch('');
    }
  }, [slip, fetchCandidates]);

  if (!slip) return null;

  const currentCandidates: MatchCandidate[] = candidates[slip.id] || [];
  const matchedEmp = employees.find((e) => e.id === (selectedEmpId || slip.matchedEmployeeId));
  const bestCandidate = currentCandidates.find((c) => c.employeeDbId === matchedEmp?.id) || currentCandidates[0];

  const filteredEmployees = employees.filter((e) => {
    if (!empSearch.trim()) return true;
    const q = empSearch.toLowerCase().trim();
    return (
      e.name.toLowerCase().includes(q) ||
      e.employeeId.toLowerCase().includes(q) ||
      (e.email && e.email.toLowerCase().includes(q)) ||
      (e.department && e.department.toLowerCase().includes(q))
    );
  });

  const isConfirmed = slip.matchStatus === 'MANUALLY_CONFIRMED';
  const isRejected = slip.matchStatus === 'MANUALLY_REJECTED';

  return (
    <Drawer isOpen={!!slip} onClose={onClose} title="Review Salary Slip Match">
      <div className="space-y-6">
        {/* Header Badge & File Name */}
        <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Salary Slip PDF</span>
            <StatusBadge status={slip.matchStatus} />
          </div>
          <h4 className="text-base font-bold text-slate-900 break-all">{slip.fileName}</h4>
        </div>

        {/* Section A: Extracted Details from Salary Slip */}
        <div className="space-y-3">
          <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
            Extracted From Salary Slip
          </span>

          <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-xl space-y-2.5">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block font-medium">Extracted Employee ID</span>
                <span className="font-bold text-slate-900 font-mono">
                  {slip.detectedEmployeeId || 'Not found'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block font-medium">Extracted Name</span>
                <span className="font-semibold text-slate-900">{slip.detectedName || 'Not found'}</span>
              </div>
              <div>
                <span className="text-slate-500 block font-medium">Extracted Email</span>
                <span className="text-slate-800 font-mono">{slip.detectedEmail || 'Not found'}</span>
              </div>
              <div>
                <span className="text-slate-500 block font-medium">Extracted Phone</span>
                <span className="text-slate-800 font-mono">{slip.detectedPhone || 'Not found'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section B: Matched / Suggested Employee */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
              Suggested Employee Match
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsChangingEmployee(!isChangingEmployee)}
            >
              {isChangingEmployee ? 'Cancel' : 'Change Employee'}
            </Button>
          </div>

          {isChangingEmployee ? (
            <div className="p-4 bg-white border border-slate-300 rounded-xl space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search employee by ID, name, email, or department..."
                  value={empSearch}
                  onChange={(e) => setEmpSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {filteredEmployees.map((emp) => (
                  <div
                    key={emp.id}
                    onClick={() => {
                      setSelectedEmpId(emp.id);
                      setIsChangingEmployee(false);
                    }}
                    className={`p-2.5 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition-colors ${
                      selectedEmpId === emp.id
                        ? 'bg-blue-50 border-blue-300 text-blue-900'
                        : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100 text-slate-800'
                    }`}
                  >
                    <div>
                      <div className="font-semibold">{emp.name} ({emp.employeeId})</div>
                      <div className="text-slate-500 font-mono text-[11px]">{emp.email || 'No email'}</div>
                    </div>
                    {selectedEmpId === emp.id && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                  </div>
                ))}
              </div>
            </div>
          ) : matchedEmp ? (
            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h5 className="text-sm font-bold text-slate-900">{matchedEmp.name}</h5>
                  <span className="text-xs font-mono font-semibold text-emerald-800">
                    ID: {matchedEmp.employeeId}
                  </span>
                </div>
                <StatusBadge status={slip.matchStatus} />
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-xs text-slate-700 pt-2 border-t border-emerald-200/60">
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate font-mono">{matchedEmp.email || 'No email'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate font-mono">{matchedEmp.phone || 'No phone'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">{matchedEmp.department || 'No dept'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Briefcase className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">{matchedEmp.designation || 'No title'}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-xl text-center">
              <p className="text-xs text-slate-500">
                No matching employee found in database. Click "Change Employee" above to manually assign an employee.
              </p>
            </div>
          )}
        </div>

        {/* Section C: Match Explanation */}
        {bestCandidate && (
          <div className="space-y-2.5 p-4 bg-white border border-slate-200 rounded-xl">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-900 uppercase tracking-wider">
                Deterministic Confidence
              </span>
              <span className="font-bold text-slate-900 font-mono text-sm">
                {Math.round(bestCandidate.score)}%
              </span>
            </div>

            {bestCandidate.matchedFields.length > 0 && (
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-emerald-800 uppercase block">
                  Matched Fields
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {bestCandidate.matchedFields.map((f) => (
                    <span
                      key={f}
                      className="inline-flex items-center gap-1 text-[11px] font-medium bg-emerald-100/70 text-emerald-900 px-2 py-0.5 rounded-md"
                    >
                      <Check className="w-3 h-3 text-emerald-700" />
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <p className="text-xs text-slate-600 leading-relaxed pt-1 border-t border-slate-100">
              {bestCandidate.explanation}
            </p>
          </div>
        )}

        {/* Section D: Conflict Warning */}
        {slip.matchStatus === 'CONFLICT' && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-1">
            <div className="flex items-center gap-2 text-rose-900 font-semibold text-xs">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Matching Conflict Detected</span>
            </div>
            <p className="text-xs text-rose-800 leading-relaxed">
              Multiple employees have similar candidate scores or conflicting signals. Please select the correct employee before confirming.
            </p>
          </div>
        )}

        {/* Action Controls */}
        <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <div>
            {(isConfirmed || isRejected) && (
              <Button
                variant="ghost"
                size="sm"
                icon={<RotateCcw className="w-3.5 h-3.5 text-slate-500" />}
                onClick={async () => {
                  await onReset(slip.id);
                  onClose();
                }}
              >
                Reset Match
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              icon={<XCircle className="w-3.5 h-3.5 text-rose-600" />}
              onClick={async () => {
                await onReject(slip.id);
                onClose();
              }}
            >
              Reject Match
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={!selectedEmpId && !slip.matchedEmployeeId}
              icon={<CheckCircle2 className="w-3.5 h-3.5" />}
              onClick={async () => {
                const targetEmp = selectedEmpId || slip.matchedEmployeeId;
                if (targetEmp) {
                  await onConfirm(slip.id, targetEmp);
                  onClose();
                }
              }}
            >
              Confirm Match
            </Button>
          </div>
        </div>
      </div>
    </Drawer>
  );
};
