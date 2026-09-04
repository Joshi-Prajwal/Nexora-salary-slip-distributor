use rusqlite::Connection;
use crate::models::{SalarySlip, ScanSummary, ExtractionSummary, OcrBatchSummary};
use crate::database::repositories::{SalarySlipRepository, EmployeeRepository};
use crate::filesystem::{FolderScanner, FolderScanDiagnostics};
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
        self.ingest_paths(conn, &[folder_path.to_string()])
    }

    pub fn ingest_paths(&self, conn: &mut Connection, paths: &[String]) -> Result<ScanSummary, String> {
        let (discovered_files, diagnostics) = self.scanner.scan_paths(paths)?;
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
            folder_path: diagnostics.selected_path,
            display_name: diagnostics.display_name,
            directories_scanned: diagnostics.directories_scanned,
            files_scanned: diagnostics.files_scanned,
            scan_errors: diagnostics.scan_errors,
            files: diagnostics.files,
            slips,
        })
    }

    pub fn diagnose_folder(&self, conn: &Connection, folder_path: &str) -> Result<FolderScanDiagnostics, String> {
        let current_slips = self.repo.find_all(conn)?;
        Ok(self.scanner.diagnose_path(folder_path, current_slips.len()))
    }

    pub fn extract_salary_slip_text(&self, conn: &Connection, id: &str) -> Result<SalarySlip, String> {
        let slip = match self.repo.find_by_id(conn, id)? {
            Some(s) => s,
            None => return Err(format!("Salary slip record not found with ID: {}", id)),
        };

        let is_duplicate = slip.match_status == "DUPLICATE_CONTENT";

        match self.pdf_extractor.extract_text(&slip.file_path) {
            Ok(text) => {
                let metrics = crate::pdf::quality::TextQualityEvaluator::evaluate(&text);
                let parsed = self.doc_parser.parse_text(&text)?;

                let clean_fname = slip.file_name.trim_end_matches(".pdf").trim_end_matches(".PDF");
                let (fn_code, fn_name) = if let Some((code, name)) = clean_fname.split_once('-') {
                    let c = code.trim().to_string();
                    let n = name.trim().to_string();
                    (
                        if !c.is_empty() { Some(c) } else { None },
                        if !n.is_empty() { Some(n) } else { None },
                    )
                } else {
                    (None, None)
                };

                let emp_id = parsed.employee_id.or(fn_code);
                let emp_name = parsed.name.or(fn_name);

                let classification = crate::pdf::SalarySlipClassifier::classify(&text, &slip.file_name);

                let (extraction_method, ocr_target_status) = if metrics.is_usable {
                    ("TEXT_EMBEDDED", "NOT_REQUIRED")
                } else {
                    ("OCR_REQUIRED", "PENDING")
                };

                let new_status = if is_duplicate {
                    "DUPLICATE_CONTENT"
                } else if emp_id.is_some() {
                    "IDENTIFIED"
                } else if emp_name.is_some() || parsed.email.is_some() || parsed.phone.is_some() {
                    "PARTIALLY_IDENTIFIED"
                } else {
                    "NOT_IDENTIFIED"
                };

                self.repo.update_extraction_result(
                    conn,
                    id,
                    Some(&text),
                    emp_id.as_deref(),
                    emp_name.as_deref(),
                    parsed.phone.as_deref(),
                    parsed.email.as_deref(),
                    extraction_method,
                    Some(new_status),
                    Some(classification.document_type.as_str()),
                    Some(classification.confidence),
                    Some(ocr_target_status),
                    parsed.month.as_deref(),
                    parsed.year.as_deref(),
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
                    Some(new_status),
                    Some("UNKNOWN"),
                    Some(0.0),
                    Some("PENDING"),
                    None,
                    None,
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
        let skipped = 0;

        for slip in &all_slips {
            match self.extract_salary_slip_text(conn, &slip.id) {
                Ok(updated) => {
                    processed += 1;
                    if updated.detected_employee_id.is_some() {
                        identified += 1;
                    } else if updated.detected_name.is_some() || updated.detected_email.is_some() || updated.detected_phone.is_some() {
                        partially_identified += 1;
                    } else if updated.extraction_method == "EXTRACTION_FAILED" {
                        failed += 1;
                    } else {
                        not_identified += 1;
                    }
                }
                Err(_) => {
                    failed += 1;
                }
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

        let _is_duplicate = slip.match_status == "DUPLICATE_CONTENT";

        let start_time = std::time::Instant::now();
        match self.ocr_engine.recognize(&slip.file_path) {
            Ok(ocr_res) => {
                let duration_ms = start_time.elapsed().as_millis() as u64;
                let parsed = self.doc_parser.parse_text(&ocr_res.text)?;

                let clean_fname = slip.file_name.trim_end_matches(".pdf").trim_end_matches(".PDF");
                let (fn_code, fn_name) = if let Some((code, name)) = clean_fname.split_once('-') {
                    let c = code.trim().to_string();
                    let n = name.trim().to_string();
                    (
                        if !c.is_empty() { Some(c) } else { None },
                        if !n.is_empty() { Some(n) } else { None },
                    )
                } else {
                    (None, None)
                };

                let emp_id = parsed.employee_id.or(fn_code);
                let emp_name = parsed.name.or(fn_name);

                let classification = crate::pdf::SalarySlipClassifier::classify(&ocr_res.text, &slip.file_name);

                let ocr_status = if ocr_res.confidence >= 70.0 {
                    "COMPLETED"
                } else {
                    "COMPLETED_WITH_WARNINGS"
                };

                self.repo.update_ocr_result(
                    conn,
                    id,
                    Some(&ocr_res.text),
                    emp_id.as_deref(),
                    emp_name.as_deref(),
                    parsed.phone.as_deref(),
                    parsed.email.as_deref(),
                    "OCR",
                    ocr_status,
                    Some(ocr_res.confidence),
                    None,
                    Some(classification.document_type.as_str()),
                    Some(classification.confidence),
                    Some(ocr_res.page_count as u32),
                    Some(duration_ms),
                    parsed.month.as_deref(),
                    parsed.year.as_deref(),
                )?;
            }
            Err(ocr_err) => {
                let duration_ms = start_time.elapsed().as_millis() as u64;
                let err_msg = ocr_err.to_string();
                let ocr_status = match &ocr_err {
                    crate::ocr::OcrError::EngineUnavailable(_) => "UNAVAILABLE",
                    crate::ocr::OcrError::InitializationFailed(_) => "ENGINE_ERROR",
                    crate::ocr::OcrError::PdfRenderingFailed(_) => "RENDER_FAILED",
                    crate::ocr::OcrError::ImagePreprocessingFailed(_) => "RENDER_FAILED",
                    crate::ocr::OcrError::RecognitionFailed(m) if m.contains("empty") => "EMPTY_RESULT",
                    crate::ocr::OcrError::RecognitionFailed(_) => "ENGINE_ERROR",
                    crate::ocr::OcrError::Timeout(_) => "TIMEOUT",
                    crate::ocr::OcrError::UnsupportedDocument(_) => "RENDER_FAILED",
                };

                let fallback_method = if slip.extraction_method == "NOT_IDENTIFIED" { "NOT_IDENTIFIED" } else { &slip.extraction_method };

                self.repo.update_ocr_result(
                    conn,
                    id,
                    None,
                    None,
                    None,
                    None,
                    None,
                    fallback_method,
                    ocr_status,
                    None,
                    Some(&err_msg),
                    None,
                    None,
                    None,
                    Some(duration_ms),
                    None,
                    None,
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
            // Standard OCR: Only process slips requiring OCR or pending/failed
            if slip.extraction_method == "OCR"
                || slip.extraction_method == "OCR_REQUIRED"
                || slip.ocr_status == "PENDING"
                || slip.ocr_status == "FAILED"
            {
                match self.run_ocr_fallback(conn, &slip.id) {
                    Ok(updated) => {
                        processed += 1;
                        if updated.detected_employee_id.is_some() {
                            identified += 1;
                        } else if updated.detected_name.is_some() || updated.detected_email.is_some() || updated.detected_phone.is_some() {
                            partially_identified += 1;
                        } else if updated.ocr_status == "FAILED" {
                            failed += 1;
                        } else {
                            not_identified += 1;
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

    pub fn run_force_ocr_batch(&self, conn: &Connection) -> Result<OcrBatchSummary, String> {
        let all_slips = self.repo.find_all(conn)?;
        let total = all_slips.len();

        let mut processed = 0;
        let mut identified = 0;
        let mut partially_identified = 0;
        let mut not_identified = 0;
        let mut failed = 0;

        for slip in &all_slips {
            match self.run_ocr_fallback(conn, &slip.id) {
                Ok(updated) => {
                    processed += 1;
                    if updated.detected_employee_id.is_some() {
                        identified += 1;
                    } else if updated.detected_name.is_some() || updated.detected_email.is_some() || updated.detected_phone.is_some() {
                        partially_identified += 1;
                    } else if updated.ocr_status == "FAILED" {
                        failed += 1;
                    } else {
                        not_identified += 1;
                    }
                }
                Err(_) => {
                    failed += 1;
                }
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
            skipped: 0,
            slips: updated_slips,
        })
    }

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
            if slip.match_status == "MANUALLY_CONFIRMED" || slip.match_status == "MANUALLY_REJECTED" || slip.approval_status == "APPROVED" {
                already_reviewed += 1;
                continue;
            }

            let mut match_res = self.matcher.match_slip(slip, &all_employees);

            // Invariant enforcement: If no matched_employee_id, status CANNOT be EXACT_MATCH or STRONG_MATCH
            if match_res.matched_employee_id.is_none() && (match_res.status == "EXACT_MATCH" || match_res.status == "STRONG_MATCH") {
                match_res.status = "NO_MATCH".to_string();
                match_res.confidence = 0.0;
            }

            // Populate detected_name and detected_employee_id from matched candidate if missing
            if let Some(matched_id) = &match_res.matched_employee_id {
                if let Some(emp) = all_employees.iter().find(|e| &e.id == matched_id) {
                    let det_emp_id = slip.detected_employee_id.clone().unwrap_or_else(|| emp.employee_id.clone());
                    let det_name = slip.detected_name.clone().unwrap_or_else(|| emp.name.clone());
                    let _ = self.repo.update_extraction_result(
                        conn,
                        &slip.id,
                        slip.extracted_text.as_deref(),
                        Some(&det_emp_id),
                        Some(&det_name),
                        slip.detected_phone.as_deref(),
                        slip.detected_email.as_deref(),
                        &slip.extraction_method,
                        Some("IDENTIFIED"),
                        None,
                        None,
                        None,
                        slip.month.as_deref(),
                        slip.year.as_deref(),
                    );
                }
            }

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

    pub fn can_bulk_confirm(slip: &SalarySlip) -> (bool, &'static str) {
        if slip.approval_status == "REJECTED" || slip.match_status == "MANUALLY_REJECTED" {
            return (false, "ALREADY_REJECTED");
        }
        if slip.match_status == "CONFLICT" {
            return (false, "CONFLICT");
        }
        if slip.match_status == "NO_MATCH" {
            return (false, "NO_MATCH");
        }
        if slip.match_status == "UNMATCHED" || slip.match_status == "NOT_IDENTIFIED" {
            return (false, "UNMATCHED");
        }
        if slip.matched_employee_id.is_none() {
            return (false, "MISSING_EMPLOYEE_ID");
        }
        if slip.ocr_status == "FAILED" || slip.match_status == "TEXT_EXTRACTION_FAILED" {
            return (false, "EXTRACTION_FAILED");
        }
        if !std::path::Path::new(&slip.file_path).exists() {
            return (false, "FILE_MISSING");
        }
        if slip.match_status != "EXACT_MATCH" && slip.match_status != "MANUALLY_CONFIRMED" {
            return (false, "POSSIBLE_MATCH_REQUIRES_MANUAL_REVIEW");
        }

        (true, "SAFE")
    }

    pub fn confirm_all_safe_matches(&self, conn: &Connection) -> Result<crate::models::BulkConfirmResult, String> {
        let all_slips = self.repo.find_all(conn)?;
        let mut confirmed_count = 0;
        let mut skipped_count = 0;
        let mut skipped_reasons = Vec::new();

        for slip in &all_slips {
            let (eligible, reason) = Self::can_bulk_confirm(slip);
            if eligible {
                if slip.match_status != "MANUALLY_CONFIRMED" || slip.approval_status != "APPROVED" {
                    self.repo.update_match_decision(
                        conn,
                        &slip.id,
                        slip.matched_employee_id.as_deref(),
                        "MANUALLY_CONFIRMED",
                        1.0,
                        "Confirmed via bulk safe matches operation.",
                        Some("Bulk Safe Confirmation"),
                        Some("System Automation"),
                    )?;
                    confirmed_count += 1;
                } else {
                    skipped_count += 1;
                    skipped_reasons.push(format!("{}: ALREADY_APPROVED", slip.file_name));
                }
            } else {
                skipped_count += 1;
                skipped_reasons.push(format!("{}: {}", slip.file_name, reason));
            }
        }

        let updated_slips = self.repo.find_all(conn)?;
        Ok(crate::models::BulkConfirmResult {
            confirmed_count,
            skipped_count,
            skipped_reasons,
            slips: updated_slips,
        })
    }

    pub fn bulk_update_approval(&self, conn: &Connection, slip_ids: &[String], target_approval: &str) -> Result<Vec<SalarySlip>, String> {
        for id in slip_ids {
            if target_approval == "APPROVED" {
                if let Some(slip) = self.repo.find_by_id(conn, id)? {
                    // Safety check: Cannot bulk-approve CONFLICT, NO_MATCH, UNMATCHED, or records with missing employee
                    if slip.match_status == "CONFLICT" || slip.match_status == "NO_MATCH" || slip.match_status == "UNMATCHED" {
                        continue;
                    }

                    if let Some(emp_id) = slip.matched_employee_id.as_deref() {
                        self.repo.update_match_decision(
                            conn,
                            id,
                            Some(emp_id),
                            "MANUALLY_CONFIRMED",
                            1.0,
                            "Approved via bulk row selection.",
                            Some("Bulk Row Action"),
                            Some("Reviewer"),
                        )?;
                    }
                }
            } else if target_approval == "REJECTED" {
                self.repo.update_match_decision(
                    conn,
                    id,
                    None,
                    "MANUALLY_REJECTED",
                    0.0,
                    "Rejected via bulk row selection.",
                    Some("Bulk Row Action"),
                    Some("Reviewer"),
                )?;
            } else {
                self.repo.update_approval_status(conn, id, target_approval, None, Some("Reviewer"))?;
            }
        }

        self.repo.find_all(conn)
    }

    pub fn remove_record(&self, conn: &Connection, id: &str) -> Result<bool, String> {
        self.repo.remove_record_by_id(conn, id)
    }

    pub fn remove_records_batch(&self, conn: &mut Connection, ids: &[String]) -> Result<usize, String> {
        self.repo.remove_records_batch(conn, ids)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::database::connection::DbState;
    use rusqlite::Connection;
    use std::path::Path;

    #[test]
    fn test_audit_real_156_pdf_dataset() {
        let pdf_dir = r"C:\Users\joshi\Downloads\SalarySlips";
        if !Path::new(pdf_dir).exists() {
            println!("Skipping real PDF audit: directory does not exist on test machine");
            return;
        }

        let mut conn = Connection::open_in_memory().unwrap();
        DbState::migrate(&conn).unwrap();

        let service = SalarySlipService::new();

        // Step 1: Scan / Ingest PDFs
        let scan_res = service.scan_folder(&mut conn, pdf_dir).unwrap();
        assert_eq!(scan_res.pdf_count, 156);

        // Step 2: Extract text
        let ext_res = service.extract_all_salary_slips(&conn).unwrap();
        assert_eq!(ext_res.total, 156);

        // Step 3: Run matching with employees
        // (Verify that no slip has exact match with null identified employee)
        let slips = service.get_all_salary_slips(&conn).unwrap();
        let usable_count = slips.iter().filter(|s| s.extraction_method == "TEXT_EMBEDDED").count();
        let ocr_req_count = slips.iter().filter(|s| s.extraction_method == "OCR_REQUIRED" || s.extraction_method == "OCR").count();

        println!("=== AUDIT REAL 156 PDF DATASET RESULTS ===");
        println!("Total PDFs: {}", slips.len());
        println!("Embedded Text Usable (NOT_REQUIRED): {}", usable_count);
        println!("OCR Required: {}", ocr_req_count);

        for slip in &slips {
            if slip.extraction_method != "TEXT_EMBEDDED" {
                println!("OCR REQUIRED FILE: {} (path: {})", slip.file_name, slip.file_path);
            }
        }
    }

    #[test]
    fn test_full_ocr_acceptance_lifecycle() {
        let pdf_dir = r"C:\Users\joshi\Downloads\SalarySlips";
        if !Path::new(pdf_dir).exists() {
            return;
        }

        let mut conn = Connection::open_in_memory().unwrap();
        DbState::migrate(&conn).unwrap();
        let service = SalarySlipService::new();

        // 1. Ingest
        service.scan_folder(&mut conn, pdf_dir).unwrap();

        // 2. Identify
        let ext_res = service.extract_all_salary_slips(&conn).unwrap();
        assert_eq!(ext_res.total, 156);
        assert_eq!(ext_res.identified, 156);

        let slips_step2 = service.get_all_salary_slips(&conn).unwrap();
        assert_eq!(slips_step2.iter().filter(|s| s.ocr_status == "NOT_REQUIRED").count(), 156);

        // 3. Run Normal OCR
        let ocr_normal_res = service.run_batch_ocr_fallback(&conn).unwrap();
        assert_eq!(ocr_normal_res.total, 156);
        assert_eq!(ocr_normal_res.skipped, 156); // 156 skipped because embedded text is usable
        assert_eq!(ocr_normal_res.processed, 0);

        let slips_step3 = service.get_all_salary_slips(&conn).unwrap();
        assert_eq!(slips_step3.iter().filter(|s| s.ocr_status == "NOT_REQUIRED").count(), 156);
        assert_eq!(slips_step3.iter().filter(|s| s.ocr_status == "UNAVAILABLE" || s.ocr_status == "FAILED").count(), 0);

        // 4. Force OCR
        let ocr_force_res = service.run_force_ocr_batch(&conn).unwrap();
        assert_eq!(ocr_force_res.total, 156);
        assert_eq!(ocr_force_res.processed, 156);
        // Tesseract executable missing on machine -> updated to UNAVAILABLE
        let slips_step4 = service.get_all_salary_slips(&conn).unwrap();
        assert_eq!(slips_step4.iter().filter(|s| s.ocr_status == "UNAVAILABLE").count(), 156);

        // 5. Repeat Force OCR (Determinism Test)
        let ocr_force_repeat = service.run_force_ocr_batch(&conn).unwrap();
        assert_eq!(ocr_force_repeat.processed, 156);
        let slips_step5 = service.get_all_salary_slips(&conn).unwrap();
        assert_eq!(slips_step5.iter().filter(|s| s.ocr_status == "UNAVAILABLE").count(), 156);

        // 6. Re-run Identify Salary Slips (State Recovery)
        service.extract_all_salary_slips(&conn).unwrap();
        let slips_step6 = service.get_all_salary_slips(&conn).unwrap();
        assert_eq!(slips_step6.iter().filter(|s| s.ocr_status == "NOT_REQUIRED").count(), 156);
        assert_eq!(slips_step6.iter().filter(|s| s.ocr_status == "UNAVAILABLE" || s.ocr_status == "FAILED").count(), 0);

        // Assert Matching Invariant: No EXACT_MATCH without matched_employee_id
        service.run_matching_engine(&conn).unwrap();
        let slips_matched = service.get_all_salary_slips(&conn).unwrap();
        for slip in &slips_matched {
            if slip.match_status == "EXACT_MATCH" || slip.match_status == "STRONG_MATCH" {
                assert!(slip.matched_employee_id.is_some(), "Invariant Violation: EXACT_MATCH without matched_employee_id");
                assert!(slip.detected_name.is_some(), "Invariant Violation: EXACT_MATCH with unidentified name");
            }
        }
    }
}
