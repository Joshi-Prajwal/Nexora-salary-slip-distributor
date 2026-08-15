use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum OcrStatus {
    NotRequired,
    Pending,
    Running,
    Completed,
    CompletedWithWarnings,
    Unavailable,
    RenderFailed,
    EngineError,
    EmptyResult,
    Timeout,
    Failed,
}

impl OcrStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            OcrStatus::NotRequired => "NOT_REQUIRED",
            OcrStatus::Pending => "PENDING",
            OcrStatus::Running => "RUNNING",
            OcrStatus::Completed => "COMPLETED",
            OcrStatus::CompletedWithWarnings => "COMPLETED_WITH_WARNINGS",
            OcrStatus::Unavailable => "UNAVAILABLE",
            OcrStatus::RenderFailed => "RENDER_FAILED",
            OcrStatus::EngineError => "ENGINE_ERROR",
            OcrStatus::EmptyResult => "EMPTY_RESULT",
            OcrStatus::Timeout => "TIMEOUT",
            OcrStatus::Failed => "FAILED",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "NOT_REQUIRED" => OcrStatus::NotRequired,
            "PENDING" => OcrStatus::Pending,
            "RUNNING" => OcrStatus::Running,
            "COMPLETED" => OcrStatus::Completed,
            "COMPLETED_WITH_WARNINGS" => OcrStatus::CompletedWithWarnings,
            "UNAVAILABLE" => OcrStatus::Unavailable,
            "RENDER_FAILED" => OcrStatus::RenderFailed,
            "ENGINE_ERROR" => OcrStatus::EngineError,
            "EMPTY_RESULT" => OcrStatus::EmptyResult,
            "TIMEOUT" => OcrStatus::Timeout,
            _ => OcrStatus::Failed,
        }
    }

    pub fn is_terminal_success(&self) -> bool {
        matches!(self, OcrStatus::Completed | OcrStatus::CompletedWithWarnings)
    }

    pub fn is_failure(&self) -> bool {
        matches!(
            self,
            OcrStatus::Unavailable
                | OcrStatus::RenderFailed
                | OcrStatus::EngineError
                | OcrStatus::EmptyResult
                | OcrStatus::Timeout
                | OcrStatus::Failed
        )
    }
}
