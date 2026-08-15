use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum DocumentType {
    SalarySlip,
    PossibleSalarySlip,
    NotSalarySlip,
    Unknown,
}

impl DocumentType {
    pub fn as_str(&self) -> &'static str {
        match self {
            DocumentType::SalarySlip => "SALARY_SLIP",
            DocumentType::PossibleSalarySlip => "POSSIBLE_SALARY_SLIP",
            DocumentType::NotSalarySlip => "NOT_SALARY_SLIP",
            DocumentType::Unknown => "UNKNOWN",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClassificationResult {
    pub document_type: DocumentType,
    pub confidence: f64,
}

pub struct SalarySlipClassifier;

impl SalarySlipClassifier {
    pub fn classify(text: &str, file_name: &str) -> ClassificationResult {
        let lower_text = text.to_lowercase();
        let lower_file = file_name.to_lowercase();

        let mut score: f64 = 0.0;

        // Filename signals
        if lower_file.contains("salary") || lower_file.contains("pay") || lower_file.contains("slip") {
            score += 25.0;
        }

        // Key salary slip terms
        let strong_terms = ["salary slip", "payslip", "pay slip", "pay summary", "salary statement"];
        for st in &strong_terms {
            if lower_text.contains(st) {
                score += 40.0;
                break;
            }
        }

        let supporting_terms = [
            "basic salary", "gross salary", "net salary", "net pay", "take home",
            "earnings", "deductions", "basic", "hra", "pf", "esi", "pan",
            "employee id", "employee code", "emp id", "emp code", "designation", "department",
        ];

        let mut matched_count = 0;
        for kw in &supporting_terms {
            if lower_text.contains(kw) {
                matched_count += 1;
            }
        }

        score += (matched_count as f64) * 8.0;

        if score > 100.0 {
            score = 100.0;
        }

        let document_type = if score >= 60.0 {
            DocumentType::SalarySlip
        } else if score >= 25.0 {
            DocumentType::PossibleSalarySlip
        } else if text.trim().is_empty() {
            DocumentType::Unknown
        } else {
            DocumentType::NotSalarySlip
        };

        ClassificationResult {
            document_type,
            confidence: score,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_classify_strong_salary_slip() {
        let text = "Salary Slip for January 2026\nBasic Salary: 50000\nNet Pay: 45000";
        let res = SalarySlipClassifier::classify(text, "203-Dr L B Singh.pdf");
        assert_eq!(res.document_type, DocumentType::SalarySlip);
        assert!(res.confidence >= 60.0);
    }

    #[test]
    fn test_classify_filename_only() {
        let text = "";
        let res = SalarySlipClassifier::classify(text, "Salary_Slip_Jan_2026.pdf");
        assert_eq!(res.document_type, DocumentType::PossibleSalarySlip);
    }
}
