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
        
        // Execute initial schema migrations
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

            CREATE TABLE IF NOT EXISTS salary_slips (
                id TEXT PRIMARY KEY,
                file_path TEXT NOT NULL UNIQUE,
                file_name TEXT NOT NULL,
                file_hash TEXT NOT NULL,
                detected_employee_id TEXT,
                detected_name TEXT,
                detected_phone TEXT,
                detected_email TEXT,
                extraction_method TEXT NOT NULL DEFAULT 'NOT_IDENTIFIED',
                extracted_text TEXT,
                match_confidence REAL NOT NULL DEFAULT 0.0,
                match_status TEXT NOT NULL DEFAULT 'UNMATCHED',
                duplicate_of_id TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_employees_emp_id ON employees(employee_id);
            CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);
            CREATE INDEX IF NOT EXISTS idx_salary_slips_status ON salary_slips(match_status);
            CREATE INDEX IF NOT EXISTS idx_salary_slips_hash ON salary_slips(file_hash);
            "#
        ).map_err(|e| e.to_string())?;

        // Migration safety check for existing SQLite databases created before Phase 2 final fix
        let has_dup_col: bool = conn
            .prepare("SELECT duplicate_of_id FROM salary_slips LIMIT 1")
            .is_ok();
        if !has_dup_col {
            let _ = conn.execute("ALTER TABLE salary_slips ADD COLUMN duplicate_of_id TEXT", []);
        }

        Ok(Self {
            conn: Arc::new(Mutex::new(conn)),
        })
    }
}
