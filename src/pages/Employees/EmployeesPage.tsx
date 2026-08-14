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
import { useEmployeeStore } from '../../stores/employeeStore';
import { Employee } from '../../types/employee';
import { Upload, Users } from 'lucide-react';

export const EmployeesPage: React.FC = () => {
  const { employees, fetchEmployees, searchQuery, setSearchQuery } = useEmployeeStore();
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const handleImportSuccess = (importedCount: number, skippedCount: number) => {
    let msg = `${importedCount} employee${importedCount === 1 ? '' : 's'} imported successfully.`;
    if (skippedCount > 0) {
      msg = `${importedCount} employee${importedCount === 1 ? '' : 's'} imported. ${skippedCount} were already in Nexora.`;
    }
    setToastMessage(msg);
  };

  const filteredEmployees = employees.filter((emp) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase().trim();
    return (
      emp.name.toLowerCase().includes(query) ||
      emp.employeeId.toLowerCase().includes(query) ||
      emp.email.toLowerCase().includes(query) ||
      (emp.department && emp.department.toLowerCase().includes(query)) ||
      (emp.phone && emp.phone.toLowerCase().includes(query))
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
        subtitle="Manage your employee contact list."
        action={
          <Button
            variant="primary"
            icon={<Upload className="w-4 h-4" />}
            onClick={() => setIsImportOpen(true)}
          >
            Import Excel
          </Button>
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
              placeholder="Search by name, ID, email, department, or phone..."
              value={searchQuery}
              onSearchChange={setSearchQuery}
            />
            <span className="text-xs text-slate-500 font-medium">{filteredEmployees.length} employees found</span>
          </div>
          <Table<Employee>
            columns={columns}
            data={filteredEmployees}
            keyExtractor={(item) => item.id}
            emptyMessage="No matching employee records found."
          />
        </Card>
      )}

      {/* Import Excel Modal Dialog */}
      <ImportExcelDialog
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onSuccess={handleImportSuccess}
      />

      {/* Toast Notification Alert */}
      {toastMessage && (
        <Toast type="success" message={toastMessage} onClose={() => setToastMessage(null)} />
      )}
    </div>
  );
};
