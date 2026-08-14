use crate::errors::AppError;

pub struct FolderScanner;

impl FolderScanner {
    pub fn new() -> Self {
        Self
    }

    pub fn scan_directory(&self, path: &str) -> Result<Vec<String>, AppError> {
        println!("[FileSystem] FolderScanner scanning path: {}", path);
        Ok(vec![])
    }
}
