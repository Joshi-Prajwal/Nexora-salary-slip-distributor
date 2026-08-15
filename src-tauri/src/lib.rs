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
pub mod services;

use database::connection::DbState;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let app_dir = app.path().app_data_dir().unwrap_or_else(|_| std::path::PathBuf::from("."));
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
