use std::path::Path;

pub trait PdfTextExtractor {
    fn extract_text(&self, file_path: &str) -> Result<String, String>;
}

pub struct DefaultPdfExtractor;

impl DefaultPdfExtractor {
    pub fn new() -> Self {
        Self
    }
}

impl PdfTextExtractor for DefaultPdfExtractor {
    fn extract_text(&self, file_path: &str) -> Result<String, String> {
        let path = Path::new(file_path);
        if !path.exists() {
            return Err(format!("PDF file does not exist at path: {}", file_path));
        }

        match pdf_extract::extract_text(path) {
            Ok(raw_text) => {
                let trimmed = raw_text.trim();
                if trimmed.is_empty() {
                    Err("No embedded text could be read from this PDF file (may be image-based or empty)".to_string())
                } else {
                    Ok(trimmed.to_string())
                }
            }
            Err(e) => Err(format!("Failed to extract embedded PDF text: {}", e)),
        }
    }
}
