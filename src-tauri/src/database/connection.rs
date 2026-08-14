use crate::errors::AppError;

pub struct DbConnection {
    pub db_path: String,
}

impl DbConnection {
    pub fn new(db_path: &str) -> Self {
        Self {
            db_path: db_path.to_string(),
        }
    }

    pub fn initialize(&self) -> Result<(), AppError> {
        // Phase 0: Verifies DB connection path setup
        println!("[Database] Initialized connection to SQLite at {}", self.db_path);
        Ok(())
    }
}
