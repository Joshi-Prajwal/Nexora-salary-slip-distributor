use crate::models::{SalarySlip, ScanSummary, ExtractionSummary, OcrBatchSummary};
use crate::filesystem::FolderScanDiagnostics;
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
pub fn ingest_salary_slips(
    state: State<'_, DbState>,
    paths: Vec<String>,
) -> Result<ScanSummary, String> {
    let mut conn = state.conn.lock().map_err(|e| e.to_string())?;
    let service = SalarySlipService::new();
    service.ingest_paths(&mut conn, &paths)
}

#[tauri::command]
pub fn diagnose_folder(
    state: State<'_, DbState>,
    folder_path: String,
) -> Result<FolderScanDiagnostics, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let service = SalarySlipService::new();
    service.diagnose_folder(&conn, &folder_path)
}

#[tauri::command]
pub fn get_salary_slips(state: State<'_, DbState>) -> Result<Vec<SalarySlip>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let service = SalarySlipService::new();
    service.get_all_salary_slips(&conn)
}

#[tauri::command]
pub fn extract_salary_slip_text(
    state: State<'_, DbState>,
    id: String,
) -> Result<SalarySlip, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let service = SalarySlipService::new();
    service.extract_salary_slip_text(&conn, &id)
}

#[tauri::command]
pub fn extract_all_salary_slips(
    state: State<'_, DbState>,
) -> Result<ExtractionSummary, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let service = SalarySlipService::new();
    service.extract_all_salary_slips(&conn)
}

#[tauri::command]
pub fn run_ocr_fallback(
    state: State<'_, DbState>,
    id: String,
) -> Result<SalarySlip, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let service = SalarySlipService::new();
    service.run_ocr_fallback(&conn, &id)
}

#[tauri::command]
pub fn run_batch_ocr_fallback(
    state: State<'_, DbState>,
) -> Result<OcrBatchSummary, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let service = SalarySlipService::new();
    service.run_batch_ocr_fallback(&conn)
}

#[tauri::command]
pub fn run_force_ocr_batch(
    state: State<'_, DbState>,
) -> Result<OcrBatchSummary, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let service = SalarySlipService::new();
    service.run_force_ocr_batch(&conn)
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

#[tauri::command]
pub fn remove_salary_slips_batch(
    state: State<'_, DbState>,
    ids: Vec<String>,
) -> Result<usize, String> {
    let mut conn = state.conn.lock().map_err(|e| e.to_string())?;
    let service = SalarySlipService::new();
    service.remove_records_batch(&mut conn, &ids)
}
