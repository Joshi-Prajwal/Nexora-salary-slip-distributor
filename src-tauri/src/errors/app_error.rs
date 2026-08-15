use serde::Serialize;
use std::fmt;

#[derive(Debug, Clone)]
pub enum AppError {
    DatabaseError(String),
    FileSystemError(String),
    ExtractionError(String),
    ValidationError(String),
    ProviderError(String),
    ConfigurationError(String),
    IoError(String),
}

impl fmt::Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            AppError::DatabaseError(msg) => write!(f, "Database error: {}", msg),
            AppError::FileSystemError(msg) => write!(f, "File system error: {}", msg),
            AppError::ExtractionError(msg) => write!(f, "Extraction error: {}", msg),
            AppError::ValidationError(msg) => write!(f, "Validation error: {}", msg),
            AppError::ProviderError(msg) => write!(f, "Provider error: {}", msg),
            AppError::ConfigurationError(msg) => write!(f, "Configuration error: {}", msg),
            AppError::IoError(msg) => write!(f, "IO error: {}", msg),
        }
    }
}

impl std::error::Error for AppError {}

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
            AppError::ProviderError(msg) => SanitizedError {
                code: "PROVIDER_ERROR".into(),
                message: msg.clone(),
            },
            AppError::ConfigurationError(msg) => SanitizedError {
                code: "CONFIG_ERROR".into(),
                message: msg.clone(),
            },
            AppError::IoError(msg) => SanitizedError {
                code: "IO_ERROR".into(),
                message: msg.clone(),
            },
        }
    }
}
