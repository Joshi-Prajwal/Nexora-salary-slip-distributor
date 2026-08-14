import { SalarySlip } from '../types/salarySlip';

/**
 * Salary Slip Processing Service
 * Provides abstraction for PDF directory scanning & metadata extraction
 */
export const salarySlipService = {
  async scanFolder(_folderPath: string): Promise<SalarySlip[]> {
    // Fresh workspace defaults to empty scanned slips list
    return [];
  },

  async getSalarySlips(): Promise<SalarySlip[]> {
    return [];
  },
};
