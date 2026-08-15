use crate::models::SalarySlip;
use crate::matching::{BatchMatchSummary, MatchCandidate};
use crate::database::connection::DbState;
use crate::services::SalarySlipService;
use tauri::State;

#[tauri::command]
pub fn run_matching_engine(
    state: State<'_, DbState>,
) -> Result<BatchMatchSummary, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let service = SalarySlipService::new();
    service.run_matching_engine(&conn)
}

#[tauri::command]
pub fn confirm_salary_slip_match(
    state: State<'_, DbState>,
    slip_id: String,
    employee_id: String,
    note: Option<String>,
) -> Result<SalarySlip, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let service = SalarySlipService::new();
    service.confirm_match(&conn, &slip_id, &employee_id, note.as_deref())
}

#[tauri::command]
pub fn reject_salary_slip_match(
    state: State<'_, DbState>,
    slip_id: String,
    note: Option<String>,
) -> Result<SalarySlip, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let service = SalarySlipService::new();
    service.reject_match(&conn, &slip_id, note.as_deref())
}

#[tauri::command]
pub fn reset_salary_slip_match(
    state: State<'_, DbState>,
    slip_id: String,
) -> Result<SalarySlip, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let service = SalarySlipService::new();
    service.reset_match(&conn, &slip_id)
}

#[tauri::command]
pub fn get_match_candidates(
    state: State<'_, DbState>,
    slip_id: String,
) -> Result<Vec<MatchCandidate>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let service = SalarySlipService::new();
    service.get_match_candidates(&conn, &slip_id)
}
