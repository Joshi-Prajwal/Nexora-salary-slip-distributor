use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TextQualityMetrics {
    pub character_count: usize,
    pub alphanumeric_count: usize,
    pub alphabetic_count: usize,
    pub digit_count: usize,
    pub word_count: usize,
    pub line_count: usize,
    pub printable_ratio: f64,
    pub keyword_score: usize,
    pub is_usable: bool,
}

pub struct TextQualityEvaluator;

impl TextQualityEvaluator {
    pub fn evaluate(text: &str) -> TextQualityMetrics {
        let trimmed = text.trim();
        let character_count = trimmed.chars().count();
        if character_count == 0 {
            return TextQualityMetrics {
                character_count: 0,
                alphanumeric_count: 0,
                alphabetic_count: 0,
                digit_count: 0,
                word_count: 0,
                line_count: 0,
                printable_ratio: 0.0,
                keyword_score: 0,
                is_usable: false,
            };
        }

        let mut alphanumeric_count = 0;
        let mut alphabetic_count = 0;
        let mut digit_count = 0;
        let mut printable_count = 0;

        for ch in trimmed.chars() {
            if ch.is_alphanumeric() {
                alphanumeric_count += 1;
            }
            if ch.is_alphabetic() {
                alphabetic_count += 1;
            }
            if ch.is_digit(10) {
                digit_count += 1;
            }
            if !ch.is_control() {
                printable_count += 1;
            }
        }

        let word_count = trimmed.split_whitespace().count();
        let line_count = trimmed.lines().filter(|l| !l.trim().is_empty()).count();
        let printable_ratio = printable_count as f64 / character_count as f64;

        let lower = trimmed.to_lowercase();
        let salary_keywords = [
            "salary", "pay", "slip", "payslip", "basic", "gross", "net",
            "employee", "emp", "earnings", "deductions", "department",
            "designation", "month", "year", "bank", "pan", "pf", "esi", "pf no",
        ];

        let mut keyword_score = 0;
        for kw in &salary_keywords {
            if lower.contains(kw) {
                keyword_score += 1;
            }
        }

        // Quality Gate: Text is considered usable if:
        // 1. Character count >= 30
        // 2. Alphabetic count >= 10
        // 3. Printable ratio >= 0.8
        // 4. Keyword score >= 1 OR (character_count >= 50 && word_count >= 5)
        let is_usable = character_count >= 30
            && alphabetic_count >= 10
            && printable_ratio >= 0.75
            && (keyword_score >= 1 || (character_count >= 50 && word_count >= 5));

        TextQualityMetrics {
            character_count,
            alphanumeric_count,
            alphabetic_count,
            digit_count,
            word_count,
            line_count,
            printable_ratio,
            keyword_score,
            is_usable,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_empty_text_quality() {
        let metrics = TextQualityEvaluator::evaluate("");
        assert!(!metrics.is_usable);
        assert_eq!(metrics.character_count, 0);
    }

    #[test]
    fn test_high_quality_salary_text() {
        let text = "Salary Slip for January 2026\nEmployee ID: 101\nName: Ashwini Kulkarni\nBasic Salary: 50000";
        let metrics = TextQualityEvaluator::evaluate(text);
        assert!(metrics.is_usable);
        assert!(metrics.keyword_score >= 3);
    }

    #[test]
    fn test_corrupted_or_sparse_text() {
        let text = "a \n \t \x00\x01 c";
        let metrics = TextQualityEvaluator::evaluate(text);
        assert!(!metrics.is_usable);
    }
}
