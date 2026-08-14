use rusqlite::{Connection, Result};
use std::sync::{Arc, Mutex};
use std::path::Path;
use std::fs;

pub struct DbState {
    pub conn: Arc<Mutex<Connection>>,
}

impl DbState {
    pub fn new(db_path: &str) -> Result<Self, String> {
        if let Some(parent) = Path::new(db_path).parent() {
            let _ = fs::create_dir_all(parent);
        }

        let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
        
        // Execute initial schema migration
        conn.execute_batch(
            r#"
            CREATE TABLE IF NOT EXISTS employees (
                id TEXT PRIMARY KEY,
                employee_id TEXT NOT NULL UNIQUE,
                name TEXT NOT NULL,
                phone TEXT,
                whatsapp_number TEXT,
                email TEXT,
                department TEXT,
                designation TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_employees_emp_id ON employees(employee_id);
            CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);
            "#
        ).map_err(|e| e.to_string())?;

        Ok(Self {
            conn: Arc::new(Mutex::new(conn)),
        })
    }
}
