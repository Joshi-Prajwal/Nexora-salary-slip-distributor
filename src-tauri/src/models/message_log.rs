use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MessageLog {
    pub id: String,
    pub employee_id: String,
    pub salary_slip_id: String,
    pub channel: String,
    pub status: String,
    pub provider_message_id: Option<String>,
    pub error_message: Option<String>,
    pub attempt_count: i32,
    pub sent_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}
