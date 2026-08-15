import React, { useEffect } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { StatCard } from '../../components/common/StatCard';
import { StepIndicator, StepItem } from '../../components/common/StepIndicator';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { useAppStore } from '../../stores/appStore';
import { useEmployeeStore } from '../../stores/employeeStore';
import { useSalarySlipStore } from '../../stores/salarySlipStore';
import { useDeliveryStore } from '../../stores/deliveryStore';
import {
  Users,
  FileText,
  CheckSquare,
  ArrowRight,
  Send,
  CheckCircle2,
  Lock,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { setActivePage } = useAppStore();
  const { employees, fetchEmployees } = useEmployeeStore();
  const { slips, fetchSalarySlips } = useSalarySlipStore();
  const { records, fetchRecords } = useDeliveryStore();

  useEffect(() => {
    fetchEmployees();
    fetchSalarySlips();
    fetchRecords();
  }, [fetchEmployees, fetchSalarySlips, fetchRecords]);

  // Authoritative State Counts
  const employeeCount = employees.length;
  const slipCount = slips.length;

  const needsReviewCount =
    slipCount === 0
      ? 0
      : slips.filter(
          (s) =>
            s.approvalStatus === 'PENDING' ||
            s.matchStatus === 'POSSIBLE_MATCH' ||
            s.matchStatus === 'CONFLICT' ||
            s.matchStatus === 'MANUAL_REVIEW' ||
            s.matchStatus === 'UNMATCHED' ||
            s.ocrStatus === 'FAILED'
        ).length;

  const approvedCount = slips.filter(
    (s) => s.approvalStatus === 'APPROVED' || s.matchStatus === 'MANUALLY_CONFIRMED'
  ).length;

  const deliveredCount = records.filter(
    (r) => r.status === 'SENT'
  ).length;

  const failedDeliveryCount = records.filter((r) => r.status === 'FAILED').length;

  // Workflow Step Computations
  const isStep1Complete = employeeCount > 0;
  const isStep2Complete = slipCount > 0;
  const isStep3Complete = slipCount > 0 && needsReviewCount === 0 && approvedCount > 0;
  const isStep4Complete = approvedCount > 0 && deliveredCount >= approvedCount;

  // Stepper Header Items
  const workflowSteps: StepItem[] = [
    {
      id: 'employees',
      title: 'Employees',
      subtitle: isStep1Complete ? `${employeeCount} imported` : 'Import employee list',
      status: isStep1Complete ? 'completed' : 'current',
    },
    {
      id: 'salary-slips',
      title: 'Salary Slips',
      subtitle: isStep2Complete
        ? `${slipCount} discovered`
        : isStep1Complete
        ? 'Add salary slips'
        : 'Waiting for employees',
      status: isStep2Complete ? 'completed' : isStep1Complete ? 'current' : 'upcoming',
    },
    {
      id: 'review',
      title: 'Review & Match',
      subtitle: !isStep2Complete
        ? 'Waiting for salary slips'
        : needsReviewCount > 0
        ? `${needsReviewCount} need review`
        : 'All slips approved',
      status: !isStep2Complete ? 'upcoming' : needsReviewCount > 0 ? 'attention' : 'completed',
    },
    {
      id: 'send',
      title: 'Send',
      subtitle:
        approvedCount === 0
          ? 'Waiting for approval'
          : isStep4Complete
          ? `${deliveredCount} delivered`
          : `${approvedCount} ready to send`,
      status: approvedCount === 0 ? 'upcoming' : isStep4Complete ? 'completed' : 'current',
    },
  ];

  // Dynamic Header Action Button
  const getHeaderAction = () => {
    if (!isStep1Complete) {
      return (
        <Button
          variant="primary"
          icon={<ArrowRight className="w-4 h-4" />}
          onClick={() => setActivePage('employees')}
        >
          Import Employees
        </Button>
      );
    }
    if (!isStep2Complete) {
      return (
        <Button
          variant="primary"
          icon={<FileText className="w-4 h-4" />}
          onClick={() => setActivePage('salary-slips')}
        >
          Add Salary Slips
        </Button>
      );
    }
    if (needsReviewCount > 0) {
      return (
        <Button
          variant="primary"
          icon={<CheckSquare className="w-4 h-4" />}
          onClick={() => setActivePage('review')}
        >
          Review & Match
        </Button>
      );
    }
    if (approvedCount > 0) {
      return (
        <Button
          variant="primary"
          icon={<Send className="w-4 h-4" />}
          onClick={() => setActivePage('send')}
        >
          Send Salary Slips
        </Button>
      );
    }
    return (
      <Button
        variant="outline"
        icon={<Users className="w-4 h-4" />}
        onClick={() => setActivePage('employees')}
      >
        View Employees
      </Button>
    );
  };

  return (
    <div className="space-y-6">
      {/* Welcome Page Header */}
      <PageHeader
        title="Distribution Overview"
        subtitle="Real-time status of employee records, salary slips, matching approvals, and delivery."
        action={getHeaderAction()}
      />

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Employees"
          value={employeeCount}
          icon={<Users className="w-5 h-5 text-slate-500" />}
          trend={employeeCount > 0 ? `${employeeCount} imported` : 'No employees imported yet'}
        />
        <StatCard
          label="Salary Slips"
          value={slipCount}
          icon={<FileText className="w-5 h-5 text-slate-500" />}
          trend={slipCount > 0 ? `${slipCount} discovered` : 'No salary slips added yet'}
        />
        <StatCard
          label="Needs Review"
          value={needsReviewCount}
          icon={<CheckSquare className="w-5 h-5 text-slate-500" />}
          trend={
            slipCount === 0
              ? 'Waiting for salary slips'
              : needsReviewCount > 0
              ? `${needsReviewCount} need review`
              : 'All slips approved'
          }
        />
        <StatCard
          label="Sent & Delivered"
          value={deliveredCount}
          icon={<Send className="w-5 h-5 text-emerald-600" />}
          trend={
            failedDeliveryCount > 0
              ? `${failedDeliveryCount} failed attempts`
              : approvedCount > 0
              ? `${approvedCount} ready to send`
              : 'No approved slips ready'
          }
        />
      </div>

      {/* Guided Distribution Pipeline */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-800">Distribution Workflow</h3>
        <StepIndicator
          steps={workflowSteps}
          onStepClick={(stepId) => setActivePage(stepId as any)}
        />
      </div>

      {/* Get Started Workflow Guide */}
      <Card
        title="Get Started Workflow Guide"
        subtitle="Follow these step-by-step actions to complete your salary slip distribution."
      >
        <div className="space-y-3 pt-1">
          {/* STEP 1 */}
          <div
            className={`p-4 border rounded-xl transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
              !isStep1Complete
                ? 'border-sky-300 bg-sky-50/50 shadow-xs ring-1 ring-sky-200'
                : 'border-slate-200 bg-white'
            }`}
          >
            <div className="flex items-start gap-3.5">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                  isStep1Complete
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-sky-600 text-white font-bold shadow-xs'
                }`}
              >
                {isStep1Complete ? <CheckCircle2 className="w-5 h-5" /> : '1'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-slate-900">Step 1: Import Employees</h4>
                  {isStep1Complete ? (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      COMPLETED
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-200">
                      CURRENT STEP
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {isStep1Complete
                    ? `${employeeCount} employee records loaded into Employee Master.`
                    : 'Import your employee master list before processing salary slips.'}
                </p>
              </div>
            </div>
            <Button
              variant={!isStep1Complete ? 'primary' : 'outline'}
              size="sm"
              icon={<Users className="w-3.5 h-3.5" />}
              onClick={() => setActivePage('employees')}
              className="shrink-0"
            >
              {isStep1Complete ? 'View Employees' : 'Import Employees'}
            </Button>
          </div>

          {/* STEP 2 */}
          <div
            className={`p-4 border rounded-xl transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
              !isStep1Complete
                ? 'border-slate-100 bg-slate-50/60 opacity-60'
                : !isStep2Complete
                ? 'border-sky-300 bg-sky-50/50 shadow-xs ring-1 ring-sky-200'
                : 'border-slate-200 bg-white'
            }`}
          >
            <div className="flex items-start gap-3.5">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                  isStep2Complete
                    ? 'bg-emerald-100 text-emerald-700'
                    : isStep1Complete
                    ? 'bg-sky-600 text-white font-bold shadow-xs'
                    : 'bg-slate-100 text-slate-400 border border-slate-200'
                }`}
              >
                {isStep2Complete ? <CheckCircle2 className="w-5 h-5" /> : !isStep1Complete ? <Lock className="w-4 h-4" /> : '2'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-slate-900">Step 2: Add Salary Slips</h4>
                  {isStep2Complete ? (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      COMPLETED
                    </span>
                  ) : !isStep1Complete ? (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                      LOCKED
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-200">
                      CURRENT STEP
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {!isStep1Complete
                    ? 'Import employee records first before adding salary slips.'
                    : isStep2Complete
                    ? `${slipCount} salary slips discovered and ingested.`
                    : 'Select a salary-slip folder, select PDF files, or drag and drop salary slips.'}
                </p>
              </div>
            </div>
            <Button
              variant={isStep1Complete && !isStep2Complete ? 'primary' : 'outline'}
              size="sm"
              disabled={!isStep1Complete}
              icon={<FileText className="w-3.5 h-3.5" />}
              onClick={() => setActivePage('salary-slips')}
              className="shrink-0"
            >
              {isStep2Complete ? 'View Salary Slips' : 'Add Salary Slips'}
            </Button>
          </div>

          {/* STEP 3 */}
          <div
            className={`p-4 border rounded-xl transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
              !isStep2Complete
                ? 'border-slate-100 bg-slate-50/60 opacity-60'
                : needsReviewCount > 0
                ? 'border-amber-300 bg-amber-50/50 shadow-xs ring-1 ring-amber-200'
                : 'border-slate-200 bg-white'
            }`}
          >
            <div className="flex items-start gap-3.5">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                  isStep3Complete
                    ? 'bg-emerald-100 text-emerald-700'
                    : isStep2Complete && needsReviewCount > 0
                    ? 'bg-amber-500 text-white font-bold shadow-xs'
                    : 'bg-slate-100 text-slate-400 border border-slate-200'
                }`}
              >
                {isStep3Complete ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : !isStep2Complete ? (
                  <Lock className="w-4 h-4" />
                ) : (
                  '3'
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-slate-900">Step 3: Review & Match Employees</h4>
                  {!isStep2Complete ? (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                      LOCKED
                    </span>
                  ) : needsReviewCount > 0 ? (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                      NEEDS REVIEW ({needsReviewCount})
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      COMPLETED
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {!isStep2Complete
                    ? 'Add salary slips before reviewing employee matches.'
                    : needsReviewCount > 0
                    ? `${needsReviewCount} salary slips require review or confirmation (${approvedCount}/${slipCount} approved).`
                    : `All ${slipCount} salary slips have been reviewed and approved.`}
                </p>
              </div>
            </div>
            <Button
              variant={isStep2Complete && needsReviewCount > 0 ? 'primary' : 'outline'}
              size="sm"
              disabled={!isStep2Complete}
              icon={<CheckSquare className="w-3.5 h-3.5" />}
              onClick={() => setActivePage('review')}
              className="shrink-0"
            >
              {isStep3Complete ? 'View Matching' : 'Review & Match'}
            </Button>
          </div>

          {/* STEP 4 */}
          <div
            className={`p-4 border rounded-xl transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
              approvedCount === 0
                ? 'border-slate-100 bg-slate-50/60 opacity-60'
                : !isStep4Complete
                ? 'border-emerald-300 bg-emerald-50/50 shadow-xs ring-1 ring-emerald-200'
                : 'border-slate-200 bg-white'
            }`}
          >
            <div className="flex items-start gap-3.5">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                  isStep4Complete
                    ? 'bg-emerald-100 text-emerald-700'
                    : approvedCount > 0
                    ? 'bg-emerald-600 text-white font-bold shadow-xs'
                    : 'bg-slate-100 text-slate-400 border border-slate-200'
                }`}
              >
                {isStep4Complete ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : approvedCount === 0 ? (
                  <Lock className="w-4 h-4" />
                ) : (
                  '4'
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-slate-900">Step 4: Send Salary Slips</h4>
                  {approvedCount === 0 ? (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                      LOCKED
                    </span>
                  ) : !isStep4Complete ? (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      READY TO SEND ({approvedCount})
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      COMPLETED ({deliveredCount})
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {approvedCount === 0
                    ? 'Approve salary slips before sending them to employees.'
                    : isStep4Complete
                    ? `${deliveredCount} salary slips successfully sent & delivered.`
                    : `${approvedCount} salary slips are approved and ready for delivery.`}
                </p>
              </div>
            </div>
            <Button
              variant={approvedCount > 0 && !isStep4Complete ? 'primary' : 'outline'}
              size="sm"
              disabled={approvedCount === 0}
              icon={<Send className="w-3.5 h-3.5" />}
              onClick={() => setActivePage('send')}
              className="shrink-0"
            >
              {isStep4Complete ? 'View Delivery' : 'Send Salary Slips'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
