use crate::models::AppSettings;

#[tauri::command]
pub fn get_app_settings() -> Option<AppSettings> {
    None
}
