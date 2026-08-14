use crate::models::SalarySlip;

#[tauri::command]
pub fn scan_salary_slips(_folder_path: String) -> Vec<SalarySlip> {
    vec![]
}
