import React from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { StatCard } from '../../components/common/StatCard';
import { StepIndicator, StepItem } from '../../components/common/StepIndicator';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { useAppStore } from '../../stores/appStore';
import { Users, FileText, CheckSquare, Send, ArrowRight } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { setActivePage } = useAppStore();

  const workflowSteps: StepItem[] = [
    {
      id: 'employees',
      title: 'Employees',
      subtitle: '124 records loaded',
      status: 'completed',
    },
    {
      id: 'salary-slips',
      title: 'Salary Slips',
      subtitle: '124 files detected',
      status: 'completed',
    },
    {
      id: 'review',
      title: 'Review',
      subtitle: '3 need attention',
      status: 'attention',
    },
    {
      id: 'send',
      title: 'Send',
      subtitle: '118 ready for dispatch',
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
            onClick={() => setActivePage('review')}
          >
            Review Pending Slips
          </Button>
        }
      />

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Employees"
          value="124"
          icon={<Users className="w-5 h-5" />}
          trend="Directory active"
        />
        <StatCard
          label="Detected Salary Slips"
          value="124"
          icon={<FileText className="w-5 h-5" />}
          trend="Scanned from local folder"
        />
        <StatCard
          label="Needs Review"
          value="3"
          icon={<CheckSquare className="w-5 h-5 text-amber-600" />}
          trend="Requires human confirmation"
        />
        <StatCard
          label="Sent Salary Slips"
          value="118"
          icon={<Send className="w-5 h-5 text-emerald-600" />}
          trend="Successfully distributed"
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

      {/* Quick Action Guide */}
      <Card title="Distribution Summary" subtitle="Next steps to complete distribution">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-slate-50 border border-slate-200/80 rounded-lg">
          <div>
            <h4 className="text-sm font-semibold text-slate-900">3 Salary Slips Require Confirmation</h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Confirm matched employee names before sending to ensure confidential slips reach the correct recipient.
            </p>
          </div>
          <Button variant="primary" size="sm" onClick={() => setActivePage('review')}>
            Review Now
          </Button>
        </div>
      </Card>
    </div>
  );
};
