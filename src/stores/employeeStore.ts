import { create } from 'zustand';
import { Employee } from '../types/employee';
import { employeeService } from '../services/employeeService';

interface EmployeeState {
  employees: Employee[];
  isLoading: boolean;
  searchQuery: string;
  fetchEmployees: () => Promise<void>;
  setSearchQuery: (query: string) => void;
}

export const useEmployeeStore = create<EmployeeState>((set) => ({
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
  setSearchQuery: (searchQuery) => set({ searchQuery }),
}));
