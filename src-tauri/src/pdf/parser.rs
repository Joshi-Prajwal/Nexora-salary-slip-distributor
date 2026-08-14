use crate::errors::AppError;

pub struct ParsedPdfData {
    pub employee_id: Option<String>,
    pub name: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
}

pub trait DocumentParser {
    fn parse_text(&self, text: &str) -> Result<ParsedPdfData, AppError>;
}

pub struct DefaultDocumentParser;

impl DefaultDocumentParser {
    pub fn new() -> Self {
        Self
    }
}

impl DocumentParser for DefaultDocumentParser {
    fn parse_text(&self, _text: &str) -> Result<ParsedPdfData, AppError> {
        Ok(ParsedPdfData {
            employee_id: None,
            name: None,
            phone: None,
            email: None,
        })
    }
}
