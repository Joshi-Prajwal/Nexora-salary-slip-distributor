pub fn normalize_string(input: &str) -> String {
    input.trim().to_lowercase()
}

pub fn normalize_employee_id(id: &str) -> String {
    id.trim().to_uppercase()
}
