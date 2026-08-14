import { SalarySlip, ScanSummary } from '../types/salarySlip';

let memorySalarySlipsStore: SalarySlip[] = [];

async function tryTauriInvoke<T>(cmd: string, args?: Record<string, any>): Promise<T | null> {
  if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<T>(cmd, args);
    } catch (_err) {
      return null;
    }
  }
  return null;
}

/**
 * Salary Slip Application Service
 * Manages PDF directory scanning, SHA-256 metadata hashing, and SQLite record persistence
 */
export const salarySlipService = {
  async scanFolder(folderPath: string): Promise<ScanSummary> {
    // 1. Attempt Tauri invoke
    const tauriResult = await tryTauriInvoke<ScanSummary>('scan_salary_slips', { folderPath });
    if (tauriResult !== null) {
      return tauriResult;
    }

    // 2. Web / Test Fallback
    const slips = [...memorySalarySlipsStore];
    return {
      totalScanned: slips.length,
      pdfCount: slips.length,
      newCount: 0,
      updatedCount: 0,
      unchangedCount: slips.length,
      duplicateCount: 0,
      folderPath,
      slips,
    };
  },

  async getSalarySlips(): Promise<SalarySlip[]> {
    const tauriResult = await tryTauriInvoke<SalarySlip[]>('get_salary_slips');
    if (tauriResult !== null) {
      return tauriResult;
    }
    return [...memorySalarySlipsStore];
  },

  async removeRecord(id: string): Promise<boolean> {
    const tauriResult = await tryTauriInvoke<boolean>('remove_salary_slip_record', { id });
    if (tauriResult !== null) {
      return tauriResult;
    }

    memorySalarySlipsStore = memorySalarySlipsStore.filter((s) => s.id !== id);
    return true;
  },

  async setMemoryStoreForTesting(slips: SalarySlip[]): Promise<void> {
    memorySalarySlipsStore = slips;
  },
};
