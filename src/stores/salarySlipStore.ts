import { create } from 'zustand';
import { SalarySlip } from '../types/salarySlip';
import { salarySlipService } from '../services/salarySlipService';

interface SalarySlipState {
  slips: SalarySlip[];
  scannedFolderPath: string | null;
  isScanning: boolean;
  scanFolder: (path: string) => Promise<void>;
}

export const useSalarySlipStore = create<SalarySlipState>((set) => ({
  slips: [],
  scannedFolderPath: null,
  isScanning: false,
  scanFolder: async (path: string) => {
    set({ isScanning: true, scannedFolderPath: path });
    try {
      const slips = await salarySlipService.scanFolder(path);
      set({ slips, isScanning: false });
    } catch {
      set({ isScanning: false });
    }
  },
}));
