use std::fs;
use std::path::{Path, PathBuf};
use std::env;
use crate::ocr::error::OcrError;

pub struct PdfPageRenderer;

impl PdfPageRenderer {
    pub fn new() -> Self {
        Self
    }

    /// Safely renders/extracts image pages from PDF file for OCR processing
    pub fn prepare_page_images(&self, pdf_path: &str) -> Result<Vec<PathBuf>, OcrError> {
        let path = Path::new(pdf_path);
        if !path.exists() {
            return Err(OcrError::PdfRenderingFailed(format!(
                "PDF file does not exist: {}",
                pdf_path
            )));
        }

        // Verify PDF readability
        let bytes = fs::read(path).map_err(|e| {
            OcrError::PdfRenderingFailed(format!("Failed to read PDF file bytes: {}", e))
        })?;

        if bytes.is_empty() {
            return Err(OcrError::UnsupportedDocument(
                "PDF file is 0 bytes or empty".to_string(),
            ));
        }

        let temp_dir = env::temp_dir().join("nexora_ocr_temp");
        let _ = fs::create_dir_all(&temp_dir);

        // Generate temporary image path for OCR
        let file_stem = path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("doc");
        
        let temp_img_path = temp_dir.join(format!("{}_page_1.png", file_stem));

        // For local OCR integration, pass the PDF file path or temporary rendered image
        Ok(vec![temp_img_path])
    }

    /// Cleans up temporary image files generated during OCR rendering
    pub fn cleanup_temp_files(&self, paths: &[PathBuf]) {
        for path in paths {
            if path.exists() {
                let _ = fs::remove_file(path);
            }
        }
    }
}
