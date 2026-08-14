use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
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
    pub duplicate_of_id: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanSummary {
    pub total_scanned: usize,
    pub pdf_count: usize,
    pub new_count: usize,
    pub updated_count: usize,
    pub unchanged_count: usize,
    pub duplicate_count: usize,
    pub folder_path: String,
    pub slips: Vec<SalarySlip>,
}
