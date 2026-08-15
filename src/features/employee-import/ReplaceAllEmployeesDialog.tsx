import React, { useRef, useState } from 'react';
import { Dialog } from '../../components/common/Dialog';
import { Button } from '../../components/common/Button';
import { Alert } from '../../components/common/Alert';
import { Spinner } from '../../components/common/Spinner';
import { ImportPreviewTable } from './ImportPreviewTable';
import { parseExcelWorkbook } from './excelReader';
import { EmployeeImportSummary } from './importTypes';
import { useEmployeeStore } from '../../stores/employeeStore';
import { Upload, AlertTriangle, Trash2, RefreshCw } from 'lucide-react';

interface ReplaceAllEmployeesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (replacedCount: number) => void;
}

export const ReplaceAllEmployeesDialog: React.FC<ReplaceAllEmployeesDialogProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { employees, replaceAllEmployees } = useEmployeeStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loadingStep, setLoadingStep] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [summary, setSummary] = useState<EmployeeImportSummary | null>(null);
  const [isConfirmingAction, setIsConfirmingAction] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    setSummary(null);
    setIsConfirmingAction(false);

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'xlsx' && ext !== 'xls') {
      setErrorMessage('Please select a valid Excel file (.xlsx or .xls).');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    try {
      setLoadingStep('Reading Excel file...');
      const arrayBuffer = await file.arrayBuffer();

      setLoadingStep('Validating employee rows...');
      const result = await parseExcelWorkbook(arrayBuffer, {
        existingEmployeeIds: new Set(),
      });

      setSummary(result);
      setLoadingStep(null);
    } catch (err: any) {
      setLoadingStep(null);
      setErrorMessage(err.message || 'Failed to read file. Please select a valid Excel file (.xlsx or .xls).');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleConfirmReplace = async () => {
    if (!summary) return;

    const validRowsToSave = summary.rows
      .filter((r) => r.status !== 'NEEDS_ATTENTION' && r.data.employeeId && r.data.fullName)
      .map((r) => ({
        employeeId: r.data.employeeId,
        name: r.data.fullName,
        email: r.data.email,
        phone: r.data.phone || '',
        whatsappNumber: r.data.phone || '',
        department: r.data.department || '',
        designation: r.data.designation || '',
      }));

    if (validRowsToSave.length === 0) {
      setErrorMessage('No valid employee records found in Excel file to insert.');
      return;
    }

    try {
      setLoadingStep('Backing up database and replacing employee master dataset...');
      const count = await replaceAllEmployees(validRowsToSave);
      setLoadingStep(null);
      onSuccess(count);
      handleClose();
    } catch (err: any) {
      setLoadingStep(null);
      setErrorMessage(
        'Failed to replace employee master list. Transaction was safely rolled back and previous database records were preserved.'
      );
    }
  };

  const handleClose = () => {
    setSummary(null);
    setErrorMessage(null);
    setLoadingStep(null);
    setIsConfirmingAction(false);
    onClose();
  };

  const currentEmployeeCount = employees.length;
  const validRowsCount = summary
    ? summary.rows.filter((r) => r.status !== 'NEEDS_ATTENTION' && r.data.employeeId && r.data.fullName).length
    : 0;

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".xlsx,.xls"
        className="hidden"
      />

      <Dialog
        isOpen={isOpen}
        onClose={handleClose}
        title="Replace All Employees (Employee Master)"
        maxWidth="max-w-3xl"
      >
        <div className="space-y-4">
          {loadingStep && (
            <div className="py-12 flex flex-col items-center justify-center gap-3">
              <Spinner size="lg" />
              <span className="text-sm font-medium text-slate-700">{loadingStep}</span>
            </div>
          )}

          {!loadingStep && !summary && !errorMessage && (
            <div className="space-y-4">
              <Alert type="error" title="Warning: Destructive Operation">
                <div className="space-y-1.5 text-xs text-rose-900">
                  <p className="font-semibold">
                    Replacing the employee master list will PERMANENTLY REMOVE all {currentEmployeeCount} current employee records.
                  </p>
                  <p>
                    This option is intended for updating your master organization structure. An automatic database backup will be created prior to transaction execution.
                  </p>
                </div>
              </Alert>

              <div className="py-8 flex flex-col items-center justify-center border-2 border-dashed border-rose-200 rounded-xl bg-rose-50/30 p-6 text-center">
                <div className="p-3 bg-rose-100 text-rose-600 rounded-full mb-3">
                  <Trash2 className="w-8 h-8" />
                </div>
                <h4 className="text-sm font-semibold text-slate-900">Select Replacement Excel File</h4>
                <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
                  Upload a .xlsx or .xls file containing your new master employee dataset.
                </p>
                <Button
                  variant="danger"
                  icon={<Upload className="w-4 h-4" />}
                  onClick={() => fileInputRef.current?.click()}
                >
                  Select Replacement File
                </Button>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="space-y-4">
              <Alert type="error" title="Replacement Operation Error">
                <div className="flex items-center gap-2 text-xs">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              </Alert>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
                  Try Another File
                </Button>
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {summary && !loadingStep && (
            <div className="space-y-4">
              {/* Metrics Header Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl">
                <div className="p-2.5 bg-white border border-slate-200/60 rounded-lg">
                  <span className="text-[11px] font-medium text-slate-500 block">Total Rows</span>
                  <span className="text-lg font-bold text-slate-900 mt-0.5 block">{summary.totalRows}</span>
                </div>
                <div className="p-2.5 bg-emerald-50/50 border border-emerald-200/60 rounded-lg">
                  <span className="text-[11px] font-medium text-emerald-700 block">New Master</span>
                  <span className="text-lg font-bold text-emerald-800 mt-0.5 block">{validRowsCount}</span>
                </div>
                <div className="p-2.5 bg-rose-50/50 border border-rose-200/60 rounded-lg">
                  <span className="text-[11px] font-medium text-rose-700 block">Will Remove</span>
                  <span className="text-lg font-bold text-rose-800 mt-0.5 block">{currentEmployeeCount}</span>
                </div>
                <div className="p-2.5 bg-amber-50/50 border border-amber-200/60 rounded-lg">
                  <span className="text-[11px] font-medium text-amber-700 block">Invalid Rows</span>
                  <span className="text-lg font-bold text-amber-800 mt-0.5 block">{summary.needsAttentionCount}</span>
                </div>
                <div className="p-2.5 bg-slate-100/70 border border-slate-200 rounded-lg">
                  <span className="text-[11px] font-medium text-slate-600 block">Unchanged</span>
                  <span className="text-lg font-bold text-slate-700 mt-0.5 block">0</span>
                </div>
              </div>

              <ImportPreviewTable rows={summary.rows} />

              {/* Explicit Confirmation Banner before final action */}
              {isConfirmingAction ? (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-3">
                  <div className="flex items-start gap-2.5 text-xs text-rose-900">
                    <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-bold text-rose-950">Replace all employees?</p>
                      <p>
                        This will remove the current employee master list ({currentEmployeeCount} employees) and replace it with the {validRowsCount} validated employees from this Excel file.
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <Button variant="outline" size="sm" onClick={() => setIsConfirmingAction(false)}>
                      Cancel
                    </Button>
                    <Button variant="danger" size="sm" icon={<RefreshCw className="w-3.5 h-3.5" />} onClick={handleConfirmReplace}>
                      Replace Employees
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                    Change File
                  </Button>

                  <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={handleClose}>
                      Cancel
                    </Button>
                    <Button
                      variant="danger"
                      disabled={validRowsCount === 0}
                      onClick={() => setIsConfirmingAction(true)}
                    >
                      Replace Employees
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Dialog>
    </>
  );
};
