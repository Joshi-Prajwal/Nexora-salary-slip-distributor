use crate::models::Employee;

pub struct EmployeeService;

impl EmployeeService {
    pub fn new() -> Self {
        Self
    }

    pub fn get_all_employees(&self) -> Vec<Employee> {
        vec![]
    }
}
