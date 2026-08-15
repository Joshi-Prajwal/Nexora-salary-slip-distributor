import React, { useEffect, useState, useRef, useMemo } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';
import { Table, Column } from '../../components/common/Table';
import { Button } from '../../components/common/Button';
import { SearchInput } from '../../components/common/SearchInput';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { Toast } from '../../components/common/Toast';
import { StatusBadge } from '../../components/feedback/StatusBadge';
import { TextHighlight } from '../../components/common/TextHighlight';
import { SalarySlipDrawer } from '../../features/salary-slips/SalarySlipDrawer';
import { useSalarySlipStore } from '../../stores/salarySlipStore';
import { SalarySlip } from '../../types/salarySlip';
import { matchesSlipQuery } from '../../utils/searchUtils';
import {
  FolderOpen,
  Eye,
  Trash2,
  Cpu,
  FileSearch,
  RefreshCw,
  Calendar,
  UploadCloud,
  FilePlus,
  Terminal,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  CheckSquare,
  AlertTriangle,
} from 'lucide-react';

export const SalarySlipsPage: React.FC = () => {
  const {
    slips,
    scannedFolderPath,
    isScanning,
    isExtracting,
    isOcrProcessing,
    isDragging,
    lastScanSummary,
    diagnosticsData,
    selectedSlip,
    fetchSalarySlips,
    ingestPaths,
    setIsDragging,
    extractSlip,
    extractAll,
    runOcr,
    runBatchOcr,
    runForceBatchOcr,
    removeSlipRecord,
    removeRecordsBatch,
    clearActiveScanFolder,
    setSelectedSlip,
  } = useSalarySlipStore();

  const [search, setSearch] = useState('');
  const [selectedMonthFilter, setSelectedMonthFilter] = useState('ALL');
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [isRemoveSelectedModalOpen, setIsRemoveSelectedModalOpen] = useState(false);
  const [isRemoveAllModalOpen, setIsRemoveAllModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [copiedDiag, setCopiedDiag] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSalarySlips();
  }, [fetchSalarySlips]);

  // Native Tauri Window Drag-and-Drop Event Listener
  useEffect(() => {
    let unlisten: (() => void) | null = null;
    const setupDragDrop = async () => {
      if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
        try {
          const { getCurrentWindow } = await import('@tauri-apps/api/window');
          const win = getCurrentWindow();
          unlisten = await win.onDragDropEvent(async (event: any) => {
            if (event.payload.type === 'over') {
              setIsDragging(true);
            } else if (event.payload.type === 'leave' || event.payload.type === 'cancel') {
              setIsDragging(false);
            } else if (event.payload.type === 'drop') {
              setIsDragging(false);
              const paths: string[] = event.payload.paths || [];
              if (paths.length > 0) {
                try {
                  const summary = await ingestPaths(paths);
                  if (summary) {
                    setToastMessage(`Imported ${summary.pdfCount} salary-slip PDFs from drop.`);
                  }
                } catch (err: any) {
                  setToastMessage(`Failed to import dropped items: ${err.message || err}`);
                }
              }
            }
          });
        } catch (_err) {
          // Fallback if window events fail
        }
      }
    };
    setupDragDrop();
    return () => {
      if (unlisten) unlisten();
    };
  }, [ingestPaths, setIsDragging]);

  const handleSelectFolder = async () => {
    if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
      try {
        const { open } = await import('@tauri-apps/plugin-dialog');
        const selected = await open({
          directory: true,
          multiple: false,
          title: 'Select Salary Slips Folder',
        });
        if (selected && typeof selected === 'string') {
          const summary = await ingestPaths([selected]);
          if (summary) {
            setToastMessage(`Folder scan complete: ${summary.pdfCount} PDFs discovered.`);
          }
        }
      } catch (err: any) {
        setToastMessage(`Folder selection error: ${err.message || err}`);
      }
    } else if (folderInputRef.current) {
      folderInputRef.current.click();
    }
  };

  const handleSelectFiles = async () => {
    if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
      try {
        const { open } = await import('@tauri-apps/plugin-dialog');
        const selected = await open({
          directory: false,
          multiple: true,
          title: 'Select Salary Slip PDF Files',
          filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
        });
        if (selected) {
          const paths = Array.isArray(selected) ? selected : [selected];
          if (paths.length > 0) {
            const summary = await ingestPaths(paths);
            if (summary) {
              setToastMessage(`Ingested ${summary.pdfCount} salary slip files.`);
            }
          }
        }
      } catch (err: any) {
        setToastMessage(`File selection error: ${err.message || err}`);
      }
    } else if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleHTMLFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const paths: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const f = files[i] as any;
        if (f.path) paths.push(f.path);
        else paths.push(f.name);
      }
      if (paths.length > 0) {
        try {
          const summary = await ingestPaths(paths);
          if (summary) {
            setToastMessage(`Ingested ${summary.pdfCount} files.`);
          }
        } catch (err: any) {
          setToastMessage(`Ingestion failed: ${err.message || err}`);
        }
      }
    }
  };

  const handleRescanFolder = async () => {
    if (!scannedFolderPath) return;
    try {
      const summary = await ingestPaths([scannedFolderPath]);
      if (summary) {
        setToastMessage(`Rescanned folder: ${summary.pdfCount} PDFs discovered.`);
      }
    } catch (err: any) {
      setToastMessage(`Rescan error: ${err.message || err}`);
    }
  };

  const handleExtractAll = async () => {
    try {
      const summary = await extractAll();
      if (summary) {
        setToastMessage(
          `Text extraction complete: ${summary.identified} identified, ${summary.partiallyIdentified} partially identified.`
        );
      }
    } catch (_err) {
      setToastMessage('Text extraction failed.');
    }
  };

  const handleRunBatchOcr = async () => {
    try {
      const summary = await runBatchOcr();
      if (summary) {
        setToastMessage(`Batch OCR complete: ${summary.processed} files processed, ${summary.skipped} skipped.`);
      }
    } catch (_err) {
      setToastMessage('Batch OCR failed.');
    }
  };

  const handleRunForceBatchOcr = async () => {
    try {
      const summary = await runForceBatchOcr();
      if (summary) {
        setToastMessage(`Force OCR complete: ${summary.processed} files re-processed.`);
      }
    } catch (_err) {
      setToastMessage('Force OCR failed.');
    }
  };

  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    slips.forEach((s) => {
      if (s.month && s.year) monthsSet.add(`${s.month} ${s.year}`);
      else if (s.month) monthsSet.add(s.month);
    });
    return Array.from(monthsSet).sort();
  }, [slips]);

  // Canonical Pipeline Summary computed directly from active slips (No counter drift)
  const pipelineSummary = useMemo(() => {
    const total = slips.length;
    let identified = 0;
    let partiallyIdentified = 0;
    let notIdentified = 0;
    let ocrNotRequired = 0;
    let ocrCompleted = 0;
    let ocrFailed = 0;
    let ocrPending = 0;

    slips.forEach((s) => {
      if (s.detectedEmployeeId) {
        identified += 1;
      } else if (s.detectedName || s.detectedEmail || s.detectedPhone) {
        partiallyIdentified += 1;
      } else {
        notIdentified += 1;
      }

      if (s.extractionMethod === 'TEXT_EMBEDDED' || s.ocrStatus === 'NOT_REQUIRED') {
        ocrNotRequired += 1;
      } else if (s.ocrStatus === 'COMPLETED' || s.ocrStatus === 'COMPLETED_WITH_WARNINGS') {
        ocrCompleted += 1;
      } else if (
        s.ocrStatus === 'FAILED' ||
        s.ocrStatus === 'UNAVAILABLE' ||
        s.ocrStatus === 'RENDER_FAILED' ||
        s.ocrStatus === 'ENGINE_ERROR'
      ) {
        ocrFailed += 1;
      } else {
        ocrPending += 1;
      }
    });

    return {
      total,
      identified,
      partiallyIdentified,
      notIdentified,
      ocrNotRequired,
      ocrCompleted,
      ocrFailed,
      ocrPending,
    };
  }, [slips]);

  // Pure Client-side Filter
  const filteredSlips = useMemo(() => {
    return slips.filter((slip) => {
      if (selectedMonthFilter !== 'ALL') {
        const slipPeriod = slip.month && slip.year ? `${slip.month} ${slip.year}` : slip.month || 'Unspecified';
        if (slipPeriod !== selectedMonthFilter) return false;
      }
      if (!search.trim()) return true;
      return matchesSlipQuery(slip, search);
    });
  }, [slips, selectedMonthFilter, search]);

  const isFilterActive = useMemo(() => {
    return search.trim().length > 0 || selectedMonthFilter !== 'ALL';
  }, [search, selectedMonthFilter]);

  // Checkbox Selection Handlers
  const handleSelectKey = (key: string, selected: boolean) => {
    const next = new Set(selectedKeys);
    if (selected) next.add(key);
    else next.delete(key);
    setSelectedKeys(next);
  };

  const handleSelectAllVisible = (selected: boolean) => {
    const next = new Set(selectedKeys);
    const visibleIds = filteredSlips.map((s) => s.id);

    if (selected) {
      visibleIds.forEach((id) => next.add(id));
    } else {
      visibleIds.forEach((id) => next.delete(id));
    }
    setSelectedKeys(next);
  };

  const handleConfirmRemoveSelected = async () => {
    setIsRemoveSelectedModalOpen(false);
    const ids = Array.from(selectedKeys);
    if (ids.length === 0) return;

    try {
      const removedCount = await removeRecordsBatch(ids);
      setToastMessage(`Removed ${removedCount} salary-slip database record(s). Original PDF files were preserved.`);
      setSelectedKeys(new Set());
    } catch (err: any) {
      setToastMessage(`Unable to remove salary slips: ${err.message || err}`);
    }
  };

  const handleConfirmRemoveAll = async () => {
    setIsRemoveAllModalOpen(false);
    const idsToRemove = isFilterActive ? filteredSlips.map((s) => s.id) : slips.map((s) => s.id);
    if (idsToRemove.length === 0) return;

    try {
      const removedCount = await removeRecordsBatch(idsToRemove);
      setToastMessage(`Removed ${removedCount} salary-slip database record(s). Original PDF files were preserved.`);
      setSelectedKeys(new Set());
    } catch (err: any) {
      setToastMessage(`Unable to remove salary slips: ${err.message || err}`);
    }
  };

  const columns: Column<SalarySlip>[] = [
    {
      key: 'fileName',
      header: 'Salary Slip File',
      render: (item) => <TextHighlight text={item.fileName} query={search} className="font-semibold text-slate-900" />,
    },
    {
      key: 'period',
      header: 'Salary Period',
      render: (item) => (
        <span className="text-xs font-semibold text-slate-800">
          {item.month && item.year ? `${item.month} ${item.year}` : item.month || 'Unknown'}
        </span>
      ),
    },
    {
      key: 'detectedInfo',
      header: 'Identified Employee',
      render: (item) => (
        <div>
          {item.detectedEmployeeId || item.detectedName ? (
            <div>
              <span className="font-semibold text-slate-900 block truncate max-w-xs font-mono">
                <TextHighlight text={item.detectedEmployeeId || 'No ID'} query={search} />
              </span>
              <span className="text-xs text-slate-500 block truncate max-w-xs">
                <TextHighlight text={item.detectedName || item.detectedEmail || 'Unidentified'} query={search} />
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
      key: 'ocrStatus',
      header: 'OCR Status',
      render: (item) => (
        <span>
          {item.extractionMethod === 'TEXT_EMBEDDED' || item.ocrStatus === 'NOT_REQUIRED' ? (
            <span className="text-xs text-slate-500 font-medium">Not Required</span>
          ) : item.ocrStatus === 'COMPLETED' ? (
            <span className="text-xs text-emerald-700 font-semibold">Completed ✓</span>
          ) : item.ocrStatus === 'COMPLETED_WITH_WARNINGS' ? (
            <span className="text-xs text-amber-700 font-semibold">Completed (Warnings)</span>
          ) : item.ocrStatus === 'UNAVAILABLE' ? (
            <span className="text-xs text-rose-700 font-semibold" title={item.ocrError || 'Local OCR engine (Tesseract) not installed'}>Engine Unavailable</span>
          ) : item.ocrStatus === 'RENDER_FAILED' ? (
            <span className="text-xs text-rose-700 font-semibold" title={item.ocrError || 'PDF page image render failed'}>Render Failed</span>
          ) : item.ocrStatus === 'FAILED' || item.ocrStatus === 'ENGINE_ERROR' ? (
            <span className="text-xs text-rose-700 font-semibold" title={item.ocrError || 'OCR engine process failed'}>Failed</span>
          ) : item.ocrStatus === 'PENDING' ? (
            <span className="text-xs text-amber-600 font-medium">Pending</span>
          ) : (
            <span className="text-xs text-slate-400">Not Run</span>
          )}
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
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleHTMLFileInput}
        multiple
        accept=".pdf"
        className="hidden"
      />
      <input
        type="file"
        ref={folderInputRef}
        onChange={handleHTMLFileInput}
        {...({ webkitdirectory: '', directory: '' } as any)}
        className="hidden"
      />

      <PageHeader
        title="Salary Slips"
        subtitle="Unified file scanner: Select folders, browse PDF files, or drag & drop files from Windows Explorer."
        action={
          <div className="flex items-center gap-2">
            {scannedFolderPath && (
              <Button
                variant="outline"
                size="sm"
                icon={<RefreshCw className="w-3.5 h-3.5" />}
                isLoading={isScanning}
                onClick={handleRescanFolder}
              >
                Rescan Folder
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              icon={<FolderOpen className="w-3.5 h-3.5" />}
              isLoading={isScanning}
              onClick={handleSelectFolder}
            >
              Select Folder
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={<FilePlus className="w-3.5 h-3.5" />}
              isLoading={isScanning}
              onClick={handleSelectFiles}
            >
              Select PDF Files
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Cpu className="w-3.5 h-3.5" />}
              isLoading={isExtracting}
              disabled={slips.length === 0}
              onClick={handleExtractAll}
            >
              Identify Salary Slips
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={<RefreshCw className="w-3.5 h-3.5" />}
              isLoading={isOcrProcessing}
              disabled={slips.length === 0}
              onClick={handleRunBatchOcr}
            >
              Run OCR
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={<RefreshCw className="w-3.5 h-3.5 text-amber-600" />}
              isLoading={isOcrProcessing}
              disabled={slips.length === 0}
              onClick={handleRunForceBatchOcr}
              title="Force OCR processing on all files regardless of embedded text"
            >
              Force OCR
            </Button>
          </div>
        }
      />

      {/* Scanned Folder Banner */}
      {scannedFolderPath && (
        <div className="p-3.5 bg-sky-50 border border-sky-200 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sky-900 text-xs font-medium">
              <FolderOpen className="w-4 h-4 text-sky-600 shrink-0" />
              <span>
                Active Salary Slips Folder: <strong className="font-mono text-slate-900">{scannedFolderPath}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowDiagnostics(!showDiagnostics)}
                className="text-xs text-sky-700 hover:text-sky-900 font-semibold flex items-center gap-1 bg-sky-100/80 px-2.5 py-1 rounded-md transition-colors"
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>Diagnostics</span>
                {showDiagnostics ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={clearActiveScanFolder}
                className="text-xs text-slate-500 hover:text-slate-700 underline"
              >
                Clear
              </button>
            </div>
          </div>

          {showDiagnostics && (
            <div className="mt-2 p-3 bg-slate-900 text-slate-100 rounded-lg text-xs font-mono space-y-2 border border-slate-700 shadow-inner">
              <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-1.5">
                <span className="font-bold text-sky-400">Folder Ingestion & System Diagnostic Report</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(diagnosticsData || lastScanSummary, null, 2));
                    setCopiedDiag(true);
                    setTimeout(() => setCopiedDiag(false), 2000);
                  }}
                  className="flex items-center gap-1 text-slate-300 hover:text-white"
                >
                  {copiedDiag ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedDiag ? 'Copied' : 'Copy Data'}</span>
                </button>
              </div>

              {diagnosticsData ? (
                <div className="space-y-1 text-[11px] leading-relaxed">
                  <div>
                    <span className="text-slate-400">Path Exists:</span>{' '}
                    <strong className={diagnosticsData.exists ? 'text-emerald-400' : 'text-rose-400'}>
                      {diagnosticsData.exists ? 'YES' : 'NO'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Readable Directory:</span>{' '}
                    <strong className={diagnosticsData.readable ? 'text-emerald-400' : 'text-rose-400'}>
                      {diagnosticsData.readable ? 'YES' : 'NO'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400">PDF Files Found:</span>{' '}
                    <strong className="text-amber-300">{diagnosticsData.pdfCount}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Subdirectories Checked:</span> {diagnosticsData.directoriesScanned}
                  </div>
                  <div>
                    <span className="text-slate-400">Total Files Checked:</span> {diagnosticsData.filesScanned}
                  </div>
                  <div>
                    <span className="text-slate-400">SQLite Database Records:</span> {diagnosticsData.databaseRecords}
                  </div>
                </div>
              ) : (
                <pre className="text-[11px] overflow-x-auto text-slate-300">
                  {JSON.stringify(lastScanSummary, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>
      )}

      {/* Visible Drag-and-Drop Ingestion Zone */}
      <div
        className={`p-8 border-2 border-dashed rounded-2xl transition-all text-center space-y-3 ${
          isDragging
            ? 'border-sky-500 bg-sky-50/80 scale-[1.01] shadow-lg ring-4 ring-sky-200'
            : 'border-slate-200 bg-slate-50/50 hover:border-sky-400 hover:bg-slate-50'
        }`}
      >
        <div className="mx-auto w-12 h-12 rounded-full bg-sky-100 flex items-center justify-center text-sky-600">
          <UploadCloud className="w-6 h-6" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800">
            {isDragging ? 'Drop salary slip files or folders to import' : 'DROP SALARY SLIPS HERE'}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Supports single PDFs, multiple PDFs, or complete folder structures from Windows Explorer.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button variant="outline" size="sm" icon={<FolderOpen className="w-3.5 h-3.5" />} onClick={handleSelectFolder}>
            Select Folder
          </Button>
          <Button variant="outline" size="sm" icon={<FilePlus className="w-3.5 h-3.5" />} onClick={handleSelectFiles}>
            Select PDF Files
          </Button>
        </div>
      </div>

      {slips.length > 0 && (
        <Card noPadding>
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
              {/* Fix UI Bug: Sizing 280-360px desktop (w-72 sm:w-80 md:w-96), unclipped placeholder */}
              <SearchInput
                value={search}
                onSearchChange={setSearch}
                onClear={() => setSearch('')}
                placeholder="Search employee name or ID..."
                containerClassName="w-72 sm:w-80 md:w-96 shrink-0"
              />

              {availableMonths.length > 0 && (
                <div className="flex items-center gap-2 shrink-0">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <select
                    value={selectedMonthFilter}
                    onChange={(e) => setSelectedMonthFilter(e.target.value)}
                    className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="ALL">All Periods ({slips.length})</option>
                    {availableMonths.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500 font-medium shrink-0">
                {filteredSlips.length} of {slips.length} slips showing
              </span>
              <Button
                variant="ghost"
                size="sm"
                icon={<Trash2 className="w-3.5 h-3.5 text-rose-600" />}
                onClick={() => setIsRemoveAllModalOpen(true)}
                className="text-xs text-rose-600 hover:bg-rose-50"
              >
                {isFilterActive ? `Remove All ${filteredSlips.length} Filtered` : `Remove All (${slips.length})`}
              </Button>
            </div>
          </div>

          {/* Bulk Action Toolbar */}
          {selectedKeys.size > 0 && (
            <div className="px-4 py-3 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 text-xs shadow-inner">
              <div className="flex items-center gap-2 font-semibold">
                <CheckSquare className="w-4 h-4 text-sky-400" />
                <span>{selectedKeys.size} selected</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-slate-300 hover:text-white hover:bg-slate-800"
                  onClick={() => setSelectedKeys(new Set())}
                >
                  Clear Selection
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<Trash2 className="w-3.5 h-3.5 text-rose-400" />}
                  className="text-rose-300 hover:text-rose-100 hover:bg-rose-950/60 font-semibold"
                  onClick={() => setIsRemoveSelectedModalOpen(true)}
                >
                  Remove Selected ({selectedKeys.size})
                </Button>
              </div>
            </div>
          )}

          {/* Canonical Pipeline Summary Bar */}
          <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex flex-wrap items-center gap-3 text-slate-700">
              <span className="font-semibold text-slate-900">Identification:</span>
              <span>Identified: <strong className="text-emerald-700 font-bold">{pipelineSummary.identified}</strong></span>
              <span>Partially Identified: <strong className="text-blue-700 font-semibold">{pipelineSummary.partiallyIdentified}</strong></span>
              <span>Unidentified: <strong className="text-slate-800 font-medium">{pipelineSummary.notIdentified}</strong></span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-slate-700 border-l border-slate-200 pl-4">
              <span className="font-semibold text-slate-900">OCR Status:</span>
              <span>Not Required: <strong className="text-slate-600 font-medium">{pipelineSummary.ocrNotRequired}</strong></span>
              {pipelineSummary.ocrCompleted > 0 && <span>Completed: <strong className="text-emerald-700 font-bold">{pipelineSummary.ocrCompleted}</strong></span>}
              {pipelineSummary.ocrFailed > 0 && <span>Failed/Unavailable: <strong className="text-rose-700 font-bold">{pipelineSummary.ocrFailed}</strong></span>}
              {pipelineSummary.ocrPending > 0 && <span>Pending: <strong className="text-amber-700 font-semibold">{pipelineSummary.ocrPending}</strong></span>}
            </div>
          </div>

          <Table<SalarySlip>
            columns={columns}
            data={filteredSlips}
            keyExtractor={(item) => item.id}
            onRowClick={(item) => setSelectedSlip(item)}
            selectable
            selectedKeys={selectedKeys}
            onSelectKey={handleSelectKey}
            onSelectAll={handleSelectAllVisible}
            emptyMessage="No salary slips match your search query or selected period."
          />
        </Card>
      )}

      {/* Remove Selected Confirmation Modal */}
      {isRemoveSelectedModalOpen && (
        <ConfirmDialog
          isOpen={isRemoveSelectedModalOpen}
          onClose={() => setIsRemoveSelectedModalOpen(false)}
          onConfirm={handleConfirmRemoveSelected}
          title={`Remove ${selectedKeys.size} Salary Slips?`}
          confirmLabel={`Remove ${selectedKeys.size} Slips`}
          message={`These salary-slip records will be removed from Nexora.`}
        >
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2 text-amber-900 text-xs mt-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span className="font-medium">
              The original PDF files on your Windows filesystem will NOT be deleted. Only Nexora's database records will be removed.
            </span>
          </div>
        </ConfirmDialog>
      )}

      {/* Remove All / Remove All Filtered Confirmation Modal */}
      {isRemoveAllModalOpen && (
        <ConfirmDialog
          isOpen={isRemoveAllModalOpen}
          onClose={() => setIsRemoveAllModalOpen(false)}
          onConfirm={handleConfirmRemoveAll}
          title={
            isFilterActive
              ? `Remove All ${filteredSlips.length} Filtered Salary Slips?`
              : `Remove All ${slips.length} Salary Slips?`
          }
          confirmLabel={
            isFilterActive
              ? `Remove All ${filteredSlips.length} Filtered Slips`
              : `Remove All ${slips.length} Slips`
          }
          message={
            isFilterActive
              ? `Only the currently visible/filtered records will be removed from Nexora.`
              : `This will remove all salary-slip records currently stored in Nexora.`
          }
        >
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2 text-amber-900 text-xs mt-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span className="font-medium">
              The original PDF files on your Windows filesystem will NOT be deleted. Only Nexora's database records will be removed.
            </span>
          </div>
        </ConfirmDialog>
      )}

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

      {toastMessage && <Toast type="info" message={toastMessage} onClose={() => setToastMessage(null)} />}
    </div>
  );
};
