use rusqlite::{params, Connection, Result};
use crate::models::{Employee, CreateEmployeeInput};

pub struct EmployeeRepository;

impl EmployeeRepository {
    pub fn new() -> Self {
        Self
    }

    pub fn find_all(&self, conn: &Connection) -> Result<Vec<Employee>, String> {
        let mut stmt = conn
            .prepare(
                "SELECT id, employee_id, name, phone, whatsapp_number, email, department, designation, created_at, updated_at FROM employees ORDER BY created_at ASC",
            )
            .map_err(|e| e.to_string())?;

        let employee_iter = stmt
            .query_map([], |row| {
                Ok(Employee {
                    id: row.get(0)?,
                    employee_id: row.get(1)?,
                    name: row.get(2)?,
                    phone: row.get(3)?,
                    whatsapp_number: row.get(4)?,
                    email: row.get(5)?,
                    department: row.get(6)?,
                    designation: row.get(7)?,
                    created_at: row.get(8)?,
                    updated_at: row.get(9)?,
                })
            })
            .map_err(|e| e.to_string())?;

        let mut employees = Vec::new();
        for emp in employee_iter {
            if let Ok(e) = emp {
                employees.push(e);
            }
        }

        Ok(employees)
    }

    pub fn find_by_id(&self, conn: &Connection, id: &str) -> Result<Option<Employee>, String> {
        let mut stmt = conn
            .prepare(
                "SELECT id, employee_id, name, phone, whatsapp_number, email, department, designation, created_at, updated_at FROM employees WHERE id = ?1 OR employee_id = ?1",
            )
            .map_err(|e| e.to_string())?;

        let mut rows = stmt
            .query_map(params![id], |row| {
                Ok(Employee {
                    id: row.get(0)?,
                    employee_id: row.get(1)?,
                    name: row.get(2)?,
                    phone: row.get(3)?,
                    whatsapp_number: row.get(4)?,
                    email: row.get(5)?,
                    department: row.get(6)?,
                    designation: row.get(7)?,
                    created_at: row.get(8)?,
                    updated_at: row.get(9)?,
                })
            })
            .map_err(|e| e.to_string())?;

        if let Some(row) = rows.next() {
            row.map(Some).map_err(|e| e.to_string())
        } else {
            Ok(None)
        }
    }

    pub fn bulk_insert(
        &self,
        conn: &mut Connection,
        inputs: Vec<CreateEmployeeInput>,
    ) -> Result<usize, String> {
        let tx = conn.transaction().map_err(|e| e.to_string())?;
        let mut count = 0;
        let now = chrono_lite_timestamp();

        {
            let mut stmt = tx
                .prepare(
                    r#"
                    INSERT INTO employees (
                        id, employee_id, name, phone, whatsapp_number, email, department, designation, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(employee_id) DO UPDATE SET
                        name = CASE WHEN excluded.name IS NOT NULL AND excluded.name != '' THEN excluded.name ELSE employees.name END,
                        phone = CASE WHEN excluded.phone IS NOT NULL AND excluded.phone != '' THEN excluded.phone ELSE employees.phone END,
                        whatsapp_number = CASE WHEN excluded.whatsapp_number IS NOT NULL AND excluded.whatsapp_number != '' THEN excluded.whatsapp_number ELSE employees.whatsapp_number END,
                        email = CASE WHEN excluded.email IS NOT NULL AND excluded.email != '' THEN excluded.email ELSE employees.email END,
                        department = CASE WHEN excluded.department IS NOT NULL AND excluded.department != '' THEN excluded.department ELSE employees.department END,
                        designation = CASE WHEN excluded.designation IS NOT NULL AND excluded.designation != '' THEN excluded.designation ELSE employees.designation END,
                        updated_at = excluded.updated_at
                    "#,
                )
                .map_err(|e| e.to_string())?;

            for input in inputs {
                let id = format!("emp-{}", uuid_simple());
                let res = stmt
                    .execute(params![
                        id,
                        input.employee_id,
                        input.name,
                        input.phone,
                        input.whatsapp_number,
                        input.email,
                        input.department,
                        input.designation,
                        now,
                        now
                    ])
                    .map_err(|e| e.to_string())?;

                if res > 0 {
                    count += 1;
                }
            }
        }

        tx.commit().map_err(|e| e.to_string())?;
        Ok(count)
    }

    pub fn replace_all(
        &self,
        conn: &mut Connection,
        inputs: Vec<CreateEmployeeInput>,
    ) -> Result<usize, String> {
        let tx = conn.transaction().map_err(|e| e.to_string())?;
        let mut count = 0;
        let now = chrono_lite_timestamp();

        tx.execute("DELETE FROM employees", []).map_err(|e| e.to_string())?;

        {
            let mut stmt = tx
                .prepare(
                    r#"
                    INSERT INTO employees (
                        id, employee_id, name, phone, whatsapp_number, email, department, designation, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    "#,
                )
                .map_err(|e| e.to_string())?;

            for input in inputs {
                let id = format!("emp-{}", uuid_simple());
                let res = stmt
                    .execute(params![
                        id,
                        input.employee_id,
                        input.name,
                        input.phone,
                        input.whatsapp_number,
                        input.email,
                        input.department,
                        input.designation,
                        now,
                        now
                    ])
                    .map_err(|e| e.to_string())?;

                if res > 0 {
                    count += 1;
                }
            }
        }

        tx.commit().map_err(|e| e.to_string())?;
        Ok(count)
    }
}

fn chrono_lite_timestamp() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let start = SystemTime::now();
    let since_the_epoch = start.duration_since(UNIX_EPOCH).unwrap_or_default();
    format!("{}", since_the_epoch.as_secs())
}

fn uuid_simple() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    format!("{:x}", nanos)
}

