use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OcrResult {
    pub text: String,
    pub confidence: f64,
    pub processing_time_ms: u64,
    pub page_count: usize,
}
