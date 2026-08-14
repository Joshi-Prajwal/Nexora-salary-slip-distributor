use rusqlite::Connection;
use crate::models::{Employee, CreateEmployeeInput};
use crate::database::repositories::EmployeeRepository;

pub struct EmployeeService {
    repo: EmployeeRepository,
}

impl EmployeeService {
    pub fn new() -> Self {
        Self {
            repo: EmployeeRepository::new(),
        }
    }

    pub fn get_all_employees(&self, conn: &Connection) -> Result<Vec<Employee>, String> {
        self.repo.find_all(conn)
    }

    pub fn import_employees(
        &self,
        conn: &mut Connection,
        inputs: Vec<CreateEmployeeInput>,
    ) -> Result<usize, String> {
        self.repo.bulk_insert(conn, inputs)
    }
}
