use regex::Regex;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ParsedPdfData {
    pub employee_id: Option<String>,
    pub name: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
}

pub trait DocumentParser {
    fn parse_text(&self, text: &str) -> Result<ParsedPdfData, String>;
}

pub struct DefaultDocumentParser;

impl DefaultDocumentParser {
    pub fn new() -> Self {
        Self
    }

    pub fn normalize_text(text: &str) -> String {
        let mut normalized = text.replace("\r\n", "\n").replace('\r', "\n");
        // Normalize multiple horizontal spaces/tabs
        let space_re = Regex::new(r"[ \t]+").unwrap();
        normalized = space_re.replace_all(&normalized, " ").to_string();
        normalized
    }
}

impl DocumentParser for DefaultDocumentParser {
    fn parse_text(&self, text: &str) -> Result<ParsedPdfData, String> {
        let normalized = Self::normalize_text(text);

        let mut employee_id = None;
        let mut name = None;
        let mut email = None;
        let mut phone = None;

        // 1. Extract Email
        let email_re = Regex::new(r"(?i)\b([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})\b").unwrap();
        if let Some(caps) = email_re.captures(&normalized) {
            email = Some(caps[1].to_string());
        }

        // 2. Extract Phone Number
        let phone_label_re = Regex::new(r"(?i)(?:phone|mobile|contact)(?:\s*number|\s*no)?\s*[:\-\s]\s*(\+?[0-9\s\-\(\)]{8,15})").unwrap();
        if let Some(caps) = phone_label_re.captures(&normalized) {
            let raw_p = caps[1].trim();
            let clean_p = raw_p.replace([' ', '-', '(', ')'], "");
            if clean_p.len() >= 8 {
                phone = Some(raw_p.to_string());
            }
        }

        // 3. Extract Employee ID
        let emp_id_re = Regex::new(r"(?i)(?:employee\s*(?:id|code|no|number)|emp\s*(?:id|code)|staff\s*(?:id|number))\s*[:\-\s]\s*([A-Za-z0-9\-_]+)").unwrap();
        if let Some(caps) = emp_id_re.captures(&normalized) {
            let id_val = caps[1].trim().to_string();
            if !id_val.is_empty() && id_val.len() <= 30 {
                employee_id = Some(id_val);
            }
        } else {
            // Check multiline pattern (label on line 1, value on line 2)
            let emp_id_multiline_re = Regex::new(r"(?i)(?:employee\s*(?:id|code|no|number)|emp\s*(?:id|code))\s*\n\s*([A-Za-z0-9\-_]+)").unwrap();
            if let Some(caps) = emp_id_multiline_re.captures(&normalized) {
                employee_id = Some(caps[1].trim().to_string());
            }
        }

        // 4. Extract Employee Name
        let name_re = Regex::new(r"(?i)(?:employee\s*name|full\s*name|name\s*of\s*employee|employee|name)\s*[:\-\s]\s*([A-Za-z\s\.\'\-]+)").unwrap();
        if let Some(caps) = name_re.captures(&normalized) {
            let candidate = caps[1].lines().next().unwrap_or("").trim();
            let clean_name = candidate.split(&['\n', '\t'][..]).next().unwrap_or("").trim();
            if !clean_name.is_empty() && clean_name.len() >= 2 && clean_name.len() <= 50 {
                let first_word = clean_name.split_whitespace().next().unwrap_or("").to_lowercase();
                let is_false_positive = matches!(
                    first_word.as_str(),
                    "department" | "designation" | "month" | "year" | "salary" | "bank" | "pan" | "pf" | "esi" | "code" | "id" | "number" | "no" | "gross" | "net" | "pay" | "basic"
                );
                if !is_false_positive {
                    name = Some(clean_name.to_string());
                }
            }
        }

        Ok(ParsedPdfData {
            employee_id,
            name,
            phone,
            email,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_employee_id() {
        let parser = DefaultDocumentParser::new();
        let res = parser.parse_text("Employee ID: EMP1024\nDepartment: Engineering").unwrap();
        assert_eq!(res.employee_id, Some("EMP1024".to_string()));
    }

    #[test]
    fn test_parse_emp_code() {
        let parser = DefaultDocumentParser::new();
        let res = parser.parse_text("Emp Code - 5042\nName: Alice").unwrap();
        assert_eq!(res.employee_id, Some("5042".to_string()));
    }

    #[test]
    fn test_parse_employee_number() {
        let parser = DefaultDocumentParser::new();
        let res = parser.parse_text("Employee Number: EMP-9088").unwrap();
        assert_eq!(res.employee_id, Some("EMP-9088".to_string()));
    }

    #[test]
    fn test_parse_multiline_employee_id() {
        let parser = DefaultDocumentParser::new();
        let res = parser.parse_text("Employee ID\nEMP999\nName: Bob").unwrap();
        assert_eq!(res.employee_id, Some("EMP999".to_string()));
    }

    #[test]
    fn test_parse_name_email_phone() {
        let parser = DefaultDocumentParser::new();
        let text = "Employee Name: Rahul Sharma\nEmail: rahul@example.com\nMobile: +91 9876543210";
        let res = parser.parse_text(text).unwrap();
        assert_eq!(res.name, Some("Rahul Sharma".to_string()));
        assert_eq!(res.email, Some("rahul@example.com".to_string()));
        assert_eq!(res.phone, Some("+91 9876543210".to_string()));
    }

    #[test]
    fn test_false_positive_name_prevention() {
        let parser = DefaultDocumentParser::new();
        let text = "Name: Department: Sales";
        let res = parser.parse_text(text).unwrap();
        assert_eq!(res.name, None);
    }
}
