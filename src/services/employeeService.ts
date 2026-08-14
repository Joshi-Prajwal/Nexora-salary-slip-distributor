import { Employee, CreateEmployeeInput } from '../types/employee';

/**
 * Employee Application Service
 * Provides abstraction for employee repository operations
 */
export const employeeService = {
  async getAllEmployees(): Promise<Employee[]> {
    // In Phase 0: Returns mock/placeholder data structure
    return [
      {
        id: 'emp-1',
        employeeId: 'EMP001',
        name: 'John Doe',
        phone: '+1234567890',
        whatsappNumber: '+1234567890',
        email: 'john.doe@example.com',
        department: 'Engineering',
        designation: 'Senior Developer',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'emp-2',
        employeeId: 'EMP002',
        name: 'Jane Smith',
        phone: '+1987654321',
        whatsappNumber: '+1987654321',
        email: 'jane.smith@example.com',
        department: 'Human Resources',
        designation: 'HR Manager',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
  },

  async importEmployeesFromExcel(_filePath: string): Promise<{ success: boolean; importedCount: number }> {
    // Phase 0 placeholder - Excel import logic belongs to Phase 1
    console.log('[Phase 0 Scaffold] Excel import requested for path:', _filePath);
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
