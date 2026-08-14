import { SalarySlip, ScanSummary, ExtractionSummary } from '../types/salarySlip';

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
 * Manages PDF directory scanning, SHA-256 metadata hashing, embedded text extraction, and SQLite record persistence
 */
export const salarySlipService = {
  async scanFolder(folderPath: string): Promise<ScanSummary> {
    const tauriResult = await tryTauriInvoke<ScanSummary>('scan_salary_slips', { folderPath });
    if (tauriResult !== null) {
      return tauriResult;
    }

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

  async extractSalarySlipText(id: string): Promise<SalarySlip | null> {
    const tauriResult = await tryTauriInvoke<SalarySlip>('extract_salary_slip_text', { id });
    if (tauriResult !== null) {
      return tauriResult;
    }

    // Web / Vitest fallback logic for testing
    const index = memorySalarySlipsStore.findIndex((s) => s.id === id);
    if (index !== -1) {
      const slip = memorySalarySlipsStore[index];
      const hasPartials = !!(slip.detectedName || slip.detectedEmail || slip.detectedPhone);
      const updated: SalarySlip = {
        ...slip,
        extractionMethod: 'TEXT_EMBEDDED',
        matchStatus:
          slip.matchStatus === 'DUPLICATE_CONTENT'
            ? 'DUPLICATE_CONTENT'
            : slip.detectedEmployeeId
            ? 'IDENTIFIED'
            : hasPartials
            ? 'PARTIALLY_IDENTIFIED'
            : 'NOT_IDENTIFIED',
      };
      memorySalarySlipsStore[index] = updated;
      return updated;
    }
    return null;
  },

  async extractAllSalarySlips(): Promise<ExtractionSummary> {
    const tauriResult = await tryTauriInvoke<ExtractionSummary>('extract_all_salary_slips');
    if (tauriResult !== null) {
      return tauriResult;
    }

    // Web / Vitest fallback
    const slips = [...memorySalarySlipsStore];
    return {
      total: slips.length,
      processed: slips.length,
      identified: slips.filter((s) => s.matchStatus === 'IDENTIFIED').length,
      partiallyIdentified: slips.filter((s) => s.matchStatus === 'PARTIALLY_IDENTIFIED').length,
      notIdentified: slips.filter((s) => s.matchStatus === 'NOT_IDENTIFIED' || s.matchStatus === 'UNMATCHED').length,
      failed: slips.filter((s) => s.matchStatus === 'TEXT_EXTRACTION_FAILED').length,
      skipped: 0,
      slips,
    };
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
