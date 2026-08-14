use serde::Serialize;

#[derive(Debug, Clone)]
pub enum AppError {
    DatabaseError(String),
    FileSystemError(String),
    ExtractionError(String),
    ValidationError(String),
    ProviderError(String),
}

// Custom simple enum for Phase 0 without external macros
#[derive(Debug, Serialize)]
pub struct SanitizedError {
    pub code: String,
    pub message: String,
}

impl AppError {
    pub fn sanitize(&self) -> SanitizedError {
        match self {
            AppError::DatabaseError(_) => SanitizedError {
                code: "DB_ERROR".into(),
                message: "A database error occurred. Confidential details hidden.".into(),
            },
            AppError::FileSystemError(_) => SanitizedError {
                code: "FS_ERROR".into(),
                message: "A file system access error occurred.".into(),
            },
            AppError::ExtractionError(_) => SanitizedError {
                code: "EXTRACTION_ERROR".into(),
                message: "Failed to extract text from document.".into(),
            },
            AppError::ValidationError(msg) => SanitizedError {
                code: "VALIDATION_ERROR".into(),
                message: msg.clone(),
            },
            AppError::ProviderError(_) => SanitizedError {
                code: "PROVIDER_ERROR".into(),
                message: "External provider communication failed.".into(),
            },
        }
    }
}
