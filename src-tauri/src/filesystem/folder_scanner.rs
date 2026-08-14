use std::path::Path;
use walkdir::WalkDir;
use crate::filesystem::file_metadata::{DiscoveredFile, FileMetadataUtil};

pub struct FolderScanner;

impl FolderScanner {
    pub fn new() -> Self {
        Self
    }

    pub fn scan_directory(&self, folder_path: &str) -> Result<Vec<DiscoveredFile>, String> {
        let path = Path::new(folder_path);
        if !path.exists() || !path.is_dir() {
            return Err(format!("Folder path does not exist or is not a directory: {}", folder_path));
        }

        let mut discovered = Vec::new();

        for entry_res in WalkDir::new(path).follow_links(false).into_iter() {
            let entry = match entry_res {
                Ok(e) => e,
                Err(_) => continue, // Gracefully skip inaccessible files/folders
            };

            let entry_path = entry.path();
            if entry_path.is_file() {
                if let Some(ext) = entry_path.extension() {
                    if ext.to_string_lossy().eq_ignore_ascii_case("pdf") {
                        if let Ok(metadata) = FileMetadataUtil::extract_metadata(entry_path) {
                            discovered.push(metadata);
                        }
                    }
                }
            }
        }

        Ok(discovered)
    }
}
