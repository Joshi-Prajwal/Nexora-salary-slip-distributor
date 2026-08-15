import { create } from 'zustand';
import { Employee, CreateEmployeeInput } from '../types/employee';
import { employeeService } from '../services/employeeService';

interface EmployeeState {
  employees: Employee[];
  isLoading: boolean;
  searchQuery: string;
  fetchEmployees: () => Promise<void>;
  importEmployees: (inputs: CreateEmployeeInput[]) => Promise<number>;
  replaceAllEmployees: (inputs: CreateEmployeeInput[]) => Promise<number>;
  setSearchQuery: (query: string) => void;
}

export const useEmployeeStore = create<EmployeeState>((set, get) => ({
  employees: [],
  isLoading: false,
  searchQuery: '',
  fetchEmployees: async () => {
    set({ isLoading: true });
    try {
      const employees = await employeeService.getAllEmployees();
      set({ employees, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },
  importEmployees: async (inputs: CreateEmployeeInput[]) => {
    set({ isLoading: true });
    try {
      const result = await employeeService.importEmployeesFromExcel(inputs);
      await get().fetchEmployees();
      return result.importedCount;
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },
  replaceAllEmployees: async (inputs: CreateEmployeeInput[]) => {
    set({ isLoading: true });
    try {
      const result = await employeeService.replaceAllEmployees(inputs);
      await get().fetchEmployees();
      return result.replacedCount;
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },
  setSearchQuery: (searchQuery) => set({ searchQuery }),
}));
