import { Employee, CreateEmployeeInput } from '../types/employee';

const LOCAL_STORAGE_KEY = 'nexora_employees_db';
let memoryEmployeesStore: Employee[] = [];

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

export const employeeService = {
  async getAllEmployees(): Promise<Employee[]> {
    const tauriResult = await tryTauriInvoke<Employee[]>('get_employees');
    if (tauriResult !== null) {
      return tauriResult;
    }

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
    const tauriResult = await tryTauriInvoke<number>('import_employees', { employees: inputs });
    if (tauriResult !== null) {
      return {
        success: true,
        importedCount: tauriResult,
      };
    }

    const existing = await this.getAllEmployees();
    const existingMap = new Map(existing.map((e) => [e.employeeId.toLowerCase(), e]));
    const now = new Date().toISOString();

    const resultList: Employee[] = [...existing];
    let count = 0;

    for (const input of inputs) {
      const key = input.employeeId.toLowerCase();
      const existingEmp = existingMap.get(key);
      if (existingEmp) {
        existingEmp.name = input.name || existingEmp.name;
        existingEmp.phone = input.phone || existingEmp.phone;
        existingEmp.email = input.email || existingEmp.email;
        existingEmp.department = input.department || existingEmp.department;
        existingEmp.designation = input.designation || existingEmp.designation;
        existingEmp.updatedAt = now;
        count++;
      } else {
        const newEmp: Employee = {
          ...input,
          id: `emp-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          createdAt: now,
          updatedAt: now,
        };
        existingMap.set(key, newEmp);
        resultList.push(newEmp);
        count++;
      }
    }

    memoryEmployeesStore = resultList;

    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(resultList));
    }

    return {
      success: true,
      importedCount: count,
    };
  },

  async replaceAllEmployees(inputs: CreateEmployeeInput[]): Promise<{ success: boolean; replacedCount: number }> {
    const tauriResult = await tryTauriInvoke<number>('replace_all_employees', { employees: inputs });
    if (tauriResult !== null) {
      return {
        success: true,
        replacedCount: tauriResult,
      };
    }

    const now = new Date().toISOString();
    const newEmployees: Employee[] = inputs.map((input) => ({
      ...input,
      id: `emp-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      createdAt: now,
      updatedAt: now,
    }));

    memoryEmployeesStore = newEmployees;
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newEmployees));
    }

    return {
      success: true,
      replacedCount: newEmployees.length,
    };
  },

  async clearAllEmployees(): Promise<void> {
    memoryEmployeesStore = [];
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
  },
};
