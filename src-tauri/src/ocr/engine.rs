use crate::errors::AppError;

pub trait OcrEngine {
    fn extract_text_from_image(&self, image_path: &str) -> Result<String, AppError>;
}

pub struct FallbackOcrEngine;

impl FallbackOcrEngine {
    pub fn new() -> Self {
        Self
    }
}

impl OcrEngine for FallbackOcrEngine {
    fn extract_text_from_image(&self, image_path: &str) -> Result<String, AppError> {
        println!("[OCR Engine] Fallback OCR requested for image: {}", image_path);
        Ok(String::new())
    }
}
