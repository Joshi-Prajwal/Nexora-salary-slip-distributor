use rusqlite::Connection;
use crate::models::{SalarySlip, ScanSummary, ExtractionSummary, OcrBatchSummary};
use crate::database::repositories::{SalarySlipRepository, EmployeeRepository};
use crate::filesystem::FolderScanner;
use crate::pdf::{DefaultPdfExtractor, PdfTextExtractor, DefaultDocumentParser, DocumentParser};
use crate::ocr::{FallbackOcrEngine, OcrEngine};
use crate::matching::{StandardMatcher, EmployeeMatcher, MatchCandidate, BatchMatchSummary};

pub struct SalarySlipService {
    repo: SalarySlipRepository,
    emp_repo: EmployeeRepository,
    scanner: FolderScanner,
    pdf_extractor: DefaultPdfExtractor,
    doc_parser: DefaultDocumentParser,
    ocr_engine: FallbackOcrEngine,
    matcher: StandardMatcher,
}

impl SalarySlipService {
    pub fn new() -> Self {
        Self {
            repo: SalarySlipRepository::new(),
            emp_repo: EmployeeRepository::new(),
            scanner: FolderScanner::new(),
            pdf_extractor: DefaultPdfExtractor::new(),
            doc_parser: DefaultDocumentParser::new(),
            ocr_engine: FallbackOcrEngine::new(),
            matcher: StandardMatcher::new(),
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

    pub fn run_ocr_fallback(&self, conn: &Connection, id: &str) -> Result<SalarySlip, String> {
        let slip = match self.repo.find_by_id(conn, id)? {
            Some(s) => s,
            None => return Err(format!("Salary slip record not found with ID: {}", id)),
        };

        let is_duplicate = slip.match_status == "DUPLICATE_CONTENT";

        match self.ocr_engine.recognize(&slip.file_path) {
            Ok(ocr_res) => {
                let parsed = self.doc_parser.parse_text(&ocr_res.text)?;

                let new_status = if is_duplicate {
                    "DUPLICATE_CONTENT"
                } else if parsed.employee_id.is_some() {
                    "IDENTIFIED"
                } else if parsed.name.is_some() || parsed.email.is_some() || parsed.phone.is_some() {
                    "PARTIALLY_IDENTIFIED"
                } else {
                    "NOT_IDENTIFIED"
                };

                self.repo.update_ocr_result(
                    conn,
                    id,
                    Some(&ocr_res.text),
                    parsed.employee_id.as_deref(),
                    parsed.name.as_deref(),
                    parsed.phone.as_deref(),
                    parsed.email.as_deref(),
                    "OCR",
                    new_status,
                    Some(ocr_res.confidence),
                    None,
                )?;
            }
            Err(ocr_err) => {
                let err_msg = ocr_err.to_string();
                let new_status = if is_duplicate {
                    "DUPLICATE_CONTENT"
                } else {
                    "TEXT_EXTRACTION_FAILED"
                };

                self.repo.update_ocr_result(
                    conn,
                    id,
                    None,
                    None,
                    None,
                    None,
                    None,
                    "NOT_IDENTIFIED",
                    new_status,
                    None,
                    Some(&err_msg),
                )?;
            }
        }

        match self.repo.find_by_id(conn, id)? {
            Some(updated) => Ok(updated),
            None => Err("Failed to retrieve updated salary slip record after OCR".to_string()),
        }
    }

    pub fn run_batch_ocr_fallback(&self, conn: &Connection) -> Result<OcrBatchSummary, String> {
        let all_slips = self.repo.find_all(conn)?;
        let total = all_slips.len();

        let mut processed = 0;
        let mut identified = 0;
        let mut partially_identified = 0;
        let mut not_identified = 0;
        let mut failed = 0;
        let mut skipped = 0;

        for slip in &all_slips {
            if slip.match_status == "TEXT_EXTRACTION_FAILED"
                || slip.match_status == "NOT_IDENTIFIED"
                || slip.extraction_method == "NOT_IDENTIFIED"
            {
                match self.run_ocr_fallback(conn, &slip.id) {
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

        Ok(OcrBatchSummary {
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

    // Phase 5 Deterministic Employee Matching Engine
    pub fn run_matching_engine(&self, conn: &Connection) -> Result<BatchMatchSummary, String> {
        let all_slips = self.repo.find_all(conn)?;
        let all_employees = self.emp_repo.find_all(conn)?;

        let total = all_slips.len();
        let mut exact_matches = 0;
        let mut strong_matches = 0;
        let mut possible_matches = 0;
        let mut conflicts = 0;
        let mut no_matches = 0;
        let mut already_reviewed = 0;

        for slip in &all_slips {
            // Preserve manually confirmed or rejected review states!
            if slip.match_status == "MANUALLY_CONFIRMED" || slip.match_status == "MANUALLY_REJECTED" {
                already_reviewed += 1;
                continue;
            }

            let match_res = self.matcher.match_slip(slip, &all_employees);

            match match_res.status.as_str() {
                "EXACT_MATCH" => exact_matches += 1,
                "STRONG_MATCH" => strong_matches += 1,
                "POSSIBLE_MATCH" => possible_matches += 1,
                "CONFLICT" => conflicts += 1,
                _ => no_matches += 1,
            }

            self.repo.update_match_decision(
                conn,
                &slip.id,
                match_res.matched_employee_id.as_deref(),
                &match_res.status,
                match_res.confidence,
                &match_res.reason,
                None,
                None,
            )?;
        }

        let updated_slips = self.repo.find_all(conn)?;

        Ok(BatchMatchSummary {
            total,
            exact_matches,
            strong_matches,
            possible_matches,
            conflicts,
            no_matches,
            already_reviewed,
            slips: updated_slips,
        })
    }

    pub fn confirm_match(&self, conn: &Connection, slip_id: &str, employee_id: &str, note: Option<&str>) -> Result<SalarySlip, String> {
        self.repo.update_match_decision(
            conn,
            slip_id,
            Some(employee_id),
            "MANUALLY_CONFIRMED",
            1.0,
            "Manually confirmed by reviewer.",
            note,
            Some("Reviewer"),
        )?;

        match self.repo.find_by_id(conn, slip_id)? {
            Some(updated) => Ok(updated),
            None => Err("Failed to find updated salary slip record".to_string()),
        }
    }

    pub fn reject_match(&self, conn: &Connection, slip_id: &str, note: Option<&str>) -> Result<SalarySlip, String> {
        self.repo.update_match_decision(
            conn,
            slip_id,
            None,
            "MANUALLY_REJECTED",
            0.0,
            "Manually rejected by reviewer.",
            note,
            Some("Reviewer"),
        )?;

        match self.repo.find_by_id(conn, slip_id)? {
            Some(updated) => Ok(updated),
            None => Err("Failed to find updated salary slip record".to_string()),
        }
    }

    pub fn reset_match(&self, conn: &Connection, slip_id: &str) -> Result<SalarySlip, String> {
        let slip = match self.repo.find_by_id(conn, slip_id)? {
            Some(s) => s,
            None => return Err(format!("Salary slip not found with ID: {}", slip_id)),
        };

        let all_employees = self.emp_repo.find_all(conn)?;
        
        // Temporarily reset match_status to force re-evaluation
        let mut temp_slip = slip.clone();
        temp_slip.match_status = "UNMATCHED".to_string();

        let match_res = self.matcher.match_slip(&temp_slip, &all_employees);

        self.repo.update_match_decision(
            conn,
            slip_id,
            match_res.matched_employee_id.as_deref(),
            &match_res.status,
            match_res.confidence,
            &match_res.reason,
            None,
            None,
        )?;

        match self.repo.find_by_id(conn, slip_id)? {
            Some(updated) => Ok(updated),
            None => Err("Failed to find reset salary slip record".to_string()),
        }
    }

    pub fn get_match_candidates(&self, conn: &Connection, slip_id: &str) -> Result<Vec<MatchCandidate>, String> {
        let slip = match self.repo.find_by_id(conn, slip_id)? {
            Some(s) => s,
            None => return Err(format!("Salary slip not found with ID: {}", slip_id)),
        };

        let all_employees = self.emp_repo.find_all(conn)?;
        Ok(self.matcher.get_candidates(&slip, &all_employees))
    }

    pub fn remove_record(&self, conn: &Connection, id: &str) -> Result<bool, String> {
        self.repo.remove_record_by_id(conn, id)
    }
}
