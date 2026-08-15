use serde::{Deserialize, Serialize};
use std::path::Path;
use walkdir::WalkDir;
use crate::filesystem::file_metadata::{DiscoveredFile, FileMetadataUtil};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanError {
    pub path: String,
    pub error_kind: String,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FolderScanDiagnostics {
    pub selected_path: String,
    pub display_name: String,
    pub exists: bool,
    pub is_directory: bool,
    pub readable: bool,
    pub pdf_count: usize,
    pub directories_scanned: usize,
    pub files_scanned: usize,
    pub database_records: usize,
    pub scan_errors: Vec<ScanError>,
    pub files: Vec<DiscoveredFile>,
}

pub struct FolderScanner;

impl FolderScanner {
    pub fn new() -> Self {
        Self
    }

    pub fn scan_directory(&self, folder_path: &str) -> Result<(Vec<DiscoveredFile>, FolderScanDiagnostics), String> {
        let clean_path = FileMetadataUtil::normalize_windows_path(folder_path);
        if clean_path.is_empty() {
            return Err("Selected folder path is empty.".to_string());
        }

        let path = Path::new(&clean_path);
        if !path.exists() {
            return Err(format!("Selected folder path does not exist: {}", clean_path));
        }
        if !path.is_dir() {
            return Err(format!("Selected path is not a directory: {}", clean_path));
        }

        self.scan_paths(&[clean_path])
    }

    pub fn scan_paths(&self, paths: &[String]) -> Result<(Vec<DiscoveredFile>, FolderScanDiagnostics), String> {
        if paths.is_empty() {
            return Err("No input paths provided for scanning.".to_string());
        }

        let first_normalized = FileMetadataUtil::normalize_windows_path(&paths[0]);
        let primary_path = Path::new(&first_normalized);
        let display_name = if paths.len() == 1 {
            primary_path
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("SalarySlips")
                .to_string()
        } else {
            format!("Import Batch ({} items)", paths.len())
        };

        let mut discovered: Vec<DiscoveredFile> = Vec::new();
        let mut directories_scanned = 0;
        let mut files_scanned = 0;
        let mut scan_errors: Vec<ScanError> = Vec::new();
        let mut is_readable = true;

        for raw_p in paths {
            let clean_p = FileMetadataUtil::normalize_windows_path(raw_p);
            if clean_p.is_empty() {
                continue;
            }
            let p = Path::new(&clean_p);

            if !p.exists() {
                scan_errors.push(ScanError {
                    path: clean_p.clone(),
                    error_kind: "NotFound".to_string(),
                    message: format!("Path does not exist: {}", clean_p),
                });
                continue;
            }

            if p.is_dir() {
                directories_scanned += 1;
                for entry_res in WalkDir::new(p).follow_links(false).into_iter() {
                    let entry = match entry_res {
                        Ok(e) => e,
                        Err(err) => {
                            is_readable = false;
                            scan_errors.push(ScanError {
                                path: err.path().map(|p| p.to_string_lossy().to_string()).unwrap_or_else(|| clean_p.clone()),
                                error_kind: "PermissionDenied".to_string(),
                                message: format!("Access error during directory traversal: {}", err),
                            });
                            continue;
                        }
                    };

                    let entry_path = entry.path();
                    if entry.file_type().is_dir() {
                        directories_scanned += 1;
                    } else if entry.file_type().is_file() {
                        files_scanned += 1;
                        if let Some(ext) = entry_path.extension() {
                            if ext.to_string_lossy().eq_ignore_ascii_case("pdf") {
                                match FileMetadataUtil::extract_metadata(entry_path) {
                                    Ok(metadata) => discovered.push(metadata),
                                    Err(e) => scan_errors.push(ScanError {
                                        path: entry_path.to_string_lossy().to_string(),
                                        error_kind: "MetadataError".to_string(),
                                        message: format!("Failed to read PDF metadata: {}", e),
                                    }),
                                }
                            }
                        }
                    }
                }
            } else if p.is_file() {
                files_scanned += 1;
                if let Some(ext) = p.extension() {
                    if ext.to_string_lossy().eq_ignore_ascii_case("pdf") {
                        match FileMetadataUtil::extract_metadata(p) {
                            Ok(metadata) => discovered.push(metadata),
                            Err(e) => scan_errors.push(ScanError {
                                path: clean_p.clone(),
                                error_kind: "MetadataError".to_string(),
                                message: format!("Failed to read PDF metadata: {}", e),
                            }),
                        }
                    } else {
                        scan_errors.push(ScanError {
                            path: clean_p.clone(),
                            error_kind: "UnsupportedFileType".to_string(),
                            message: format!("Selected file is not a PDF: {}", clean_p),
                        });
                    }
                }
            }
        }

        let diagnostics = FolderScanDiagnostics {
            selected_path: first_normalized.clone(),
            display_name,
            exists: primary_path.exists(),
            is_directory: primary_path.is_dir(),
            readable: is_readable,
            pdf_count: discovered.len(),
            directories_scanned,
            files_scanned,
            database_records: 0,
            scan_errors,
            files: discovered.clone(),
        };

        Ok((discovered, diagnostics))
    }

    pub fn diagnose_path(&self, folder_path: &str, db_count: usize) -> FolderScanDiagnostics {
        let clean = FileMetadataUtil::normalize_windows_path(folder_path);
        let p = Path::new(&clean);
        let exists = p.exists();
        let is_directory = p.is_dir();
        let display_name = p.file_name().and_then(|n| n.to_str()).unwrap_or("SalarySlips").to_string();

        if !exists || !is_directory {
            return FolderScanDiagnostics {
                selected_path: clean.clone(),
                display_name,
                exists,
                is_directory,
                readable: false,
                pdf_count: 0,
                directories_scanned: 0,
                files_scanned: 0,
                database_records: db_count,
                scan_errors: vec![ScanError {
                    path: clean.clone(),
                    error_kind: if !exists { "NotFound" } else { "NotADirectory" }.to_string(),
                    message: if !exists { "Folder path does not exist on disk." } else { "Path is a file, not a directory." }.to_string(),
                }],
                files: Vec::new(),
            };
        }

        match self.scan_directory(&clean) {
            Ok((_, mut diag)) => {
                diag.database_records = db_count;
                diag
            }
            Err(err) => FolderScanDiagnostics {
                selected_path: clean.clone(),
                display_name,
                exists: true,
                is_directory: true,
                readable: false,
                pdf_count: 0,
                directories_scanned: 0,
                files_scanned: 0,
                database_records: db_count,
                scan_errors: vec![ScanError {
                    path: clean,
                    error_kind: "ScanFailed".to_string(),
                    message: err,
                }],
                files: Vec::new(),
            },
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs::{create_dir_all, File};
    use std::io::Write;

    #[test]
    fn test_recursive_pdf_folder_scanning() {
        let temp_dir = std::env::temp_dir().join(format!("nexora_test_scan_{}", uuid_test()));
        let sub_dir = temp_dir.join("August 2026");
        create_dir_all(&sub_dir).unwrap();

        let pdf1 = sub_dir.join("emp1.pdf");
        let pdf2 = sub_dir.join("emp2.PDF");
        let txt1 = sub_dir.join("readme.txt");

        File::create(&pdf1).unwrap().write_all(b"%PDF-1.4 test 1").unwrap();
        File::create(&pdf2).unwrap().write_all(b"%PDF-1.4 test 2").unwrap();
        File::create(&txt1).unwrap().write_all(b"not a pdf").unwrap();

        let scanner = FolderScanner::new();
        let (results, diag) = scanner.scan_directory(temp_dir.to_str().unwrap()).unwrap();

        assert_eq!(results.len(), 2);
        assert_eq!(diag.pdf_count, 2);
        assert!(diag.directories_scanned >= 2);
        assert_eq!(diag.files_scanned, 3);
        assert!(results.iter().any(|f| f.file_name == "emp1.pdf"));
        assert!(results.iter().any(|f| f.file_name == "emp2.PDF"));
        assert_eq!(results[0].month, Some("August".to_string()));
        assert_eq!(results[0].year, Some("2026".to_string()));

        let _ = std::fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_scan_paths_mixed_files_and_folders() {
        let temp_dir = std::env::temp_dir().join(format!("nexora_mixed_scan_{}", uuid_test()));
        let sub_dir = temp_dir.join("September 2026");
        create_dir_all(&sub_dir).unwrap();

        let pdf1 = temp_dir.join("root_emp.pdf");
        let pdf2 = sub_dir.join("sub_emp.PDF");
        File::create(&pdf1).unwrap().write_all(b"%PDF-1.4 Root").unwrap();
        File::create(&pdf2).unwrap().write_all(b"%PDF-1.4 Sub").unwrap();

        let scanner = FolderScanner::new();
        let paths = vec![
            pdf1.to_str().unwrap().to_string(),
            sub_dir.to_str().unwrap().to_string(),
        ];
        let (results, diag) = scanner.scan_paths(&paths).unwrap();

        assert_eq!(results.len(), 2);
        assert_eq!(diag.pdf_count, 2);

        let _ = std::fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_root_level_pdf_discovery() {
        let temp_dir = std::env::temp_dir().join(format!("nexora_root_scan_{}", uuid_test()));
        create_dir_all(&temp_dir).unwrap();

        let pdf1 = temp_dir.join("203-Dr L B Singh.pdf");
        let pdf2 = temp_dir.join("502-Aravind S Kannur.PDF");
        let txt1 = temp_dir.join("notes.txt");

        File::create(&pdf1).unwrap().write_all(b"%PDF-1.4 Dr Singh").unwrap();
        File::create(&pdf2).unwrap().write_all(b"%PDF-1.4 Aravind").unwrap();
        File::create(&txt1).unwrap().write_all(b"text file").unwrap();

        let scanner = FolderScanner::new();
        let (results, diag) = scanner.scan_directory(temp_dir.to_str().unwrap()).unwrap();

        assert_eq!(results.len(), 2);
        assert_eq!(diag.pdf_count, 2);
        assert_eq!(diag.files_scanned, 3);
        assert!(results.iter().any(|f| f.file_name == "203-Dr L B Singh.pdf"));
        assert!(results.iter().any(|f| f.file_name == "502-Aravind S Kannur.PDF"));

        let _ = std::fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_windows_path_handling() {
        let temp_dir = std::env::temp_dir().join(format!("nexora_win_path_{}", uuid_test()));
        create_dir_all(&temp_dir).unwrap();

        let pdf1 = temp_dir.join("144-Nusrat Anjum.pdf");
        File::create(&pdf1).unwrap().write_all(b"%PDF-1.4 Nusrat").unwrap();

        let scanner = FolderScanner::new();
        let raw_path = format!("\"{}\"", temp_dir.to_str().unwrap());
        let (results, diag) = scanner.scan_directory(&raw_path).unwrap();

        assert_eq!(results.len(), 1);
        assert_eq!(diag.pdf_count, 1);

        let _ = std::fs::remove_dir_all(&temp_dir);
    }

    fn uuid_test() -> String {
        use std::time::{SystemTime, UNIX_EPOCH};
        format!("{}", SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos())
    }
}
