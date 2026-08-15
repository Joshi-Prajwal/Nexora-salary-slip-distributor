import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';
import { Table, Column } from '../../components/common/Table';
import { Button } from '../../components/common/Button';
import { SearchInput } from '../../components/common/SearchInput';
import { Toast } from '../../components/common/Toast';
import { EmptyState } from '../../components/feedback/EmptyState';
import { StatusBadge } from '../../components/feedback/StatusBadge';
import { ImportExcelDialog } from '../../features/employee-import/ImportExcelDialog';
import { ReplaceAllEmployeesDialog } from '../../features/employee-import/ReplaceAllEmployeesDialog';
import { useEmployeeStore } from '../../stores/employeeStore';
import { Employee } from '../../types/employee';
import { Upload, Users, RefreshCw, Trash2 } from 'lucide-react';

export const EmployeesPage: React.FC = () => {
  const { employees, fetchEmployees, searchQuery, setSearchQuery } = useEmployeeStore();
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isReplaceOpen, setIsReplaceOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const handleImportSuccess = (newCount: number, updatedCount: number, _unchangedCount: number) => {
    fetchEmployees();
    const parts: string[] = [];
    if (newCount > 0) {
      parts.push(`${newCount} new employee${newCount === 1 ? '' : 's'} imported`);
    }
    if (updatedCount > 0) {
      parts.push(`${updatedCount} employee record${updatedCount === 1 ? '' : 's'} updated`);
    }
    if (parts.length === 0) {
      setToastMessage('Employee list processed cleanly (no changes required).');
    } else {
      setToastMessage(`${parts.join(', ')} successfully.`);
    }
  };

  const handleReplaceSuccess = (replacedCount: number) => {
    fetchEmployees();
    setToastMessage(`Master employee dataset replaced cleanly with ${replacedCount} employee records.`);
  };

  const filteredEmployees = employees.filter((emp) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase().trim();
    const phoneRaw = emp.phone ? String(emp.phone).toLowerCase() : '';
    const phoneClean = phoneRaw.replace(/\D/g, '');
    const queryClean = query.replace(/\D/g, '');

    return (
      (emp.name && emp.name.toLowerCase().includes(query)) ||
      (emp.employeeId && emp.employeeId.toLowerCase().includes(query)) ||
      (emp.email && emp.email.toLowerCase().includes(query)) ||
      (emp.department && emp.department.toLowerCase().includes(query)) ||
      (emp.designation && emp.designation.toLowerCase().includes(query)) ||
      (phoneRaw && phoneRaw.includes(query)) ||
      (queryClean.length >= 2 && phoneClean.includes(queryClean))
    );
  });

  const columns: Column<Employee>[] = [
    { key: 'employeeId', header: 'Employee ID' },
    { key: 'name', header: 'Full Name' },
    { key: 'department', header: 'Department' },
    { key: 'email', header: 'Email Address' },
    { key: 'phone', header: 'Phone Number' },
    {
      key: 'status',
      header: 'Status',
      render: () => <StatusBadge status="READY" />,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employees"
        subtitle="Manage your employee contact list, import updates, or replace master dataset via Excel."
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={<RefreshCw className="w-3.5 h-3.5" />}
              onClick={() => setIsImportOpen(true)}
            >
              Update Excel
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Upload className="w-3.5 h-3.5" />}
              onClick={() => setIsImportOpen(true)}
            >
              Import Excel
            </Button>
            <Button
              variant="danger"
              size="sm"
              icon={<Trash2 className="w-3.5 h-3.5" />}
              onClick={() => setIsReplaceOpen(true)}
            >
              Replace All Employees
            </Button>
          </div>
        }
      />

      {employees.length === 0 ? (
        <EmptyState
          icon={<Users className="w-6 h-6 text-slate-400" />}
          title="Import your employee list"
          description="Import an Excel file containing your employee details to get started."
          actionLabel="Import Excel"
          onAction={() => setIsImportOpen(true)}
        />
      ) : (
        <Card noPadding>
          <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-4">
            <SearchInput
              placeholder="Search by name, ID, email, department, phone..."
              value={searchQuery}
              onSearchChange={setSearchQuery}
              containerClassName="w-full max-w-lg"
            />
            <span className="text-xs text-slate-500 font-medium whitespace-nowrap">{filteredEmployees.length} employees found</span>
          </div>
          <Table<Employee>
            columns={columns}
            data={filteredEmployees}
            keyExtractor={(item) => item.id}
            emptyMessage="No matching employee records found."
          />
        </Card>
      )}

      {/* Import / Update Excel Modal Dialog */}
      <ImportExcelDialog
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onSuccess={handleImportSuccess}
      />

      {/* Replace All Employees Modal Dialog */}
      <ReplaceAllEmployeesDialog
        isOpen={isReplaceOpen}
        onClose={() => setIsReplaceOpen(false)}
        onSuccess={handleReplaceSuccess}
      />

      {/* Toast Notification Alert */}
      {toastMessage && (
        <Toast type="success" message={toastMessage} onClose={() => setToastMessage(null)} />
      )}
    </div>
  );
};
