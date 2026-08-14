use crate::models::{SalarySlip, ScanSummary};
use crate::database::connection::DbState;
use crate::services::SalarySlipService;
use tauri::State;

#[tauri::command]
pub fn scan_salary_slips(
    state: State<'_, DbState>,
    folder_path: String,
) -> Result<ScanSummary, String> {
    let mut conn = state.conn.lock().map_err(|e| e.to_string())?;
    let service = SalarySlipService::new();
    service.scan_folder(&mut conn, &folder_path)
}

#[tauri::command]
pub fn get_salary_slips(state: State<'_, DbState>) -> Result<Vec<SalarySlip>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let service = SalarySlipService::new();
    service.get_all_salary_slips(&conn)
}

#[tauri::command]
pub fn remove_salary_slip_record(
    state: State<'_, DbState>,
    id: String,
) -> Result<bool, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let service = SalarySlipService::new();
    service.remove_record(&conn, &id)
}
