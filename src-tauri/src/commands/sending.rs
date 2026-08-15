use crate::database::connection::DbState;
use crate::models::{DeliveryBatchSummary, DeliveryPreview, DeliveryRecord};
use crate::services::DeliveryService;
use tauri::State;

#[tauri::command]
pub fn preview_delivery_batch(
    state: State<'_, DbState>,
    slip_ids: Vec<String>,
    channel: String,
) -> Result<DeliveryPreview, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let service = DeliveryService::new();
    service.preview_batch(&conn, &slip_ids, &channel)
}

#[tauri::command]
pub fn send_salary_slips_batch(
    state: State<'_, DbState>,
    slip_ids: Vec<String>,
    channel: String,
) -> Result<DeliveryBatchSummary, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let service = DeliveryService::new();
    service.send_batch(&conn, &slip_ids, &channel)
}

#[tauri::command]
pub fn retry_delivery_record(
    state: State<'_, DbState>,
    record_id: String,
) -> Result<DeliveryRecord, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let service = DeliveryService::new();
    service.retry_delivery_record(&conn, &record_id)
}

#[tauri::command]
pub fn get_delivery_records(
    state: State<'_, DbState>,
) -> Result<Vec<DeliveryRecord>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let service = DeliveryService::new();
    service.get_delivery_records(&conn)
}
