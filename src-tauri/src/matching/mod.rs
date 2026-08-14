pub mod confidence;
pub mod matcher;
pub mod normalization;

pub use confidence::ConfidenceScorer;
pub use matcher::{EmployeeMatcher, MatchCandidate, StandardMatcher};
pub use normalization::{normalize_employee_id, normalize_string};
