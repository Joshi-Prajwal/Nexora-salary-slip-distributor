use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum JobStatus {
    Queued,
    Processing,
    Sent,
    Failed,
    Retrying,
    Cancelled,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SendJobRequest {
    pub id: String,
    pub employee_id: String,
    pub salary_slip_id: String,
    pub channel: String,
    pub attempt_count: i32,
    pub max_attempts: i32,
    pub status: JobStatus,
}
