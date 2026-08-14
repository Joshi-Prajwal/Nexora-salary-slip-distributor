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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            commands::get_employees,
            commands::scan_salary_slips,
            commands::run_matching_engine,
            commands::start_bulk_send,
            commands::get_app_settings,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
