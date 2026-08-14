import { create } from 'zustand';
import { SalarySlip, ScanSummary, ExtractionSummary } from '../types/salarySlip';
import { salarySlipService } from '../services/salarySlipService';

interface SalarySlipState {
  slips: SalarySlip[];
  scannedFolderPath: string | null;
  isScanning: boolean;
  isExtracting: boolean;
  lastScanSummary: ScanSummary | null;
  lastExtractionSummary: ExtractionSummary | null;
  selectedSlip: SalarySlip | null;
  scanFolder: (path: string) => Promise<ScanSummary | null>;
  fetchSalarySlips: () => Promise<void>;
  extractSlip: (id: string) => Promise<SalarySlip | null>;
  extractAll: () => Promise<ExtractionSummary | null>;
  removeSlipRecord: (id: string) => Promise<void>;
  setSelectedSlip: (slip: SalarySlip | null) => void;
}

export const useSalarySlipStore = create<SalarySlipState>((set, get) => ({
  slips: [],
  scannedFolderPath: null,
  isScanning: false,
  isExtracting: false,
  lastScanSummary: null,
  lastExtractionSummary: null,
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
    set({ isScanning: true, scannedFolderPath: path });
    try {
      const summary = await salarySlipService.scanFolder(path);
      set({
        slips: summary.slips,
        lastScanSummary: summary,
        isScanning: false,
      });
      return summary;
    } catch (err) {
      set({ isScanning: false });
      throw err;
    }
  },
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
  removeSlipRecord: async (id: string) => {
    await salarySlipService.removeRecord(id);
    await get().fetchSalarySlips();
    if (get().selectedSlip?.id === id) {
      set({ selectedSlip: null });
    }
  },
  setSelectedSlip: (selectedSlip) => set({ selectedSlip }),
}));
