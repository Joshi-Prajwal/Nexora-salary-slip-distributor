import { SalarySlip, ScanSummary, ExtractionSummary, OcrBatchSummary } from '../types/salarySlip';

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
 * Manages PDF directory scanning, SHA-256 metadata hashing, embedded text extraction, OCR fallback, matching, and SQLite record persistence
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

  async runOcrFallback(id: string): Promise<SalarySlip | null> {
    const tauriResult = await tryTauriInvoke<SalarySlip>('run_ocr_fallback', { id });
    if (tauriResult !== null) {
      return tauriResult;
    }

    const index = memorySalarySlipsStore.findIndex((s) => s.id === id);
    if (index !== -1) {
      const slip = memorySalarySlipsStore[index];
      const hasPartials = !!(slip.detectedName || slip.detectedEmail || slip.detectedPhone);
      const updated: SalarySlip = {
        ...slip,
        extractionMethod: 'OCR',
        ocrConfidence: 90.0,
        ocrProcessedAt: `${Date.now()}`,
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

  async runBatchOcrFallback(): Promise<OcrBatchSummary> {
    const tauriResult = await tryTauriInvoke<OcrBatchSummary>('run_batch_ocr_fallback');
    if (tauriResult !== null) {
      return tauriResult;
    }

    const slips = [...memorySalarySlipsStore];
    for (let i = 0; i < slips.length; i++) {
      if (slips[i].matchStatus === 'TEXT_EXTRACTION_FAILED' || slips[i].matchStatus === 'NOT_IDENTIFIED') {
        const hasPartials = !!(slips[i].detectedName || slips[i].detectedEmail || slips[i].detectedPhone);
        slips[i] = {
          ...slips[i],
          extractionMethod: 'OCR',
          ocrConfidence: 90.0,
          ocrProcessedAt: `${Date.now()}`,
          matchStatus:
            slips[i].matchStatus === 'DUPLICATE_CONTENT'
              ? 'DUPLICATE_CONTENT'
              : slips[i].detectedEmployeeId
              ? 'IDENTIFIED'
              : hasPartials
              ? 'PARTIALLY_IDENTIFIED'
              : 'NOT_IDENTIFIED',
        };
      }
    }
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

  async confirmMatch(slipId: string, employeeId: string, note?: string): Promise<SalarySlip | null> {
    const tauriResult = await tryTauriInvoke<SalarySlip>('confirm_salary_slip_match', {
      slipId,
      employeeId,
      note,
    });
    if (tauriResult !== null) {
      return tauriResult;
    }

    const index = memorySalarySlipsStore.findIndex((s) => s.id === slipId);
    if (index !== -1) {
      const updated: SalarySlip = {
        ...memorySalarySlipsStore[index],
        matchedEmployeeId: employeeId,
        matchStatus: 'MANUALLY_CONFIRMED',
        matchConfidence: 1.0,
        reviewedAt: `${Date.now()}`,
        reviewNote: note,
      };
      memorySalarySlipsStore[index] = updated;
      return updated;
    }
    return null;
  },

  async rejectMatch(slipId: string, note?: string): Promise<SalarySlip | null> {
    const tauriResult = await tryTauriInvoke<SalarySlip>('reject_salary_slip_match', {
      slipId,
      note,
    });
    if (tauriResult !== null) {
      return tauriResult;
    }

    const index = memorySalarySlipsStore.findIndex((s) => s.id === slipId);
    if (index !== -1) {
      const updated: SalarySlip = {
        ...memorySalarySlipsStore[index],
        matchedEmployeeId: undefined,
        matchStatus: 'MANUALLY_REJECTED',
        matchConfidence: 0.0,
        reviewedAt: `${Date.now()}`,
        reviewNote: note,
      };
      memorySalarySlipsStore[index] = updated;
      return updated;
    }
    return null;
  },

  async resetMatch(slipId: string): Promise<SalarySlip | null> {
    const tauriResult = await tryTauriInvoke<SalarySlip>('reset_salary_slip_match', {
      slipId,
    });
    if (tauriResult !== null) {
      return tauriResult;
    }

    const index = memorySalarySlipsStore.findIndex((s) => s.id === slipId);
    if (index !== -1) {
      const updated: SalarySlip = {
        ...memorySalarySlipsStore[index],
        matchedEmployeeId: undefined,
        matchStatus: 'UNMATCHED',
        matchConfidence: 0.0,
      };
      memorySalarySlipsStore[index] = updated;
      return updated;
    }
    return null;
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
