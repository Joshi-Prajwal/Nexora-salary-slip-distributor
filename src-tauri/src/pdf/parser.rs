use regex::Regex;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ParsedPdfData {
    pub employee_id: Option<String>,
    pub name: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub department: Option<String>,
    pub designation: Option<String>,
    pub employer: Option<String>,
    pub basic_salary: Option<String>,
    pub gross_salary: Option<String>,
    pub net_salary: Option<String>,
    pub month: Option<String>,
    pub year: Option<String>,
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
        let mut department = None;
        let mut designation = None;
        let mut employer = None;
        let mut basic_salary = None;
        let mut gross_salary = None;
        let mut net_salary = None;
        let mut month = None;
        let mut year = None;

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

        // 5. Extract Department
        let dept_re = Regex::new(r"(?i)(?:department|dept)\s*[:\-\s]\s*([A-Za-z0-9\s&_\-]+)").unwrap();
        if let Some(caps) = dept_re.captures(&normalized) {
            let d = caps[1].lines().next().unwrap_or("").trim();
            if !d.is_empty() && d.len() <= 40 {
                department = Some(d.to_string());
            }
        }

        // 6. Extract Designation
        let desig_re = Regex::new(r"(?i)(?:designation|role|job\s*title|position)\s*[:\-\s]\s*([A-Za-z0-9\s&_\-]+)").unwrap();
        if let Some(caps) = desig_re.captures(&normalized) {
            let des = caps[1].lines().next().unwrap_or("").trim();
            if !des.is_empty() && des.len() <= 50 {
                designation = Some(des.to_string());
            }
        }

        // 7. Extract Employer / Organization
        let emp_org_re = Regex::new(r"(?i)(?:company|employer|organization|firm)\s*[:\-\s]\s*([A-Za-z0-9\s&_\-\.]+)").unwrap();
        if let Some(caps) = emp_org_re.captures(&normalized) {
            let o = caps[1].lines().next().unwrap_or("").trim();
            if !o.is_empty() && o.len() <= 60 {
                employer = Some(o.to_string());
            }
        }

        // 8. Extract Salary Figures (Basic, Gross, Net)
        let basic_re = Regex::new(r"(?i)(?:basic(?:\s*salary|\s*pay)?)\s*[:\-\s]\s*([₹$€£]?\s*[0-9,]+(?:\.[0-9]{2})?)").unwrap();
        if let Some(caps) = basic_re.captures(&normalized) {
            basic_salary = Some(caps[1].trim().to_string());
        }

        let gross_re = Regex::new(r"(?i)(?:gross(?:\s*salary|\s*pay|\s*earnings)?)\s*[:\-\s]\s*([₹$€£]?\s*[0-9,]+(?:\.[0-9]{2})?)").unwrap();
        if let Some(caps) = gross_re.captures(&normalized) {
            gross_salary = Some(caps[1].trim().to_string());
        }

        let net_re = Regex::new(r"(?i)(?:net(?:\s*salary|\s*pay|\s*amount|\s*take\s*home)?)\s*[:\-\s]\s*([₹$€£]?\s*[0-9,]+(?:\.[0-9]{2})?)").unwrap();
        if let Some(caps) = net_re.captures(&normalized) {
            net_salary = Some(caps[1].trim().to_string());
        }

        // 9. Extract Month & Year
        let month_re = Regex::new(r"(?i)\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b").unwrap();
        if let Some(caps) = month_re.captures(&normalized) {
            let m = caps[1].to_lowercase();
            month = Some(match m.as_str() {
                "january" | "jan" => "January".to_string(),
                "february" | "feb" => "February".to_string(),
                "march" | "mar" => "March".to_string(),
                "april" | "apr" => "April".to_string(),
                "may" => "May".to_string(),
                "june" | "jun" => "June".to_string(),
                "july" | "jul" => "July".to_string(),
                "august" | "aug" => "August".to_string(),
                "september" | "sep" => "September".to_string(),
                "october" | "oct" => "October".to_string(),
                "november" | "nov" => "November".to_string(),
                "december" | "dec" => "December".to_string(),
                _ => caps[1].to_string(),
            });
        }

        let year_re = Regex::new(r"\b(20[2-3][0-9])\b").unwrap();
        if let Some(caps) = year_re.captures(&normalized) {
            year = Some(caps[1].to_string());
        }

        Ok(ParsedPdfData {
            employee_id,
            name,
            phone,
            email,
            department,
            designation,
            employer,
            basic_salary,
            gross_salary,
            net_salary,
            month,
            year,
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
