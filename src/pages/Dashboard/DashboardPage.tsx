import React, { useEffect } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { StatCard } from '../../components/common/StatCard';
import { StepIndicator, StepItem } from '../../components/common/StepIndicator';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { useAppStore } from '../../stores/appStore';
import { useEmployeeStore } from '../../stores/employeeStore';
import { useSalarySlipStore } from '../../stores/salarySlipStore';
import { useMatchingStore } from '../../stores/matchingStore';
import { useSendingStore } from '../../stores/sendingStore';
import { Users, FileText, CheckSquare, Send, ArrowRight } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { setActivePage } = useAppStore();
  const { employees, fetchEmployees } = useEmployeeStore();
  const { slips } = useSalarySlipStore();
  const { matches } = useMatchingStore();
  const { jobs } = useSendingStore();

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const pendingReviewCount = matches.filter((m) => !m.confirmed).length;
  const sentCount = jobs.filter((j) => j.status === 'SENT').length;

  const workflowSteps: StepItem[] = [
    {
      id: 'employees',
      title: 'Employees',
      subtitle: employees.length > 0 ? `${employees.length} records loaded` : 'Import your employee list',
      status: employees.length > 0 ? 'completed' : 'current',
    },
    {
      id: 'salary-slips',
      title: 'Salary Slips',
      subtitle: slips.length > 0 ? `${slips.length} files detected` : 'Scan your salary slip folder',
      status: slips.length > 0 ? 'completed' : 'upcoming',
    },
    {
      id: 'review',
      title: 'Review',
      subtitle: pendingReviewCount > 0 ? `${pendingReviewCount} need attention` : 'Nothing to review',
      status: pendingReviewCount > 0 ? 'attention' : 'upcoming',
    },
    {
      id: 'send',
      title: 'Send',
      subtitle: sentCount > 0 ? `${sentCount} sent` : 'Nothing ready to send',
      status: 'upcoming',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Page Header */}
      <PageHeader
        title="Distribution Overview"
        subtitle="Current status of salary slip files and distribution tasks."
        action={
          <Button
            variant="primary"
            icon={<ArrowRight className="w-4 h-4" />}
            onClick={() => setActivePage('employees')}
          >
            Import Employees
          </Button>
        }
      />

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Employees"
          value={employees.length}
          icon={<Users className="w-5 h-5 text-slate-500" />}
          trend={employees.length > 0 ? `${employees.length} imported` : 'No employees imported yet'}
        />
        <StatCard
          label="Salary Slips"
          value={slips.length}
          icon={<FileText className="w-5 h-5 text-slate-500" />}
          trend={slips.length > 0 ? `${slips.length} scanned` : 'No salary slips scanned yet'}
        />
        <StatCard
          label="Needs Review"
          value={pendingReviewCount}
          icon={<CheckSquare className="w-5 h-5 text-slate-500" />}
          trend={pendingReviewCount > 0 ? `${pendingReviewCount} need review` : 'Nothing needs review'}
        />
        <StatCard
          label="Sent"
          value={sentCount}
          icon={<Send className="w-5 h-5 text-slate-500" />}
          trend={sentCount > 0 ? `${sentCount} delivered` : 'No salary slips sent yet'}
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

      {/* Quick Start Card */}
      <Card title="Get Started" subtitle="Follow the distribution workflow steps above">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-slate-50 border border-slate-200/80 rounded-lg">
          <div>
            <h4 className="text-sm font-semibold text-slate-900">Step 1: Import Employees</h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Start by importing an Excel file containing employee IDs, names, phone numbers, and email addresses.
            </p>
          </div>
          <Button variant="primary" size="sm" onClick={() => setActivePage('employees')}>
            Import Employees
          </Button>
        </div>
      </Card>
    </div>
  );
};
