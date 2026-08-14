use crate::models::{Employee, SalarySlip};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MatchCandidate {
    pub employee_id: String,
    pub match_method: String,
    pub confidence: f64,
    pub requires_manual_review: bool,
}

pub trait EmployeeMatcher {
    fn match_slip(&self, slip: &SalarySlip, employees: &[Employee]) -> Option<MatchCandidate>;
}

pub struct StandardMatcher;

impl StandardMatcher {
    pub fn new() -> Self {
        Self
    }
}

impl EmployeeMatcher for StandardMatcher {
    fn match_slip(&self, _slip: &SalarySlip, _employees: &[Employee]) -> Option<MatchCandidate> {
        // Matching Priority Rule:
        // 1. Exact Employee ID
        // 2. Exact normalized Employee ID
        // 3. Exact normalized name
        // 4. Phone
        // 5. Email
        // 6. Combined signals
        // 7. Manual review (Ambiguous matches MUST NOT be auto-sent)
        None
    }
}
