import { Employee, CreateEmployeeInput } from '../types/employee';

const LOCAL_STORAGE_KEY = 'nexora_employees_db';
let memoryEmployeesStore: Employee[] = [];

/**
 * Helper to safely invoke Tauri Rust backend commands if running in desktop app
 */
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
 * Employee Application Service
 * Manages local employee records and persistence via Tauri + SQLite (falling back to web/memory storage for test runners)
 */
export const employeeService = {
  async getAllEmployees(): Promise<Employee[]> {
    // 1. Attempt SQLite retrieval via Tauri command
    const tauriResult = await tryTauriInvoke<Employee[]>('get_employees');
    if (tauriResult !== null) {
      return tauriResult;
    }

    // 2. Web / Vitest fallback
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = window.localStorage.getItem(LOCAL_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          return Array.isArray(parsed) ? parsed : [];
        }
      }
      return [...memoryEmployeesStore];
    } catch {
      return [...memoryEmployeesStore];
    }
  },

  async importEmployeesFromExcel(inputs: CreateEmployeeInput[]): Promise<{ success: boolean; importedCount: number }> {
    // 1. Attempt SQLite transaction insertion via Tauri command
    const tauriResult = await tryTauriInvoke<number>('import_employees', { employees: inputs });
    if (tauriResult !== null) {
      return {
        success: true,
        importedCount: tauriResult,
      };
    }

    // 2. Web / Vitest fallback
    const existing = await this.getAllEmployees();
    const existingIds = new Set(existing.map((e) => e.employeeId.toLowerCase()));

    const newEmployees: Employee[] = [];
    const now = new Date().toISOString();

    for (const input of inputs) {
      if (!existingIds.has(input.employeeId.toLowerCase())) {
        existingIds.add(input.employeeId.toLowerCase());
        newEmployees.push({
          ...input,
          id: `emp-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    const updatedList = [...existing, ...newEmployees];
    memoryEmployeesStore = updatedList;

    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedList));
    }

    return {
      success: true,
      importedCount: newEmployees.length,
    };
  },

  async clearAllEmployees(): Promise<void> {
    memoryEmployeesStore = [];
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
  },
};
