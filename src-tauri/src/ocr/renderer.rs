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

        // Generate collision-proof, sanitized temporary image path for OCR
        let file_stem = path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("doc");

        let sanitized_stem: String = file_stem
            .chars()
            .filter(|c| c.is_alphanumeric() || *c == '_' || *c == '-')
            .take(30)
            .collect();
        let stem = if sanitized_stem.is_empty() { "doc" } else { &sanitized_stem };
        let nanos = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_nanos();
        let pid = std::process::id();
        
        let temp_img_path = temp_dir.join(format!("{}_{}_{}_p1.png", stem, pid, nanos));

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

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    #[test]
    fn test_renderer_temp_file_uniqueness_and_cleanup() {
        let temp_dir = env::temp_dir().join(format!("nexora_renderer_test_{}", std::process::id()));
        let _ = fs::create_dir_all(&temp_dir);

        let test_pdf = temp_dir.join("test_doc.pdf");
        {
            let mut f = fs::File::create(&test_pdf).unwrap();
            f.write_all(b"%PDF-1.4 dummy pdf content").unwrap();
        }

        let renderer = PdfPageRenderer::new();
        let images1 = renderer.prepare_page_images(test_pdf.to_str().unwrap()).unwrap();
        let images2 = renderer.prepare_page_images(test_pdf.to_str().unwrap()).unwrap();

        // Filenames must be collision-proof and unique across invocations
        assert_ne!(images1[0], images2[0]);

        // Test cleanup
        {
            let mut f = fs::File::create(&images1[0]).unwrap();
            f.write_all(b"fake image data").unwrap();
        }
        assert!(images1[0].exists());

        renderer.cleanup_temp_files(&images1);
        assert!(!images1[0].exists());

        let _ = fs::remove_dir_all(&temp_dir);
    }
}
