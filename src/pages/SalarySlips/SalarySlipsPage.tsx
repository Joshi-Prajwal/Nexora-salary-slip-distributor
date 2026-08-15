import React, { useEffect, useState, useRef } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';
import { Table, Column } from '../../components/common/Table';
import { Button } from '../../components/common/Button';
import { SearchInput } from '../../components/common/SearchInput';
import { Toast } from '../../components/common/Toast';
import { EmptyState } from '../../components/feedback/EmptyState';
import { StatusBadge } from '../../components/feedback/StatusBadge';
import { SalarySlipDrawer } from '../../features/salary-slips/SalarySlipDrawer';
import { useSalarySlipStore } from '../../stores/salarySlipStore';
import { SalarySlip } from '../../types/salarySlip';
import { FolderOpen, FileText, Eye, Trash2, Cpu, FileSearch, RefreshCw } from 'lucide-react';

export const SalarySlipsPage: React.FC = () => {
  const {
    slips,
    scannedFolderPath,
    isScanning,
    isExtracting,
    isOcrProcessing,
    lastScanSummary,
    lastExtractionSummary,
    lastOcrBatchSummary,
    selectedSlip,
    fetchSalarySlips,
    scanFolder,
    extractSlip,
    extractAll,
    runOcr,
    runBatchOcr,
    removeSlipRecord,
    setSelectedSlip,
  } = useSalarySlipStore();

  const [search, setSearch] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSalarySlips();
  }, [fetchSalarySlips]);

  const handleSelectFolder = async () => {
    if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
      try {
        const dialogPlugin = await import('@tauri-apps/plugin-dialog');
        const selected = await dialogPlugin.open({
          directory: true,
          multiple: false,
          title: 'Select Salary Slip Folder',
        });
        if (selected && typeof selected === 'string') {
          const summary = await scanFolder(selected);
          if (summary) {
            setToastMessage(`Scanned ${summary.pdfCount} PDF files. ${summary.newCount} new, ${summary.unchangedCount} unchanged, ${summary.duplicateCount} duplicate.`);
          }
          return;
        }
      } catch (_err) {
        // Fallback to web input click below
      }
    }
    folderInputRef.current?.click();
  };

  const handleWebFolderChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const firstFile = files[0];
    const folderPath = firstFile.webkitRelativePath
      ? firstFile.webkitRelativePath.split('/')[0]
      : 'Selected Folder';

    try {
      const summary = await scanFolder(folderPath);
      if (summary) {
        setToastMessage(`Discovered ${summary.pdfCount} PDF files.`);
      }
    } catch (_err) {
      setToastMessage('Failed to scan selected folder.');
    } finally {
      if (folderInputRef.current) folderInputRef.current.value = '';
    }
  };

  const handleExtractAll = async () => {
    try {
      const summary = await extractAll();
      if (summary) {
        setToastMessage(`Processed ${summary.processed} PDFs: ${summary.identified} identified, ${summary.partiallyIdentified} partially identified, ${summary.notIdentified} not identified.`);
      }
    } catch (_err) {
      setToastMessage('Failed to extract PDF details.');
    }
  };

  const handleRunBatchOcr = async () => {
    try {
      const summary = await runBatchOcr();
      if (summary) {
        setToastMessage(`OCR processing complete for ${summary.processed} PDFs: ${summary.identified} identified, ${summary.partiallyIdentified} partially identified.`);
      }
    } catch (_err) {
      setToastMessage('Failed to run OCR batch recognition.');
    }
  };

  const filteredSlips = slips.filter((slip) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    return (
      slip.fileName.toLowerCase().includes(q) ||
      slip.filePath.toLowerCase().includes(q) ||
      slip.fileHash.toLowerCase().includes(q) ||
      (slip.detectedEmployeeId && slip.detectedEmployeeId.toLowerCase().includes(q)) ||
      (slip.detectedName && slip.detectedName.toLowerCase().includes(q)) ||
      (slip.detectedEmail && slip.detectedEmail.toLowerCase().includes(q))
    );
  });

  const columns: Column<SalarySlip>[] = [
    { key: 'fileName', header: 'File Name' },
    {
      key: 'detectedInfo',
      header: 'Identified Employee',
      render: (item) => (
        <div>
          {item.detectedEmployeeId || item.detectedName ? (
            <div>
              <span className="font-semibold text-slate-900 block truncate max-w-xs font-mono">
                {item.detectedEmployeeId || 'No ID'}
              </span>
              <span className="text-xs text-slate-500 block truncate max-w-xs">
                {item.detectedName || item.detectedEmail || 'Unidentified'}
              </span>
            </div>
          ) : (
            <span className="text-xs text-slate-400 font-medium">Unidentified</span>
          )}
        </div>
      ),
    },
    {
      key: 'extractionMethod',
      header: 'Extraction',
      render: (item) => (
        <span className="text-xs text-slate-600 font-medium">
          {item.extractionMethod === 'TEXT_EMBEDDED'
            ? 'Text Embedded'
            : item.extractionMethod === 'OCR'
            ? 'OCR Image'
            : 'Not Identified'}
        </span>
      ),
    },
    {
      key: 'matchStatus',
      header: 'Status',
      render: (item) => <StatusBadge status={item.matchStatus} />,
    },
    {
      key: 'action',
      header: 'Actions',
      align: 'right',
      render: (item) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            icon={<FileSearch className="w-3.5 h-3.5" />}
            isLoading={isExtracting}
            onClick={() => extractSlip(item.id)}
          >
            Extract
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={<RefreshCw className="w-3.5 h-3.5" />}
            isLoading={isOcrProcessing}
            onClick={() => runOcr(item.id)}
          >
            OCR
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={<Eye className="w-3.5 h-3.5" />}
            onClick={() => setSelectedSlip(item)}
          >
            Details
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={<Trash2 className="w-3.5 h-3.5 text-rose-500" />}
            onClick={() => {
              removeSlipRecord(item.id);
              setToastMessage('Salary slip database record removed.');
            }}
          >
            Remove
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Hidden Web Folder Input Fallback */}
      <input
        type="file"
        ref={folderInputRef}
        onChange={handleWebFolderChange}
        // @ts-ignore
        webkitdirectory=""
        directory=""
        className="hidden"
      />

      <PageHeader
        title="Salary Slips"
        subtitle="Scan a folder containing your salary slip PDFs and extract employee details."
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              icon={<FolderOpen className="w-4 h-4" />}
              isLoading={isScanning}
              onClick={handleSelectFolder}
            >
              Select Folder
            </Button>
            <Button
              variant="primary"
              icon={<Cpu className="w-4 h-4" />}
              isLoading={isExtracting}
              disabled={slips.length === 0}
              onClick={handleExtractAll}
            >
              Identify Salary Slips
            </Button>
            <Button
              variant="secondary"
              icon={<RefreshCw className="w-4 h-4" />}
              isLoading={isOcrProcessing}
              disabled={slips.length === 0}
              onClick={handleRunBatchOcr}
            >
              Run OCR
            </Button>
          </div>
        }
      />

      {slips.length === 0 ? (
        <EmptyState
          icon={<FileText className="w-6 h-6 text-slate-400" />}
          title="No salary slips found"
          description="Select a folder containing salary slip files to get started."
          actionLabel="Select Folder"
          onAction={handleSelectFolder}
        />
      ) : (
        <Card noPadding>
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <SearchInput
              placeholder="Search by ID, name, email, or file name..."
              value={search}
              onSearchChange={setSearch}
            />
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <span>Path: {scannedFolderPath || 'Discovered PDFs'}</span>
              <span className="text-slate-300">•</span>
              <span>{slips.length} files registered</span>
            </div>
          </div>

          {lastScanSummary && (
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex flex-wrap items-center gap-4 text-xs text-slate-600">
              <span>Total Discovered: <strong className="text-slate-900">{lastScanSummary.pdfCount}</strong></span>
              <span className="text-slate-300">•</span>
              <span>New: <strong className="text-emerald-700 font-semibold">{lastScanSummary.newCount}</strong></span>
              <span>Unchanged: <strong className="text-slate-900">{lastScanSummary.unchangedCount}</strong></span>
              <span>Updated: <strong className="text-blue-700 font-semibold">{lastScanSummary.updatedCount}</strong></span>
              <span>Duplicates: <strong className="text-amber-700 font-semibold">{lastScanSummary.duplicateCount}</strong></span>
            </div>
          )}

          {lastExtractionSummary && (
            <div className="px-4 py-2.5 bg-emerald-50/70 border-b border-emerald-100 flex flex-wrap items-center gap-4 text-xs text-emerald-800">
              <span>Identified: <strong className="text-emerald-900 font-bold">{lastExtractionSummary.identified}</strong></span>
              <span>Partially Identified: <strong className="text-blue-900 font-semibold">{lastExtractionSummary.partiallyIdentified}</strong></span>
              <span>Not Identified: <strong className="text-slate-800 font-medium">{lastExtractionSummary.notIdentified}</strong></span>
              <span>Failed: <strong className="text-rose-800 font-semibold">{lastExtractionSummary.failed}</strong></span>
            </div>
          )}

          {lastOcrBatchSummary && (
            <div className="px-4 py-2.5 bg-blue-50/70 border-b border-blue-100 flex flex-wrap items-center gap-4 text-xs text-blue-900">
              <span>OCR Processed: <strong className="text-blue-900 font-bold">{lastOcrBatchSummary.processed}</strong></span>
              <span>Identified: <strong className="text-emerald-900 font-semibold">{lastOcrBatchSummary.identified}</strong></span>
              <span>Partially Identified: <strong className="text-blue-900 font-semibold">{lastOcrBatchSummary.partiallyIdentified}</strong></span>
              <span>Failed: <strong className="text-rose-800 font-semibold">{lastOcrBatchSummary.failed}</strong></span>
            </div>
          )}

          <Table<SalarySlip>
            columns={columns}
            data={filteredSlips}
            keyExtractor={(item) => item.id}
            onRowClick={(item) => setSelectedSlip(item)}
            emptyMessage="No salary slips match your search."
          />
        </Card>
      )}

      {/* Salary Slip Detail Drawer */}
      <SalarySlipDrawer
        slip={selectedSlip}
        isExtracting={isExtracting}
        isOcrProcessing={isOcrProcessing}
        onClose={() => setSelectedSlip(null)}
        onExtractText={(id) => extractSlip(id)}
        onRunOcr={(id) => runOcr(id)}
        onRemoveRecord={(id) => {
          removeSlipRecord(id);
          setToastMessage('Salary slip database record removed.');
        }}
      />

      {/* Toast Alert */}
      {toastMessage && (
        <Toast type="info" message={toastMessage} onClose={() => setToastMessage(null)} />
      )}
    </div>
  );
};
