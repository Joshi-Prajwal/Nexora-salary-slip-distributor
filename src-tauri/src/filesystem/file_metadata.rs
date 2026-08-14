use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::fs::File;
use std::io::{Read, BufReader};
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
}

pub struct FileMetadataUtil;

impl FileMetadataUtil {
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

        let file_path = path.to_str().unwrap_or("").to_string();

        Ok(DiscoveredFile {
            file_path,
            file_name,
            file_extension,
            file_size,
            modified_at,
            file_hash,
        })
    }
}
