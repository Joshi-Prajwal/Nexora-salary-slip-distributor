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
                    INSERT OR IGNORE INTO employees (
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