#[cfg(test)]
pub mod tests {
    use super::*;
    use crate::database::connection::DbState;

    #[test]
    fn test_employee_repository_upsert() {
        let mut conn = Connection::open_in_memory().unwrap();
        DbState::migrate(&conn).unwrap();

        let repo = EmployeeRepository::new();
        let inputs = vec![CreateEmployeeInput {
            employee_id: "EMP100".to_string(),
            name: "John Doe".to_string(),
            email: Some("john@example.com".to_string()),
            phone: Some("9876543210".to_string()),
            whatsapp_number: None,
            department: Some("Engineering".to_string()),
            designation: Some("Developer".to_string()),
        }];

        let inserted = repo.bulk_insert(&mut conn, inputs).unwrap();
        assert_eq!(inserted, 1);

        let emp = repo.find_by_id(&conn, "EMP100").unwrap().unwrap();
        assert_eq!(emp.phone, Some("9876543210".to_string()));

        let update_inputs = vec![CreateEmployeeInput {
            employee_id: "EMP100".to_string(),
            name: "John Doe".to_string(),
            email: Some("john@example.com".to_string()),
            phone: Some("9998887770".to_string()),
            whatsapp_number: None,
            department: Some("Engineering".to_string()),
            designation: Some("Lead Developer".to_string()),
        }];

        let updated_count = repo.bulk_insert(&mut conn, update_inputs).unwrap();
        assert_eq!(updated_count, 1);

        let all = repo.find_all(&conn).unwrap();
        assert_eq!(all.len(), 1);

        let updated_emp = repo.find_by_id(&conn, "EMP100").unwrap().unwrap();
        assert_eq!(updated_emp.phone, Some("9998887770".to_string()));
        assert_eq!(updated_emp.designation, Some("Lead Developer".to_string()));
    }

    #[test]
    fn test_employee_repository_replace_all() {
        let mut conn = Connection::open_in_memory().unwrap();
        DbState::migrate(&conn).unwrap();

        let repo = EmployeeRepository::new();
        let initial = vec![
            CreateEmployeeInput {
                employee_id: "EMP001".to_string(),
                name: "Alice".to_string(),
                email: Some("alice@test.com".to_string()),
                phone: Some("1111111111".to_string()),
                whatsapp_number: None,
                department: None,
                designation: None,
            },
            CreateEmployeeInput {
                employee_id: "EMP002".to_string(),
                name: "Bob".to_string(),
                email: Some("bob@test.com".to_string()),
                phone: Some("2222222222".to_string()),
                whatsapp_number: None,
                department: None,
                designation: None,
            },
        ];

        repo.bulk_insert(&mut conn, initial).unwrap();
        assert_eq!(repo.find_all(&conn).unwrap().len(), 2);

        let replacement = vec![CreateEmployeeInput {
            employee_id: "EMP003".to_string(),
            name: "Charlie".to_string(),
            email: Some("charlie@test.com".to_string()),
            phone: Some("3333333333".to_string()),
            whatsapp_number: None,
            department: None,
            designation: None,
        }];

        let replaced = repo.replace_all(&mut conn, replacement).unwrap();
        assert_eq!(replaced, 1);

        let current = repo.find_all(&conn).unwrap();
        assert_eq!(current.len(), 1);
        assert_eq!(current[0].employee_id, "EMP003");
        assert_eq!(current[0].name, "Charlie");
    }
}
