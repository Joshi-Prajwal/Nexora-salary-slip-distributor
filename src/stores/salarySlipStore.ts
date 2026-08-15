import { create } from 'zustand';
import { SalarySlip, ScanSummary, ExtractionSummary, OcrBatchSummary, FolderScanDiagnostics } from '../types/salarySlip';
import { salarySlipService } from '../services/salarySlipService';

export type IngestState = 'IDLE' | 'SELECTING' | 'SCANNING' | 'READY' | 'EMPTY' | 'ERROR' | 'DRAGGING' | 'IMPORTING';

interface SalarySlipState {
  slips: SalarySlip[];
  scannedFolderPath: string | null;
  ingestState: IngestState;
  isScanning: boolean;
  isExtracting: boolean;
  isOcrProcessing: boolean;
  isDragging: boolean;
  lastScanSummary: ScanSummary | null;
  lastExtractionSummary: ExtractionSummary | null;
  lastOcrBatchSummary: OcrBatchSummary | null;
  diagnosticsData: FolderScanDiagnostics | null;
  selectedSlip: SalarySlip | null;
  scanFolder: (path: string) => Promise<ScanSummary | null>;
  ingestPaths: (paths: string[]) => Promise<ScanSummary | null>;
  diagnoseFolder: (path: string) => Promise<FolderScanDiagnostics | null>;
  setIsDragging: (isDragging: boolean) => void;
  fetchSalarySlips: () => Promise<void>;
  extractSlip: (id: string) => Promise<SalarySlip | null>;
  extractAll: () => Promise<ExtractionSummary | null>;
  runOcr: (id: string) => Promise<SalarySlip | null>;
  runBatchOcr: () => Promise<OcrBatchSummary | null>;
  runForceBatchOcr: () => Promise<OcrBatchSummary | null>;
  removeSlipRecord: (id: string) => Promise<void>;
  removeRecordsBatch: (ids: string[]) => Promise<number>;
  clearActiveScanFolder: () => void;
  setSelectedSlip: (slip: SalarySlip | null) => void;
}

export const useSalarySlipStore = create<SalarySlipState>((set, get) => ({
  slips: [],
  scannedFolderPath: null,
  ingestState: 'IDLE',
  isScanning: false,
  isExtracting: false,
  isOcrProcessing: false,
  isDragging: false,
  lastScanSummary: null,
  lastExtractionSummary: null,
  lastOcrBatchSummary: null,
  diagnosticsData: null,
  selectedSlip: null,

  fetchSalarySlips: async () => {
    try {
      const slips = await salarySlipService.getSalarySlips();
      set({ slips });
    } catch {
      set({ slips: [] });
    }
  },

  scanFolder: async (path: string) => {
    return get().ingestPaths([path]);
  },

  ingestPaths: async (paths: string[]) => {
    const primaryPath = paths[0] || null;
    set({ isScanning: true, ingestState: 'SCANNING', scannedFolderPath: primaryPath });
    try {
      const summary = await salarySlipService.ingestPaths(paths);
      const nextState: IngestState = summary.pdfCount === 0 ? 'EMPTY' : 'READY';
      set({
        slips: summary.slips,
        lastScanSummary: summary,
        isScanning: false,
        ingestState: nextState,
      });

      if (primaryPath) {
        get().diagnoseFolder(primaryPath).catch(() => {});
      }

      return summary;
    } catch (err) {
      set({ isScanning: false, ingestState: 'ERROR' });
      throw err;
    }
  },

  diagnoseFolder: async (path: string) => {
    try {
      const diag = await salarySlipService.diagnoseFolder(path);
      set({ diagnosticsData: diag });
      return diag;
    } catch {
      set({ diagnosticsData: null });
      return null;
    }
  },

  setIsDragging: (isDragging: boolean) => set({ isDragging, ingestState: isDragging ? 'DRAGGING' : get().ingestState }),

  extractSlip: async (id: string) => {
    set({ isExtracting: true });
    try {
      const updated = await salarySlipService.extractSalarySlipText(id);
      await get().fetchSalarySlips();
      if (get().selectedSlip?.id === id && updated) {
        set({ selectedSlip: updated });
      }
      set({ isExtracting: false });
      return updated;
    } catch (err) {
      set({ isExtracting: false });
      throw err;
    }
  },

  extractAll: async () => {
    set({ isExtracting: true });
    try {
      const summary = await salarySlipService.extractAllSalarySlips();
      set({
        slips: summary.slips,
        lastExtractionSummary: summary,
        isExtracting: false,
      });
      return summary;
    } catch (err) {
      set({ isExtracting: false });
      throw err;
    }
  },

  runOcr: async (id: string) => {
    set({ isOcrProcessing: true });
    try {
      const updated = await salarySlipService.runOcrFallback(id);
      await get().fetchSalarySlips();
      if (get().selectedSlip?.id === id && updated) {
        set({ selectedSlip: updated });
      }
      set({ isOcrProcessing: false });
      return updated;
    } catch (err) {
      set({ isOcrProcessing: false });
      throw err;
    }
  },

  runBatchOcr: async () => {
    set({ isOcrProcessing: true });
    try {
      const summary = await salarySlipService.runBatchOcrFallback();
      set({
        slips: summary.slips,
        lastOcrBatchSummary: summary,
        isOcrProcessing: false,
      });
      return summary;
    } catch (err) {
      set({ isOcrProcessing: false });
      throw err;
    }
  },

  runForceBatchOcr: async () => {
    set({ isOcrProcessing: true });
    try {
      const summary = await salarySlipService.runForceOcrBatch();
      set({
        slips: summary.slips,
        lastOcrBatchSummary: summary,
        isOcrProcessing: false,
      });
      return summary;
    } catch (err) {
      set({ isOcrProcessing: false });
      throw err;
    }
  },

  removeSlipRecord: async (id: string) => {
    await salarySlipService.removeRecord(id);
    await get().fetchSalarySlips();
    if (get().selectedSlip?.id === id) {
      set({ selectedSlip: null });
    }
  },

  removeRecordsBatch: async (ids: string[]) => {
    const count = await salarySlipService.removeRecordsBatch(ids);
    await get().fetchSalarySlips();
    if (get().selectedSlip && ids.includes(get().selectedSlip!.id)) {
      set({ selectedSlip: null });
    }
    return count;
  },

  clearActiveScanFolder: () => {
    set({ scannedFolderPath: null, lastScanSummary: null, diagnosticsData: null, ingestState: 'IDLE' });
  },

  setSelectedSlip: (selectedSlip) => set({ selectedSlip }),
}));
