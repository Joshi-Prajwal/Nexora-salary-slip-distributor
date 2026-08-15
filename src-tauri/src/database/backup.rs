use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

pub struct DatabaseBackupService;

impl DatabaseBackupService {
    pub fn create_backup_filename() -> String {
        let secs = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
        format!("nexora-backup-{}.db", secs)
    }

    pub fn backup_database(db_path: &str) -> Result<Option<PathBuf>, String> {
        let path = Path::new(db_path);
        if !path.exists() {
            return Ok(None);
        }

        // Check if database is non-empty
        if let Ok(metadata) = fs::metadata(path) {
            if metadata.len() == 0 {
                return Ok(None);
            }
        }

        let parent_dir = path.parent().unwrap_or_else(|| Path::new("."));
        let backups_dir = parent_dir.join("backups");

        if let Err(e) = fs::create_dir_all(&backups_dir) {
            return Err(format!("Failed to create backups directory: {}", e));
        }

        let backup_filename = Self::create_backup_filename();
        let backup_path = backups_dir.join(backup_filename);

        if let Err(e) = fs::copy(path, &backup_path) {
            return Err(format!("Failed to copy database for backup: {}", e));
        }

        Ok(Some(backup_path))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    #[test]
    fn test_backup_non_existent_database() {
        let result = DatabaseBackupService::backup_database("non_existent_file.db");
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), None);
    }

    #[test]
    fn test_backup_creation_and_preservation() {
        let temp_dir = std::env::temp_dir().join(format!("nexora_backup_test_{}", SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos()));
        fs::create_dir_all(&temp_dir).unwrap();

        let db_path = temp_dir.join("test_nexora.db");
        {
            let mut file = fs::File::create(&db_path).unwrap();
            file.write_all(b"SQLite format 3\0 dummy test data").unwrap();
        }

        let backup_result = DatabaseBackupService::backup_database(db_path.to_str().unwrap());
        assert!(backup_result.is_ok());

        let backup_path_opt = backup_result.unwrap();
        assert!(backup_path_opt.is_some());

        let backup_path = backup_path_opt.unwrap();
        assert!(backup_path.exists());
        assert!(backup_path.to_string_lossy().contains("nexora-backup-"));

        // Verify content preservation
        let original_data = fs::read(&db_path).unwrap();
        let backup_data = fs::read(&backup_path).unwrap();
        assert_eq!(original_data, backup_data);

        // Cleanup
        let _ = fs::remove_dir_all(&temp_dir);
    }
}
