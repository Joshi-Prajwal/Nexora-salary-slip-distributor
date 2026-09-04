use crate::models::{Employee, CreateEmployeeInput};
use crate::database::connection::DbState;
use crate::database::backup::DatabaseBackupService;
use crate::services::EmployeeService;
use tauri::State;

#[tauri::command]
pub fn get_employees(state: State<'_, DbState>) -> Result<Vec<Employee>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let service = EmployeeService::new();
    service.get_all_employees(&conn)
}

#[tauri::command]
pub fn import_employees(
    state: State<'_, DbState>,
    employees: Vec<CreateEmployeeInput>,
) -> Result<usize, String> {
    let mut conn = state.conn.lock().map_err(|e| e.to_string())?;
    let service = EmployeeService::new();
    service.import_employees(&mut conn, employees)
}

#[tauri::command]
pub fn replace_all_employees(
    state: State<'_, DbState>,
    employees: Vec<CreateEmployeeInput>,
) -> Result<usize, String> {
    // Phase 10 Safety Guarantee: Perform database backup prior to deleting existing master dataset
    let _ = DatabaseBackupService::backup_database(&state.db_path);

    let mut conn = state.conn.lock().map_err(|e| e.to_string())?;
    let service = EmployeeService::new();
    service.replace_all_employees(&mut conn, employees)
}

