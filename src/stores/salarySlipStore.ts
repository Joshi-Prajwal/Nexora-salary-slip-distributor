import { create } from 'zustand';
import { SalarySlip, ScanSummary } from '../types/salarySlip';
import { salarySlipService } from '../services/salarySlipService';

interface SalarySlipState {
  slips: SalarySlip[];
  scannedFolderPath: string | null;
  isScanning: boolean;
  lastScanSummary: ScanSummary | null;
  selectedSlip: SalarySlip | null;
  scanFolder: (path: string) => Promise<ScanSummary | null>;
  fetchSalarySlips: () => Promise<void>;
  removeSlipRecord: (id: string) => Promise<void>;
  setSelectedSlip: (slip: SalarySlip | null) => void;
}

export const useSalarySlipStore = create<SalarySlipState>((set, get) => ({
  slips: [],
  scannedFolderPath: null,
  isScanning: false,
  lastScanSummary: null,
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
  removeSlipRecord: async (id: string) => {
    await salarySlipService.removeRecord(id);
    await get().fetchSalarySlips();
    if (get().selectedSlip?.id === id) {
      set({ selectedSlip: null });
    }
  },
  setSelectedSlip: (selectedSlip) => set({ selectedSlip }),
}));
