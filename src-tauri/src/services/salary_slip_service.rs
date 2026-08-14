use rusqlite::Connection;
use crate::models::{SalarySlip, ScanSummary};
use crate::database::repositories::SalarySlipRepository;
use crate::filesystem::FolderScanner;

pub struct SalarySlipService {
    repo: SalarySlipRepository,
    scanner: FolderScanner,
}

impl SalarySlipService {
    pub fn new() -> Self {
        Self {
            repo: SalarySlipRepository::new(),
            scanner: FolderScanner::new(),
        }
    }

    pub fn get_all_salary_slips(&self, conn: &Connection) -> Result<Vec<SalarySlip>, String> {
        self.repo.find_all(conn)
    }

    pub fn scan_folder(&self, conn: &mut Connection, folder_path: &str) -> Result<ScanSummary, String> {
        let discovered_files = self.scanner.scan_directory(folder_path)?;
        let pdf_count = discovered_files.len();

        let (new_count, updated_count, unchanged_count, duplicate_count) =
            self.repo.save_or_update_discovered(conn, discovered_files)?;
        let slips = self.repo.find_all(conn)?;

        Ok(ScanSummary {
            total_scanned: pdf_count,
            pdf_count,
            new_count,
            updated_count,
            unchanged_count,
            duplicate_count,
            folder_path: folder_path.to_string(),
            slips,
        })
    }

    pub fn remove_record(&self, conn: &Connection, id: &str) -> Result<bool, String> {
        self.repo.remove_record_by_id(conn, id)
    }
}
