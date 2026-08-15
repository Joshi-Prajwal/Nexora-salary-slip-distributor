pub mod confidence;
pub mod matcher;
pub mod normalizer;
pub mod result;

pub use confidence::ConfidenceScorer;
pub use matcher::{EmployeeMatcher, StandardMatcher};
pub use normalizer::{normalize_email, normalize_employee_id, normalize_phone, normalize_string};
pub use result::{BatchMatchSummary, MatchCandidate, MatchResult, MatchStatus};
