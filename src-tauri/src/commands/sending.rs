#[tauri::command]
pub fn start_bulk_send(_slip_ids: Vec<String>, _channel: String) -> bool {
    true
}
