use serde::{Deserialize, Serialize};
use crate::models::SalarySlip;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum MatchStatus {
    ExactMatch,
    StrongMatch,
    PossibleMatch,
    NoMatch,
    Conflict,
    ManualReview,
    ManuallyConfirmed,
    ManuallyRejected,
}

impl MatchStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            MatchStatus::ExactMatch => "EXACT_MATCH",
            MatchStatus::StrongMatch => "STRONG_MATCH",
            MatchStatus::PossibleMatch => "POSSIBLE_MATCH",
            MatchStatus::NoMatch => "NO_MATCH",
            MatchStatus::Conflict => "CONFLICT",
            MatchStatus::ManualReview => "MANUAL_REVIEW",
            MatchStatus::ManuallyConfirmed => "MANUALLY_CONFIRMED",
            MatchStatus::ManuallyRejected => "MANUALLY_REJECTED",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "EXACT_MATCH" => MatchStatus::ExactMatch,
            "STRONG_MATCH" => MatchStatus::StrongMatch,
            "POSSIBLE_MATCH" => MatchStatus::PossibleMatch,
            "NO_MATCH" => MatchStatus::NoMatch,
            "CONFLICT" => MatchStatus::Conflict,
            "MANUAL_REVIEW" => MatchStatus::ManualReview,
            "MANUALLY_CONFIRMED" => MatchStatus::ManuallyConfirmed,
            "MANUALLY_REJECTED" => MatchStatus::ManuallyRejected,
            _ => MatchStatus::NoMatch,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MatchCandidate {
    pub employee_db_id: String,
    pub employee_id: String,
    pub name: String,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub department: Option<String>,
    pub designation: Option<String>,
    pub score: f64,
    pub matched_fields: Vec<String>,
    pub unmatched_fields: Vec<String>,
    pub explanation: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MatchResult {
    pub salary_slip_id: String,
    pub status: String,
    pub confidence: f64,
    pub matched_employee_id: Option<String>,
    pub candidate: Option<MatchCandidate>,
    pub all_candidates: Vec<MatchCandidate>,
    pub reason: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchMatchSummary {
    pub total: usize,
    pub exact_matches: usize,
    pub strong_matches: usize,
    pub possible_matches: usize,
    pub conflicts: usize,
    pub no_matches: usize,
    pub already_reviewed: usize,
    pub slips: Vec<SalarySlip>,
}
