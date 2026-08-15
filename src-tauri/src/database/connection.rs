use rusqlite::{Connection, Result};
use std::sync::{Arc, Mutex};
use std::path::Path;
use std::fs;

pub struct DbState {
    pub conn: Arc<Mutex<Connection>>,
}

fn ensure_column_exists(
    conn: &Connection,
    table_name: &str,
    column_name: &str,
    column_type: &str,
) -> Result<()> {
    let pragma_sql = format!("PRAGMA table_info({})", table_name);
    let mut stmt = conn.prepare(&pragma_sql)?;
    let columns = stmt.query_map([], |row| {
        let name: String = row.get(1)?;
        Ok(name)
    })?;

    let mut exists = false;
    for col in columns {
        if let Ok(name) = col {
            if name.eq_ignore_ascii_case(column_name) {
                exists = true;
                break;
            }
        }
    }

    if !exists {
        let alter_sql = format!("ALTER TABLE {} ADD COLUMN {} {}", table_name, column_name, column_type);
        conn.execute(&alter_sql, [])?;
    }

    Ok(())
}

impl DbState {
    pub fn new(db_path: &str) -> Result<Self, String> {
        if let Some(parent) = Path::new(db_path).parent() {
            let _ = fs::create_dir_all(parent);
        }

        let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

        Self::migrate(&conn).map_err(|e| e.to_string())?;

        Ok(Self {
            conn: Arc::new(Mutex::new(conn)),
        })
    }

    pub fn migrate(conn: &Connection) -> Result<()> {
        // Step 1: Base table structures
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
                ocr_confidence REAL,
                ocr_processed_at TEXT,
                ocr_error TEXT,
                matched_employee_id TEXT,
                match_reason TEXT,
                matched_at TEXT,
                reviewed_at TEXT,
                reviewed_by TEXT,
                review_note TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS delivery_records (
                id TEXT PRIMARY KEY,
                salary_slip_id TEXT NOT NULL,
                employee_id TEXT NOT NULL,
                channel TEXT NOT NULL,
                status TEXT NOT NULL,
                recipient TEXT NOT NULL,
                provider TEXT NOT NULL,
                message TEXT,
                error_code TEXT,
                error_message TEXT,
                provider_message_id TEXT,
                attempt_number INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL,
                started_at TEXT,
                completed_at TEXT
            );

            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            "#
        )?;

        // Step 2: Ensure backward-compatible columns exist on existing databases
        ensure_column_exists(conn, "salary_slips", "duplicate_of_id", "TEXT")?;
        ensure_column_exists(conn, "salary_slips", "ocr_confidence", "REAL")?;
        ensure_column_exists(conn, "salary_slips", "ocr_processed_at", "TEXT")?;
        ensure_column_exists(conn, "salary_slips", "ocr_error", "TEXT")?;
        ensure_column_exists(conn, "salary_slips", "matched_employee_id", "TEXT")?;
        ensure_column_exists(conn, "salary_slips", "match_reason", "TEXT")?;
        ensure_column_exists(conn, "salary_slips", "matched_at", "TEXT")?;
        ensure_column_exists(conn, "salary_slips", "reviewed_at", "TEXT")?;
        ensure_column_exists(conn, "salary_slips", "reviewed_by", "TEXT")?;
        ensure_column_exists(conn, "salary_slips", "review_note", "TEXT")?;
        ensure_column_exists(conn, "settings", "key", "TEXT")?;
        ensure_column_exists(conn, "settings", "value", "TEXT")?;
        ensure_column_exists(conn, "settings", "updated_at", "TEXT")?;

        // Step 3: Create indexes ONLY AFTER all required columns are guaranteed to exist
        conn.execute_batch(
            r#"
            CREATE INDEX IF NOT EXISTS idx_employees_emp_id ON employees(employee_id);
            CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);
            CREATE INDEX IF NOT EXISTS idx_employees_phone ON employees(phone);
            CREATE INDEX IF NOT EXISTS idx_salary_slips_status ON salary_slips(match_status);
            CREATE INDEX IF NOT EXISTS idx_salary_slips_hash ON salary_slips(file_hash);
            CREATE INDEX IF NOT EXISTS idx_salary_slips_matched_emp ON salary_slips(matched_employee_id);
            CREATE INDEX IF NOT EXISTS idx_delivery_slip_channel ON delivery_records(salary_slip_id, channel, status);
            CREATE INDEX IF NOT EXISTS idx_delivery_emp ON delivery_records(employee_id);
            CREATE INDEX IF NOT EXISTS idx_delivery_status ON delivery_records(status);
            "#
        )?;

        Ok(())
    }
}

