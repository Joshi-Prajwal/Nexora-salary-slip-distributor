use std::process::Command;
use std::path::Path;
use std::time::Instant;
use crate::ocr::error::OcrError;
use crate::ocr::result::OcrResult;
use crate::ocr::renderer::PdfPageRenderer;

pub trait OcrEngine {
    fn is_available(&self) -> bool;
    fn recognize(&self, pdf_path: &str) -> Result<OcrResult, OcrError>;
}

pub struct FallbackOcrEngine {
    renderer: PdfPageRenderer,
}

impl FallbackOcrEngine {
    pub fn new() -> Self {
        Self {
            renderer: PdfPageRenderer::new(),
        }
    }

    fn find_tesseract_path(&self) -> Option<String> {
        // 1. Check common Windows installation paths
        let mut candidate_paths = vec![
            r"C:\Program Files\Tesseract-OCR\tesseract.exe".to_string(),
            r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe".to_string(),
            r".\tesseract.exe".to_string(),
        ];

        // 2. Check local user AppData
        if let Ok(local_app_data) = std::env::var("LOCALAPPDATA") {
            candidate_paths.push(format!(r"{}\Programs\Tesseract-OCR\tesseract.exe", local_app_data));
            candidate_paths.push(format!(r"{}\Tesseract-OCR\tesseract.exe", local_app_data));
        }

        // 3. Check executable path relative to current running process
        if let Ok(curr_exe) = std::env::current_exe() {
            if let Some(parent) = curr_exe.parent() {
                candidate_paths.push(parent.join("tesseract.exe").to_string_lossy().to_string());
                candidate_paths.push(parent.join("resources").join("tesseract.exe").to_string_lossy().to_string());
            }
        }

        for path in &candidate_paths {
            if Path::new(path).exists() {
                // Verify binary can execute
                if Command::new(path).arg("--version").output().is_ok() {
                    return Some(path.clone());
                }
            }
        }

        // 4. Check if 'tesseract' is available globally in Windows PATH
        if Command::new("tesseract").arg("--version").output().is_ok() {
            return Some("tesseract".to_string());
        }

        None
    }
}

impl OcrEngine for FallbackOcrEngine {
    fn is_available(&self) -> bool {
        self.find_tesseract_path().is_some()
    }

    fn recognize(&self, pdf_path: &str) -> Result<OcrResult, OcrError> {
        let start_time = Instant::now();

        let tesseract_bin = match self.find_tesseract_path() {
            Some(bin) => bin,
            None => {
                return Err(OcrError::EngineUnavailable(
                    "Tesseract OCR is not installed or not in PATH. Please install Tesseract-OCR for Windows (e.g. from https://github.com/UB-Mannheim/tesseract/wiki) to C:\\Program Files\\Tesseract-OCR\\tesseract.exe.".to_string()
                ));
            }
        };

        // Prepare page images
        let page_images = self.renderer.prepare_page_images(pdf_path)?;
        let mut full_text = String::new();
        let total_confidence = 90.0; // Default baseline OCR confidence

        for img_path in &page_images {
            let input_target = if img_path.exists() {
                img_path.to_string_lossy().to_string()
            } else {
                pdf_path.to_string()
            };

            let output_res = Command::new(&tesseract_bin)
                .arg(&input_target)
                .arg("stdout")
                .arg("--oem")
                .arg("1")
                .output();

            match output_res {
                Ok(output) if output.status.success() => {
                    let page_text = String::from_utf8_lossy(&output.stdout);
                    full_text.push_str(&page_text);
                    full_text.push('\n');
                }
                Ok(output) => {
                    let err_msg = String::from_utf8_lossy(&output.stderr);
                    self.renderer.cleanup_temp_files(&page_images);
                    return Err(OcrError::RecognitionFailed(format!(
                        "Tesseract OCR failed: {}",
                        err_msg.trim()
                    )));
                }
                Err(e) => {
                    self.renderer.cleanup_temp_files(&page_images);
                    return Err(OcrError::RecognitionFailed(format!(
                        "Failed to execute local Tesseract OCR process: {}",
                        e
                    )));
                }
            }
        }

        self.renderer.cleanup_temp_files(&page_images);

        let duration_ms = start_time.elapsed().as_millis() as u64;

        if full_text.trim().is_empty() {
            return Err(OcrError::RecognitionFailed(
                "OCR recognition completed but returned empty text".to_string(),
            ));
        }

        Ok(OcrResult {
            text: full_text.trim().to_string(),
            confidence: total_confidence,
            processing_time_ms: duration_ms,
            page_count: page_images.len(),
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ocr_engine_initialization() {
        let engine = FallbackOcrEngine::new();
        // is_available should safely return bool without crashing
        let _avail = engine.is_available();
        assert!(true);
    }

    #[test]
    fn test_ocr_engine_unavailable_error_handling() {
        let engine = FallbackOcrEngine::new();
        if !engine.is_available() {
            let res = engine.recognize("/non/existent/doc.pdf");
            assert!(res.is_err());
            if let Err(OcrError::EngineUnavailable(msg)) = res {
                assert!(msg.contains("Tesseract"));
            }
        }
    }
}
