use serde::{Deserialize, Serialize};
use std::fmt;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum OcrError {
    EngineUnavailable(String),
    InitializationFailed(String),
    PdfRenderingFailed(String),
    ImagePreprocessingFailed(String),
    RecognitionFailed(String),
    Timeout(String),
    UnsupportedDocument(String),
}

impl fmt::Display for OcrError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            OcrError::EngineUnavailable(msg) => write!(f, "OCR Engine Unavailable: {}", msg),
            OcrError::InitializationFailed(msg) => write!(f, "OCR Initialization Failed: {}", msg),
            OcrError::PdfRenderingFailed(msg) => write!(f, "PDF Rendering Failed: {}", msg),
            OcrError::ImagePreprocessingFailed(msg) => write!(f, "Image Preprocessing Failed: {}", msg),
            OcrError::RecognitionFailed(msg) => write!(f, "OCR Recognition Failed: {}", msg),
            OcrError::Timeout(msg) => write!(f, "OCR Operation Timed Out: {}", msg),
            OcrError::UnsupportedDocument(msg) => write!(f, "Unsupported Document for OCR: {}", msg),
        }
    }
}

impl std::error::Error for OcrError {}
