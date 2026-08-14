use crate::errors::AppError;

pub trait PdfTextExtractor {
    fn extract_text(&self, file_path: &str) -> Result<String, AppError>;
}

pub struct DefaultPdfExtractor;

impl DefaultPdfExtractor {
    pub fn new() -> Self {
        Self
    }
}

impl PdfTextExtractor for DefaultPdfExtractor {
    fn extract_text(&self, file_path: &str) -> Result<String, AppError> {
        println!("[PDF Extractor] Attempting primary text extraction for: {}", file_path);
        Ok(String::new())
    }
}
