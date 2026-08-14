use rusqlite::Connection;
use crate::models::{SalarySlip, ScanSummary, ExtractionSummary};
use crate::database::repositories::SalarySlipRepository;
use crate::filesystem::FolderScanner;
use crate::pdf::{DefaultPdfExtractor, PdfTextExtractor, DefaultDocumentParser, DocumentParser};

pub struct SalarySlipService {
    repo: SalarySlipRepository,
    scanner: FolderScanner,
    pdf_extractor: DefaultPdfExtractor,
    doc_parser: DefaultDocumentParser,
}

impl SalarySlipService {
    pub fn new() -> Self {
        Self {
            repo: SalarySlipRepository::new(),
            scanner: FolderScanner::new(),
            pdf_extractor: DefaultPdfExtractor::new(),
            doc_parser: DefaultDocumentParser::new(),
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

    pub fn extract_salary_slip_text(&self, conn: &Connection, id: &str) -> Result<SalarySlip, String> {
        let slip = match self.repo.find_by_id(conn, id)? {
            Some(s) => s,
            None => return Err(format!("Salary slip record not found with ID: {}", id)),
        };

        let is_duplicate = slip.match_status == "DUPLICATE_CONTENT";

        match self.pdf_extractor.extract_text(&slip.file_path) {
            Ok(text) => {
                let parsed = self.doc_parser.parse_text(&text)?;

                let new_status = if is_duplicate {
                    "DUPLICATE_CONTENT"
                } else if parsed.employee_id.is_some() {
                    "IDENTIFIED"
                } else if parsed.name.is_some() || parsed.email.is_some() || parsed.phone.is_some() {
                    "PARTIALLY_IDENTIFIED"
                } else {
                    "NOT_IDENTIFIED"
                };

                self.repo.update_extraction_result(
                    conn,
                    id,
                    Some(&text),
                    parsed.employee_id.as_deref(),
                    parsed.name.as_deref(),
                    parsed.phone.as_deref(),
                    parsed.email.as_deref(),
                    "TEXT_EMBEDDED",
                    new_status,
                )?;
            }
            Err(_err) => {
                let new_status = if is_duplicate {
                    "DUPLICATE_CONTENT"
                } else {
                    "TEXT_EXTRACTION_FAILED"
                };

                self.repo.update_extraction_result(
                    conn,
                    id,
                    None,
                    None,
                    None,
                    None,
                    None,
                    "NOT_IDENTIFIED",
                    new_status,
                )?;
            }
        }

        match self.repo.find_by_id(conn, id)? {
            Some(updated) => Ok(updated),
            None => Err("Failed to retrieve updated salary slip record".to_string()),
        }
    }

    pub fn extract_all_salary_slips(&self, conn: &Connection) -> Result<ExtractionSummary, String> {
        let all_slips = self.repo.find_all(conn)?;
        let total = all_slips.len();

        let mut processed = 0;
        let mut identified = 0;
        let mut partially_identified = 0;
        let mut not_identified = 0;
        let mut failed = 0;
        let mut skipped = 0;

        for slip in &all_slips {
            // Process eligible slips
            if slip.match_status == "UNMATCHED"
                || slip.match_status == "NOT_IDENTIFIED"
                || slip.match_status == "TEXT_EXTRACTION_FAILED"
                || slip.match_status == "DUPLICATE_CONTENT"
            {
                match self.extract_salary_slip_text(conn, &slip.id) {
                    Ok(updated) => {
                        processed += 1;
                        match updated.match_status.as_str() {
                            "IDENTIFIED" => identified += 1,
                            "PARTIALLY_IDENTIFIED" => partially_identified += 1,
                            "NOT_IDENTIFIED" => not_identified += 1,
                            "TEXT_EXTRACTION_FAILED" => failed += 1,
                            _ => skipped += 1,
                        }
                    }
                    Err(_) => {
                        failed += 1;
                    }
                }
            } else {
                skipped += 1;
            }
        }

        let updated_slips = self.repo.find_all(conn)?;

        Ok(ExtractionSummary {
            total,
            processed,
            identified,
            partially_identified,
            not_identified,
            failed,
            skipped,
            slips: updated_slips,
        })
    }

    pub fn remove_record(&self, conn: &Connection, id: &str) -> Result<bool, String> {
        self.repo.remove_record_by_id(conn, id)
    }
}
