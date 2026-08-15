import React, { useRef, useState } from 'react';
import { Dialog } from '../../components/common/Dialog';
import { Button } from '../../components/common/Button';
import { Alert } from '../../components/common/Alert';
import { Spinner } from '../../components/common/Spinner';
import { ImportSummary } from './ImportSummary';
import { ImportPreviewTable } from './ImportPreviewTable';
import { parseExcelWorkbook } from './excelReader';
import { EmployeeImportSummary } from './importTypes';
import { useEmployeeStore } from '../../stores/employeeStore';
import { Upload, FileSpreadsheet, AlertTriangle } from 'lucide-react';

interface ImportExcelDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newCount: number, updatedCount: number, unchangedCount: number) => void;
}

export const ImportExcelDialog: React.FC<ImportExcelDialogProps> = ({ isOpen, onClose, onSuccess }) => {
  const { employees, importEmployees } = useEmployeeStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loadingStep, setLoadingStep] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [summary, setSummary] = useState<EmployeeImportSummary | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    setSummary(null);

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'xlsx' && ext !== 'xls') {
      setErrorMessage('Please select an Excel file (.xlsx or .xls).');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    try {
      setLoadingStep('Reading employee list...');
      const arrayBuffer = await file.arrayBuffer();

      setLoadingStep('Checking employee details...');
      const existingEmployeesMap = new Map(employees.map((emp) => [emp.employeeId.toLowerCase(), emp]));
      const result = await parseExcelWorkbook(arrayBuffer, { existingEmployees: existingEmployeesMap });

      setSummary(result);
      setLoadingStep(null);
    } catch (err: any) {
      setLoadingStep(null);
      setErrorMessage(err.message || 'Failed to read file. Please select a valid Excel file (.xlsx or .xls).');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleConfirmImport = async () => {
    if (!summary) return;

    const validRowsToSave = summary.rows
      .filter((r) => r.status === 'NEW' || r.status === 'UPDATED' || r.status === 'READY')
      .map((r) => ({
        employeeId: r.data.employeeId,
        name: r.data.fullName,
        email: r.data.email,
        phone: r.data.phone || '',
        whatsappNumber: r.data.phone || '',
        department: r.data.department || '',
        designation: r.data.designation || '',
      }));

    if (validRowsToSave.length === 0) return;

    try {
      setLoadingStep('Importing and updating employee records...');
      await importEmployees(validRowsToSave);
      setLoadingStep(null);
      onSuccess(summary.newCount, summary.updatedCount, summary.unchangedCount);
      handleClose();
    } catch (err: any) {
      setLoadingStep(null);
      setErrorMessage('Failed to save employee records. Please try again.');
    }
  };

  const handleClose = () => {
    setSummary(null);
    setErrorMessage(null);
    setLoadingStep(null);
    onClose();
  };

  const totalToProcess = summary ? summary.newCount + summary.updatedCount : 0;

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
        title="Import / Update Employees from Excel"
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
            <div className="py-8 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 p-6 text-center">
              <div className="p-3 bg-sky-50 text-sky-600 rounded-full mb-3">
                <FileSpreadsheet className="w-8 h-8" />
              </div>
              <h4 className="text-sm font-semibold text-slate-900">Select an Excel Spreadsheet</h4>
              <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
                Upload a .xlsx or .xls file containing employee records to import new employees or update existing records.
              </p>
              <Button
                variant="primary"
                icon={<Upload className="w-4 h-4" />}
                onClick={() => fileInputRef.current?.click()}
              >
                Select Excel File
              </Button>
            </div>
          )}

          {errorMessage && (
            <div className="space-y-4">
              <Alert type="error" title="Import Error">
                <div className="flex items-center gap-2">
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

          {summary && summary.missingRequiredColumns && summary.missingRequiredColumns.length > 0 && (
            <div className="space-y-4">
              <Alert type="error" title="Some required columns are missing.">
                <div className="space-y-2 text-xs">
                  <p className="font-semibold text-rose-900">Missing columns:</p>
                  <ul className="list-disc list-inside space-y-0.5 text-rose-700">
                    {summary.missingRequiredColumns.map((col) => (
                      <li key={col}>{col}</li>
                    ))}
                  </ul>
                  <p className="mt-2 text-slate-600">
                    Please ensure your Excel file contains column headers for Employee ID and Full Name.
                  </p>
                </div>
              </Alert>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
                  Select Different File
                </Button>
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {summary && (!summary.missingRequiredColumns || summary.missingRequiredColumns.length === 0) && !loadingStep && (
            <div className="space-y-4">
              <ImportSummary summary={summary} />
              <ImportPreviewTable rows={summary.rows} />

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Change File
                </Button>

                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={handleClose}>
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    disabled={totalToProcess === 0}
                    onClick={handleConfirmImport}
                  >
                    {totalToProcess > 0 ? `Import / Update ${totalToProcess} Employees` : 'No Changes Required'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Dialog>
    </>
  );
};
