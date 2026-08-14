import { Employee, CreateEmployeeInput } from '../types/employee';

/**
 * Employee Application Service
 * Provides abstraction for employee repository operations
 */
export const employeeService = {
  async getAllEmployees(): Promise<Employee[]> {
    // Fresh workspace defaults to empty employee list
    return [];
  },

  async importEmployeesFromExcel(_filePath: string): Promise<{ success: boolean; importedCount: number }> {
    // UI foundation placeholder for Phase 1
    return { success: true, importedCount: 0 };
  },

  async addEmployee(input: CreateEmployeeInput): Promise<Employee> {
    const newEmp: Employee = {
      ...input,
      id: `emp-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return newEmp;
  },
};