#[cfg(test)]
pub mod tests {
    use super::*;

    #[test]
    fn test_fresh_database_initialization() {
        let conn = Connection::open_in_memory().unwrap();
        DbState::migrate(&conn).unwrap();

        // Verify Phase 5 & 6 columns exist
        let mut stmt = conn.prepare("PRAGMA table_info(salary_slips)").unwrap();
        let cols: Vec<String> = stmt
            .query_map([], |row| row.get(1))
            .unwrap()
            .map(|r| r.unwrap())
            .collect();

        assert!(cols.contains(&"matched_employee_id".to_string()));
        assert!(cols.contains(&"match_reason".to_string()));
        assert!(cols.contains(&"reviewed_at".to_string()));

        // Verify delivery_records exists
        let mut del_stmt = conn.prepare("PRAGMA table_info(delivery_records)").unwrap();
        let del_cols: Vec<String> = del_stmt
            .query_map([], |row| row.get(1))
            .unwrap()
            .map(|r| r.unwrap())
            .collect();
        assert!(del_cols.contains(&"salary_slip_id".to_string()));
        assert!(del_cols.contains(&"channel".to_string()));

        // Verify index exists
        let mut idx_stmt = conn.prepare("PRAGMA index_list(salary_slips)").unwrap();
        let idxs: Vec<String> = idx_stmt
            .query_map([], |row| row.get(1))
            .unwrap()
            .map(|r| r.unwrap())
            .collect();

        assert!(idxs.contains(&"idx_salary_slips_matched_emp".to_string()));
    }

    #[test]
    fn test_existing_old_database_migration() {
        let conn = Connection::open_in_memory().unwrap();

        // Create pre-Phase-5 schema without Phase 5 columns
        conn.execute_batch(
            r#"
            CREATE TABLE salary_slips (
                id TEXT PRIMARY KEY,
                file_path TEXT NOT NULL UNIQUE,
                file_name TEXT NOT NULL,
                file_hash TEXT NOT NULL,
                match_status TEXT NOT NULL DEFAULT 'UNMATCHED',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            INSERT INTO salary_slips (id, file_path, file_name, file_hash, created_at, updated_at)
            VALUES ('slip-1', '/path/slip1.pdf', 'slip1.pdf', 'hash-1', '1000', '1000');
            "#
        ).unwrap();

        // Run migration
        DbState::migrate(&conn).unwrap();

        // Verify existing record is preserved
        let count: i64 = conn.query_row("SELECT COUNT(*) FROM salary_slips WHERE id = 'slip-1'", [], |r| r.get(0)).unwrap();
        assert_eq!(count, 1);

        // Verify Phase 5 columns were added
        let mut stmt = conn.prepare("PRAGMA table_info(salary_slips)").unwrap();
        let cols: Vec<String> = stmt
            .query_map([], |row| row.get(1))
            .unwrap()
            .map(|r| r.unwrap())
            .collect();

        assert!(cols.contains(&"matched_employee_id".to_string()));
        assert!(cols.contains(&"match_reason".to_string()));
        assert!(cols.contains(&"reviewed_at".to_string()));

        // Verify index exists
        let mut idx_stmt = conn.prepare("PRAGMA index_list(salary_slips)").unwrap();
        let idxs: Vec<String> = idx_stmt
            .query_map([], |row| row.get(1))
            .unwrap()
            .map(|r| r.unwrap())
            .collect();

        assert!(idxs.contains(&"idx_salary_slips_matched_emp".to_string()));
    }

    #[test]
    fn test_idempotent_migration() {
        let conn = Connection::open_in_memory().unwrap();
        DbState::migrate(&conn).unwrap();
        // Run migration a second time to ensure idempotency
        DbState::migrate(&conn).unwrap();
    }
}
