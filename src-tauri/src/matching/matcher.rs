use crate::models::{Employee, SalarySlip};
use crate::matching::normalizer::{
    normalize_email, normalize_employee_id, normalize_phone, normalize_string,
};
use crate::matching::result::{MatchCandidate, MatchResult, MatchStatus};

pub trait EmployeeMatcher {
    fn match_slip(&self, slip: &SalarySlip, employees: &[Employee]) -> MatchResult;
    fn get_candidates(&self, slip: &SalarySlip, employees: &[Employee]) -> Vec<MatchCandidate>;
}

pub struct StandardMatcher;

impl StandardMatcher {
    pub fn new() -> Self {
        Self
    }
}

impl EmployeeMatcher for StandardMatcher {
    fn get_candidates(&self, slip: &SalarySlip, employees: &[Employee]) -> Vec<MatchCandidate> {
        let mut candidates = Vec::new();

        let norm_slip_id = slip
            .detected_employee_id
            .as_deref()
            .map(normalize_employee_id)
            .unwrap_or_default();
        let norm_slip_email = slip
            .detected_email
            .as_deref()
            .map(normalize_email)
            .unwrap_or_default();
        let norm_slip_phone = slip
            .detected_phone
            .as_deref()
            .map(normalize_phone)
            .unwrap_or_default();
        let norm_slip_name = slip
            .detected_name
            .as_deref()
            .map(normalize_string)
            .unwrap_or_default();

        for emp in employees {
            let mut score = 0.0;
            let mut matched_fields = Vec::new();
            let mut unmatched_fields = Vec::new();

            let norm_emp_id = normalize_employee_id(&emp.employee_id);
            let norm_emp_email = emp.email.as_deref().map(normalize_email).unwrap_or_default();
            let norm_emp_phone = emp.phone.as_deref().map(normalize_phone).unwrap_or_default();
            let norm_emp_name = normalize_string(&emp.name);

            // 1. Employee ID Check
            let id_matched = !norm_slip_id.is_empty()
                && !norm_emp_id.is_empty()
                && norm_slip_id == norm_emp_id;
            if id_matched {
                matched_fields.push("Employee ID".to_string());
                score += 100.0;
            } else if !norm_slip_id.is_empty() {
                unmatched_fields.push("Employee ID".to_string());
            }

            // 2. Email Check
            let email_matched = !norm_slip_email.is_empty()
                && !norm_emp_email.is_empty()
                && norm_slip_email == norm_emp_email;
            if email_matched {
                matched_fields.push("Email".to_string());
                if !id_matched {
                    score += 95.0;
                }
            } else if !norm_slip_email.is_empty() {
                unmatched_fields.push("Email".to_string());
            }

            // 3. Phone Check
            let phone_matched = !norm_slip_phone.is_empty()
                && !norm_emp_phone.is_empty()
                && norm_slip_phone == norm_emp_phone;
            if phone_matched {
                matched_fields.push("Phone".to_string());
                if !id_matched && !email_matched {
                    score += 90.0;
                }
            } else if !norm_slip_phone.is_empty() {
                unmatched_fields.push("Phone".to_string());
            }

            // 4. Name Check
            let name_matched = !norm_slip_name.is_empty()
                && !norm_emp_name.is_empty()
                && (norm_slip_name == norm_emp_name
                    || norm_slip_name.contains(&norm_emp_name)
                    || norm_emp_name.contains(&norm_slip_name));
            if name_matched {
                matched_fields.push("Name".to_string());
                if !id_matched && !email_matched && !phone_matched {
                    score += 80.0;
                }
            } else if !norm_slip_name.is_empty() {
                unmatched_fields.push("Name".to_string());
            }

            // Cap score at 100.0
            if score > 100.0 {
                score = 100.0;
            }

            if score > 0.0 {
                let explanation = format!(
                    "Matched fields: {}. Score: {}%.",
                    matched_fields.join(", "),
                    score as u32
                );

                candidates.push(MatchCandidate {
                    employee_db_id: emp.id.clone(),
                    employee_id: emp.employee_id.clone(),
                    name: emp.name.clone(),
                    email: emp.email.clone(),
                    phone: emp.phone.clone(),
                    department: emp.department.clone(),
                    designation: emp.designation.clone(),
                    score,
                    matched_fields,
                    unmatched_fields,
                    explanation,
                });
            }
        }

        // Sort candidate matches by score descending
        candidates.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap_or(std::cmp::Ordering::Equal));
        candidates
    }

    fn match_slip(&self, slip: &SalarySlip, employees: &[Employee]) -> MatchResult {
        // If slip was already manually confirmed or rejected by user, preserve manual state!
        if slip.match_status == "MANUALLY_CONFIRMED" || slip.match_status == "MANUALLY_REJECTED" {
            return MatchResult {
                salary_slip_id: slip.id.clone(),
                status: slip.match_status.clone(),
                confidence: slip.match_confidence,
                matched_employee_id: slip.matched_employee_id.clone(),
                candidate: None,
                all_candidates: Vec::new(),
                reason: format!("Manual review state preserved ({})", slip.match_status),
            };
        }

        let candidates = self.get_candidates(slip, employees);

        if candidates.is_empty() {
            return MatchResult {
                salary_slip_id: slip.id.clone(),
                status: MatchStatus::NoMatch.as_str().to_string(),
                confidence: 0.0,
                matched_employee_id: None,
                candidate: None,
                all_candidates: Vec::new(),
                reason: "No matching employee found in database.".to_string(),
            };
        }

        // Check for conflicting candidates
        let best_candidate = candidates[0].clone();

        if candidates.len() > 1 && (candidates[0].score - candidates[1].score).abs() < 5.0 && candidates[0].score < 100.0 {
            return MatchResult {
                salary_slip_id: slip.id.clone(),
                status: MatchStatus::Conflict.as_str().to_string(),
                confidence: best_candidate.score / 100.0,
                matched_employee_id: None,
                candidate: Some(best_candidate.clone()),
                all_candidates: candidates.clone(),
                reason: format!(
                    "Conflicting candidates detected ({} and {} have similar scores).",
                    candidates[0].name, candidates[1].name
                ),
            };
        }

        let (status, confidence) = if best_candidate.score >= 100.0 {
            (MatchStatus::ExactMatch, 1.0)
        } else if best_candidate.score >= 90.0 {
            (MatchStatus::StrongMatch, best_candidate.score / 100.0)
        } else {
            (MatchStatus::PossibleMatch, best_candidate.score / 100.0)
        };

        MatchResult {
            salary_slip_id: slip.id.clone(),
            status: status.as_str().to_string(),
            confidence,
            matched_employee_id: Some(best_candidate.employee_db_id.clone()),
            candidate: Some(best_candidate),
            all_candidates: candidates,
            reason: format!("Matched with confidence {:.0}%", confidence * 100.0),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_employee(id: &str, emp_code: &str, name: &str, email: &str, phone: &str) -> Employee {
        Employee {
            id: id.to_string(),
            employee_id: emp_code.to_string(),
            name: name.to_string(),
            phone: Some(phone.to_string()),
            whatsapp_number: None,
            email: Some(email.to_string()),
            department: Some("Engineering".to_string()),
            designation: Some("Developer".to_string()),
            created_at: "1000".to_string(),
            updated_at: "1000".to_string(),
        }
    }

    fn create_test_slip(id: &str, emp_code: Option<&str>, name: Option<&str>, email: Option<&str>, phone: Option<&str>) -> SalarySlip {
        SalarySlip {
            id: id.to_string(),
            file_path: format!("/path/{}.pdf", id),
            file_name: format!("{}.pdf", id),
            file_hash: format!("hash-{}", id),
            detected_employee_id: emp_code.map(|s| s.to_string()),
            detected_name: name.map(|s| s.to_string()),
            detected_phone: phone.map(|s| s.to_string()),
            detected_email: email.map(|s| s.to_string()),
            extraction_method: "TEXT_EMBEDDED".to_string(),
            extracted_text: None,
            match_confidence: 0.0,
            match_status: "UNMATCHED".to_string(),
            duplicate_of_id: None,
            ocr_confidence: None,
            ocr_processed_at: None,
            ocr_error: None,
            matched_employee_id: None,
            match_reason: None,
            matched_at: None,
            reviewed_at: None,
            reviewed_by: None,
            review_note: None,
            created_at: "1000".to_string(),
            updated_at: "1000".to_string(),
        }
    }

    #[test]
    fn test_exact_employee_id_matching() {
        let emp = create_test_employee("emp-1", "EMP1024", "Rahul Kumar", "rahul@example.com", "+91 9876543210");
        let slip = create_test_slip("slip-1", Some("EMP1024"), None, None, None);
        let matcher = StandardMatcher::new();

        let res = matcher.match_slip(&slip, &[emp]);
        assert_eq!(res.status, "EXACT_MATCH");
        assert_eq!(res.confidence, 1.0);
        assert_eq!(res.matched_employee_id, Some("emp-1".to_string()));
    }

    #[test]
    fn test_exact_email_matching() {
        let emp = create_test_employee("emp-2", "EMP1025", "Priya Patel", "priya@example.com", "+91 9123456789");
        let slip = create_test_slip("slip-2", None, None, Some("priya@example.com"), None);
        let matcher = StandardMatcher::new();

        let res = matcher.match_slip(&slip, &[emp]);
        assert_eq!(res.status, "STRONG_MATCH");
        assert_eq!(res.confidence, 0.95);
        assert_eq!(res.matched_employee_id, Some("emp-2".to_string()));
    }

    #[test]
    fn test_exact_phone_matching() {
        let emp = create_test_employee("emp-3", "EMP1026", "Aarav Sharma", "aarav@example.com", "+91 9876543210");
        let slip = create_test_slip("slip-3", None, None, None, Some("+91 9876543210"));
        let matcher = StandardMatcher::new();

        let res = matcher.match_slip(&slip, &[emp]);
        assert_eq!(res.status, "STRONG_MATCH");
        assert_eq!(res.confidence, 0.90);
        assert_eq!(res.matched_employee_id, Some("emp-3".to_string()));
    }

    #[test]
    fn test_no_match_found() {
        let emp = create_test_employee("emp-4", "EMP1027", "Dev Singh", "dev@example.com", "+91 9999999999");
        let slip = create_test_slip("slip-4", Some("NONEXISTENT"), None, None, None);
        let matcher = StandardMatcher::new();

        let res = matcher.match_slip(&slip, &[emp]);
        assert_eq!(res.status, "NO_MATCH");
        assert_eq!(res.confidence, 0.0);
        assert_eq!(res.matched_employee_id, None);
    }
}
