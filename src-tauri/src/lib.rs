pub mod commands;
pub mod config;
pub mod database;
pub mod errors;
pub mod filesystem;
pub mod matching;
pub mod messaging;
pub mod models;
pub mod ocr;
pub mod pdf;
pub mod queue;
pub mod security;
pub mod services;

use database::connection::DbState;
use tauri::Manager;

/// Safely and non-destructively copies legacy database and backups from com.nexora.app
/// to the new com.nexora.distributor data directory if the new database does not exist yet.
pub fn migrate_legacy_data_if_needed(app_dir: &std::path::Path) {
    let target_db = app_dir.join("nexora.db");
    if target_db.exists() {
        return;
    }

    if let Some(roaming_dir) = app_dir.parent() {
        let legacy_dir = roaming_dir.join("com.nexora.app");
        let legacy_db = legacy_dir.join("nexora.db");
        if legacy_db.exists() {
            let _ = std::fs::create_dir_all(app_dir);
            let _ = std::fs::copy(&legacy_db, &target_db);

            let legacy_wal = legacy_dir.join("nexora.db-wal");
            if legacy_wal.exists() {
                let _ = std::fs::copy(&legacy_wal, app_dir.join("nexora.db-wal"));
            }

            let legacy_shm = legacy_dir.join("nexora.db-shm");
            if legacy_shm.exists() {
                let _ = std::fs::copy(&legacy_shm, app_dir.join("nexora.db-shm"));
            }

            let legacy_backups = legacy_dir.join("backups");
            let target_backups = app_dir.join("backups");
            if legacy_backups.exists() && !target_backups.exists() {
                let _ = std::fs::create_dir_all(&target_backups);
                if let Ok(entries) = std::fs::read_dir(&legacy_backups) {
                    for entry in entries.flatten() {
                        let path = entry.path();
                        if path.is_file() {
                            if let Some(name) = path.file_name() {
                                let _ = std::fs::copy(&path, target_backups.join(name));
                            }
                        }
                    }
                }
            }
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let app_dir = app.path().app_data_dir().unwrap_or_else(|_| std::path::PathBuf::from("."));
            migrate_legacy_data_if_needed(&app_dir);
            let db_path = app_dir.join("nexora.db");
            let db_path_str = db_path.to_str().unwrap_or("nexora.db");
            
            let db_state = DbState::new(db_path_str).expect("Failed to initialize SQLite database");
            app.manage(db_state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_employees,
            commands::import_employees,
            commands::replace_all_employees,
            commands::scan_salary_slips,
            commands::ingest_salary_slips,
            commands::diagnose_folder,
            commands::get_salary_slips,
            commands::extract_salary_slip_text,
            commands::extract_all_salary_slips,
            commands::run_ocr_fallback,
            commands::run_batch_ocr_fallback,
            commands::run_force_ocr_batch,
            commands::run_matching_engine,
            commands::confirm_salary_slip_match,
            commands::reject_salary_slip_match,
            commands::reset_salary_slip_match,
            commands::get_match_candidates,
            commands::confirm_all_safe_matches,
            commands::bulk_update_approval_status,
            commands::remove_salary_slip_record,
            commands::remove_salary_slips_batch,
            commands::preview_delivery_batch,
            commands::send_salary_slips_batch,
            commands::retry_delivery_record,
            commands::get_delivery_records,
            commands::test_email_connection,
            commands::send_test_email,
            commands::test_whatsapp_connection,
            commands::get_app_settings,
            commands::save_app_settings,
            commands::save_email_settings,
            commands::save_whatsapp_settings,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn test_migrate_legacy_data_non_destructive() {
        let temp_dir = std::env::temp_dir().join(format!("nexora_test_mig_{}", std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_nanos()));
        let legacy_dir = temp_dir.join("com.nexora.app");
        let new_dir = temp_dir.join("com.nexora.distributor");

        fs::create_dir_all(&legacy_dir).unwrap();
        let legacy_db = legacy_dir.join("nexora.db");
        let legacy_wal = legacy_dir.join("nexora.db-wal");
        fs::write(&legacy_db, b"sqlite_test_legacy_content").unwrap();
        fs::write(&legacy_wal, b"sqlite_wal_content").unwrap();

        let legacy_backups = legacy_dir.join("backups");
        fs::create_dir_all(&legacy_backups).unwrap();
        fs::write(legacy_backups.join("backup-1.db"), b"backup_data").unwrap();

        // Run migration to new directory
        migrate_legacy_data_if_needed(&new_dir);

        // Verify target files exist with exact content
        assert!(new_dir.join("nexora.db").exists());
        assert_eq!(fs::read(new_dir.join("nexora.db")).unwrap(), b"sqlite_test_legacy_content");
        assert!(new_dir.join("nexora.db-wal").exists());
        assert_eq!(fs::read(new_dir.join("nexora.db-wal")).unwrap(), b"sqlite_wal_content");
        assert!(new_dir.join("backups").join("backup-1.db").exists());

        // CRITICAL: Verify legacy files are 100% UNTOUCHED
        assert!(legacy_db.exists());
        assert_eq!(fs::read(&legacy_db).unwrap(), b"sqlite_test_legacy_content");
        assert!(legacy_wal.exists());
        assert!(legacy_backups.join("backup-1.db").exists());

        // Clean up temp test directory
        let _ = fs::remove_dir_all(temp_dir);
    }

    #[test]
    fn test_migrate_legacy_data_skips_if_target_exists() {
        let temp_dir = std::env::temp_dir().join(format!("nexora_test_mig_skip_{}", std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_nanos()));
        let legacy_dir = temp_dir.join("com.nexora.app");
        let new_dir = temp_dir.join("com.nexora.distributor");

        fs::create_dir_all(&legacy_dir).unwrap();
        fs::create_dir_all(&new_dir).unwrap();

        let legacy_db = legacy_dir.join("nexora.db");
        let target_db = new_dir.join("nexora.db");

        fs::write(&legacy_db, b"legacy_content").unwrap();
        fs::write(&target_db, b"existing_new_content").unwrap();

        // Run migration
        migrate_legacy_data_if_needed(&new_dir);

        // Target content should NOT be overwritten
        assert_eq!(fs::read(&target_db).unwrap(), b"existing_new_content");
        // Legacy should remain intact
        assert_eq!(fs::read(&legacy_db).unwrap(), b"legacy_content");

        // Clean up temp test directory
        let _ = fs::remove_dir_all(temp_dir);
    }
}

