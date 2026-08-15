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

    pub fn replace_all_employees(
        &self,
        conn: &mut Connection,
        inputs: Vec<CreateEmployeeInput>,
    ) -> Result<usize, String> {
        self.repo.replace_all(conn, inputs)
    }
}

#[cfg(test)]
pub mod tests {
    use super::*;
    use crate::database::connection::DbState;

    #[test]
    fn test_employee_service_import_and_replace() {
        let mut conn = Connection::open_in_memory().unwrap();
        DbState::migrate(&conn).unwrap();

        let service = EmployeeService::new();
        let inputs = vec![CreateEmployeeInput {
            employee_id: "EMP101".to_string(),
            name: "Service User".to_string(),
            email: Some("service@test.com".to_string()),
            phone: Some("9876543210".to_string()),
            whatsapp_number: None,
            department: None,
            designation: None,
        }];

        let count = service.import_employees(&mut conn, inputs).unwrap();
        assert_eq!(count, 1);

        let emps = service.get_all_employees(&conn).unwrap();
        assert_eq!(emps.len(), 1);
    }
}
