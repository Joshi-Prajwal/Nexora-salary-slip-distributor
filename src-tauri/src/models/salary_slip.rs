use serde::{Deserialize, Serialize};
use crate::filesystem::{DiscoveredFile, ScanError};

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
    pub ocr_confidence: Option<f64>,
    pub ocr_processed_at: Option<String>,
    pub ocr_error: Option<String>,
    pub matched_employee_id: Option<String>,
    pub match_reason: Option<String>,
    pub matched_at: Option<String>,
    pub reviewed_at: Option<String>,
    pub reviewed_by: Option<String>,
    pub review_note: Option<String>,
    pub month: Option<String>,
    pub year: Option<String>,
    pub approval_status: String,
    pub ocr_status: String,
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
    pub display_name: String,
    pub directories_scanned: usize,
    pub files_scanned: usize,
    pub scan_errors: Vec<ScanError>,
    pub files: Vec<DiscoveredFile>,
    pub slips: Vec<SalarySlip>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExtractionSummary {
    pub total: usize,
    pub processed: usize,
    pub identified: usize,
    pub partially_identified: usize,
    pub not_identified: usize,
    pub failed: usize,
    pub skipped: usize,
    pub slips: Vec<SalarySlip>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OcrBatchSummary {
    pub total: usize,
    pub processed: usize,
    pub identified: usize,
    pub partially_identified: usize,
    pub not_identified: usize,
    pub failed: usize,
    pub skipped: usize,
    pub slips: Vec<SalarySlip>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BulkConfirmResult {
    pub confirmed_count: usize,
    pub skipped_count: usize,
    pub skipped_reasons: Vec<String>,
    pub slips: Vec<SalarySlip>,
}
