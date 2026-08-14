use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ExtractionMethod {
    TextEmbedded,
    Ocr,
    Manual,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum MatchStatus {
    Ready,
    ReviewRequired,
    Unmatched,
    Confirmed,
    Rejected,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SalarySlip {
    pub id: String,
    pub file_path: String,
    pub file_name: String,
    pub file_hash: String,
    pub detected_employee_id: Option<String>,
    pub detected_name: Option<String>,
    pub detected_phone: Option<String>,
    pub detected_email: Option<String>,
    pub extraction_method: String,
    pub extracted_text: Option<String>,
    pub match_confidence: f64,
    pub match_status: String,
    pub created_at: String,
    pub updated_at: String,
}
