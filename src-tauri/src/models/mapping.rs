use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Mapping {
    pub id: String,
    pub salary_slip_id: String,
    pub employee_id: String,
    pub match_method: String,
    pub confidence: f64,
    pub confirmed: bool,
    pub created_at: String,
    pub updated_at: String,
}
