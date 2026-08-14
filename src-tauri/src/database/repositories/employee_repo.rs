use crate::models::Employee;

pub struct EmployeeRepository;

impl EmployeeRepository {
    pub fn new() -> Self {
        Self
    }

    pub fn find_all(&self) -> Vec<Employee> {
        vec![]
    }
}
