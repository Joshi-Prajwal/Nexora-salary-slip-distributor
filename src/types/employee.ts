export interface Employee {
  id: string;
  employeeId: string;
  name: string;
  phone: string;
  whatsappNumber: string;
  email: string;
  department: string;
  designation: string;
  createdAt: string;
  updatedAt: string;
}

export type CreateEmployeeInput = Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>;
