use crate::database::backup::DatabaseBackupService;
use rusqlite::{Connection, Result};
use std::fs;
use std::path::Path;
use std::sync::{Arc, Mutex};

pub struct DbState {
    pub conn: Arc<Mutex<Connection>>,
    pub db_path: String,
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

        // Perform safe backup if existing database file
        if Path::new(db_path).exists() {
            let _ = DatabaseBackupService::backup_database(db_path);
        }

        let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

        Self::migrate(&conn).map_err(|e| e.to_string())?;

        // Recover orphan records stuck in PROCESSING state from previous abnormal shutdown
        Self::recover_stuck_records(&conn).map_err(|e| e.to_string())?;

        Ok(Self {
            conn: Arc::new(Mutex::new(conn)),
            db_path: db_path.to_string(),
        })
    }

    pub fn recover_stuck_records(conn: &Connection) -> Result<()> {
        let now_str = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs()
            .to_string();

        conn.execute(
            "UPDATE delivery_records 
             SET status = 'FAILED', 
                 error_code = 'INTERRUPTED_SHUTDOWN', 
                 error_message = 'Processing interrupted by application shutdown', 
                 completed_at = ? 
             WHERE status = 'PROCESSING'",
            [&now_str],
        )?;

        // Also recover any OCR tasks stuck in RUNNING state from abnormal termination
        let _ = conn.execute(
            "UPDATE salary_slips 
             SET ocr_status = 'PENDING',
                 ocr_error = 'OCR processing interrupted by application shutdown. Ready for retry.'
             WHERE ocr_status = 'RUNNING'",
            [],
        );

        Ok(())
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
                month TEXT,
                year TEXT,
                approval_status TEXT NOT NULL DEFAULT 'PENDING',
                ocr_status TEXT NOT NULL DEFAULT 'NOT_REQUIRED',
                document_type TEXT NOT NULL DEFAULT 'UNKNOWN',
                document_confidence REAL NOT NULL DEFAULT 0.0,
                ocr_attempt_count INTEGER NOT NULL DEFAULT 0,
                ocr_page_count INTEGER NOT NULL DEFAULT 0,
                ocr_processing_time_ms INTEGER NOT NULL DEFAULT 0,
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

        // Step 2: Ensure backward-compatible columns exist on existing databases BEFORE index creation
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
        ensure_column_exists(conn, "salary_slips", "month", "TEXT")?;
        ensure_column_exists(conn, "salary_slips", "year", "TEXT")?;
        ensure_column_exists(conn, "salary_slips", "approval_status", "TEXT DEFAULT 'PENDING'")?;
        ensure_column_exists(conn, "salary_slips", "ocr_status", "TEXT DEFAULT 'NOT_REQUIRED'")?;
        ensure_column_exists(conn, "salary_slips", "document_type", "TEXT DEFAULT 'UNKNOWN'")?;
        ensure_column_exists(conn, "salary_slips", "document_confidence", "REAL DEFAULT 0.0")?;
        ensure_column_exists(conn, "salary_slips", "ocr_attempt_count", "INTEGER DEFAULT 0")?;
        ensure_column_exists(conn, "salary_slips", "ocr_page_count", "INTEGER DEFAULT 0")?;
        ensure_column_exists(conn, "salary_slips", "ocr_processing_time_ms", "INTEGER DEFAULT 0")?;
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

        let mut stmt = conn.prepare("PRAGMA table_info(salary_slips)").unwrap();
        let cols: Vec<String> = stmt
            .query_map([], |row| row.get(1))
            .unwrap()
            .map(|r| r.unwrap())
            .collect();

        assert!(cols.contains(&"matched_employee_id".to_string()));
        assert!(cols.contains(&"match_reason".to_string()));
        assert!(cols.contains(&"reviewed_at".to_string()));
        assert!(cols.contains(&"month".to_string()));
        assert!(cols.contains(&"year".to_string()));
    }

    #[test]
    fn test_migration_creates_tables() {
        let conn = Connection::open_in_memory().unwrap();
        DbState::migrate(&conn).unwrap();

        let mut stmt = conn.prepare("SELECT name FROM sqlite_master WHERE type='table'").unwrap();
        let tables: Vec<String> = stmt
            .query_map([], |row| row.get(0))
            .unwrap()
            .map(|r| r.unwrap())
            .collect();

        assert!(tables.contains(&"employees".to_string()));
        assert!(tables.contains(&"salary_slips".to_string()));
        assert!(tables.contains(&"delivery_records".to_string()));
        assert!(tables.contains(&"settings".to_string()));
    }

    #[test]
    fn test_delivery_records_schema() {
        let conn = Connection::open_in_memory().unwrap();
        DbState::migrate(&conn).unwrap();

        let mut stmt = conn.prepare("PRAGMA table_info(delivery_records)").unwrap();
        let cols: Vec<String> = stmt
            .query_map([], |row| row.get(1))
            .unwrap()
            .map(|r| r.unwrap())
            .collect();

        assert!(cols.contains(&"salary_slip_id".to_string()));
        assert!(cols.contains(&"employee_id".to_string()));
        assert!(cols.contains(&"channel".to_string()));
        assert!(cols.contains(&"status".to_string()));
        assert!(cols.contains(&"attempt_number".to_string()));
    }

    #[test]
    fn test_settings_schema() {
        let conn = Connection::open_in_memory().unwrap();
        DbState::migrate(&conn).unwrap();

        let mut stmt = conn.prepare("PRAGMA table_info(settings)").unwrap();
        let cols: Vec<String> = stmt
            .query_map([], |row| row.get(1))
            .unwrap()
            .map(|r| r.unwrap())
            .collect();

        assert!(cols.contains(&"key".to_string()));
        assert!(cols.contains(&"value".to_string()));
    }
}
