use crate::models::Employee;

#[tauri::command]
pub fn get_employees() -> Vec<Employee> {
    vec![]
}
