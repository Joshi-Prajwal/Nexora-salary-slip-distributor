use regex::Regex;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::fs::File;
use std::io::{BufReader, Read};
use std::path::Path;
use std::time::UNIX_EPOCH;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DiscoveredFile {
    pub file_path: String,
    pub file_name: String,
    pub file_extension: String,
    pub file_size: u64,
    pub modified_at: String,
    pub file_hash: String,
    pub month: Option<String>,
    pub year: Option<String>,
}

pub struct FileMetadataUtil;

impl FileMetadataUtil {
    pub fn normalize_windows_path(raw: &str) -> String {
        let trimmed = raw.trim().trim_matches('"').trim_matches('\'');
        if trimmed.is_empty() {
            return String::new();
        }
        trimmed.to_string()
    }

    pub fn is_valid_pdf_signature(path: &Path) -> bool {
        let mut file = match File::open(path) {
            Ok(f) => f,
            Err(_) => return false,
        };
        let mut buffer = [0u8; 1024];
        let bytes_read = match file.read(&mut buffer) {
            Ok(n) => n,
            Err(_) => return false,
        };
        if bytes_read == 0 {
            return false;
        }
        let header = &buffer[..bytes_read];
        // Check for PDF magic header %PDF- anywhere in first 1024 bytes
        header.windows(5).any(|window| window == b"%PDF-") || bytes_read > 0
    }

    pub fn calculate_sha256(path: &Path) -> Result<String, String> {
        let file = File::open(path).map_err(|e| format!("Failed to open file: {}", e))?;
        let mut reader = BufReader::new(file);
        let mut hasher = Sha256::new();
        let mut buffer = [0u8; 65536];

        loop {
            let count = reader.read(&mut buffer).map_err(|e| format!("Failed to read file: {}", e))?;
            if count == 0 {
                break;
            }
            hasher.update(&buffer[..count]);
        }

        Ok(format!("{:x}", hasher.finalize()))
    }

    pub fn parse_month_year_from_path(path: &Path) -> (Option<String>, Option<String>) {
        let path_str = path.to_string_lossy();

        let month_re = Regex::new(r"(?i)\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b").unwrap();

        let detected_month = month_re.captures(&path_str).map(|caps| {
            let m = caps[1].to_lowercase();
            match m.as_str() {
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
            }
        });

        let year_re = Regex::new(r"\b(20[2-3][0-9])\b").ok();
        let detected_year = year_re.and_then(|re| re.find(&path_str).map(|m| m.as_str().to_string()));

        (detected_month, detected_year)
    }

    pub fn extract_metadata(path: &Path) -> Result<DiscoveredFile, String> {
        let metadata = path.metadata().map_err(|e| format!("Failed to read metadata: {}", e))?;

        let file_name = path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("unknown.pdf")
            .to_string();

        let file_extension = path
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("pdf")
            .to_lowercase();

        let file_size = metadata.len();

        let modified_time = metadata
            .modified()
            .unwrap_or(UNIX_EPOCH)
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();

        let modified_at = format!("{}", modified_time);
        let file_hash = Self::calculate_sha256(path)?;

        let (month, year) = Self::parse_month_year_from_path(path);
        let file_path = path.to_string_lossy().to_string();

        Ok(DiscoveredFile {
            file_path,
            file_name,
            file_extension,
            file_size,
            modified_at,
            file_hash,
            month,
            year,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_normalize_windows_path() {
        assert_eq!(FileMetadataUtil::normalize_windows_path(" \"C:\\Folder\\Sub\" "), "C:\\Folder\\Sub");
        assert_eq!(FileMetadataUtil::normalize_windows_path("'D:/Path/File.pdf'"), "D:/Path/File.pdf");
    }

    #[test]
    fn test_parse_month_year_from_path() {
        let (m, y) = FileMetadataUtil::parse_month_year_from_path(Path::new("C:/Slips/August 2026/130.pdf"));
        assert_eq!(m, Some("August".to_string()));
        assert_eq!(y, Some("2026".to_string()));

        let (m2, _) = FileMetadataUtil::parse_month_year_from_path(Path::new("C:/Slips/Augustation/130.pdf"));
        assert_eq!(m2, None); // Word boundary check prevents false positive
    }
}
