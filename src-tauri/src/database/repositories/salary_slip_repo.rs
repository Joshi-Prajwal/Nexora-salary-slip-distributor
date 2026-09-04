use rusqlite::{params, Connection, Result};
use crate::models::SalarySlip;
use crate::filesystem::DiscoveredFile;
use std::time::{SystemTime, UNIX_EPOCH};

pub struct SalarySlipRepository;

impl SalarySlipRepository {
    pub fn new() -> Self {
        Self
    }

    pub fn find_all(&self, conn: &Connection) -> Result<Vec<SalarySlip>, String> {
        let mut stmt = conn
            .prepare(
                r#"
                SELECT id, file_path, file_name, file_hash, detected_employee_id, detected_name,
                       detected_phone, detected_email, extraction_method, extracted_text,
                       match_confidence, match_status, duplicate_of_id, ocr_confidence,
                       ocr_processed_at, ocr_error, matched_employee_id, match_reason,
                       matched_at, reviewed_at, reviewed_by, review_note, month, year,
                       approval_status, ocr_status, document_type, document_confidence,
                       ocr_attempt_count, ocr_page_count, ocr_processing_time_ms,
                       created_at, updated_at
                FROM salary_slips
                ORDER BY created_at DESC
                "#,
            )
            .map_err(|e| e.to_string())?;

        let slip_iter = stmt
            .query_map([], |row| {
                Ok(SalarySlip {
                    id: row.get(0)?,
                    file_path: row.get(1)?,
                    file_name: row.get(2)?,
                    file_hash: row.get(3)?,
                    detected_employee_id: row.get(4)?,
                    detected_name: row.get(5)?,
                    detected_phone: row.get(6)?,
                    detected_email: row.get(7)?,
                    extraction_method: row.get(8)?,
                    extracted_text: row.get(9)?,
                    match_confidence: row.get(10)?,
                    match_status: row.get(11)?,
                    duplicate_of_id: row.get(12)?,
                    ocr_confidence: row.get(13)?,
                    ocr_processed_at: row.get(14)?,
                    ocr_error: row.get(15)?,
                    matched_employee_id: row.get(16)?,
                    match_reason: row.get(17)?,
                    matched_at: row.get(18)?,
                    reviewed_at: row.get(19)?,
                    reviewed_by: row.get(20)?,
                    review_note: row.get(21)?,
                    month: row.get(22)?,
                    year: row.get(23)?,
                    approval_status: row.get(24).unwrap_or_else(|_| "PENDING".to_string()),
                    ocr_status: row.get(25).unwrap_or_else(|_| "NOT_REQUIRED".to_string()),
                    document_type: row.get(26).ok(),
                    document_confidence: row.get(27).ok(),
                    ocr_attempt_count: row.get(28).ok(),
                    ocr_page_count: row.get(29).ok(),
                    ocr_processing_time_ms: row.get(30).ok(),
                    created_at: row.get(31)?,
                    updated_at: row.get(32)?,
                })
            })
            .map_err(|e| e.to_string())?;

        let mut slips = Vec::new();
        for item in slip_iter {
            if let Ok(s) = item {
                slips.push(s);
            }
        }

        Ok(slips)
    }

    pub fn find_by_id(&self, conn: &Connection, id: &str) -> Result<Option<SalarySlip>, String> {
        let mut stmt = conn
            .prepare(
                r#"
                SELECT id, file_path, file_name, file_hash, detected_employee_id, detected_name,
                       detected_phone, detected_email, extraction_method, extracted_text,
                       match_confidence, match_status, duplicate_of_id, ocr_confidence,
                       ocr_processed_at, ocr_error, matched_employee_id, match_reason,
                       matched_at, reviewed_at, reviewed_by, review_note, month, year,
                       approval_status, ocr_status, document_type, document_confidence,
                       ocr_attempt_count, ocr_page_count, ocr_processing_time_ms,
                       created_at, updated_at
                FROM salary_slips
                WHERE id = ?
                "#,
            )
            .map_err(|e| e.to_string())?;

        let slip = stmt
            .query_row(params![id], |row| {
                Ok(SalarySlip {
                    id: row.get(0)?,
                    file_path: row.get(1)?,
                    file_name: row.get(2)?,
                    file_hash: row.get(3)?,
                    detected_employee_id: row.get(4)?,
                    detected_name: row.get(5)?,
                    detected_phone: row.get(6)?,
                    detected_email: row.get(7)?,
                    extraction_method: row.get(8)?,
                    extracted_text: row.get(9)?,
                    match_confidence: row.get(10)?,
                    match_status: row.get(11)?,
                    duplicate_of_id: row.get(12)?,
                    ocr_confidence: row.get(13)?,
                    ocr_processed_at: row.get(14)?,
                    ocr_error: row.get(15)?,
                    matched_employee_id: row.get(16)?,
                    match_reason: row.get(17)?,
                    matched_at: row.get(18)?,
                    reviewed_at: row.get(19)?,
                    reviewed_by: row.get(20)?,
                    review_note: row.get(21)?,
                    month: row.get(22)?,
                    year: row.get(23)?,
                    approval_status: row.get(24).unwrap_or_else(|_| "PENDING".to_string()),
                    ocr_status: row.get(25).unwrap_or_else(|_| "NOT_REQUIRED".to_string()),
                    document_type: row.get(26).ok(),
                    document_confidence: row.get(27).ok(),
                    ocr_attempt_count: row.get(28).ok(),
                    ocr_page_count: row.get(29).ok(),
                    ocr_processing_time_ms: row.get(30).ok(),
                    created_at: row.get(31)?,
                    updated_at: row.get(32)?,
                })
            })
            .ok();

        Ok(slip)
    }

    pub fn save_or_update_discovered(
        &self,
        conn: &mut Connection,
        files: Vec<DiscoveredFile>,
    ) -> Result<(usize, usize, usize, usize), String> {
        let tx = conn.transaction().map_err(|e| e.to_string())?;
        let now = now_timestamp();

        let mut new_count = 0;
        let mut updated_count = 0;
        let mut unchanged_count = 0;
        let mut duplicate_count = 0;

        for file in files {
            let existing_path_record: Option<(String, String)> = tx
                .query_row(
                    "SELECT id, file_hash FROM salary_slips WHERE file_path = ?",
                    params![file.file_path],
                    |row| Ok((row.get(0)?, row.get(1)?)),
                )
                .ok();

            if let Some((id, existing_hash)) = existing_path_record {
                if existing_hash == file.file_hash {
                    unchanged_count += 1;
                } else {
                    tx.execute(
                        "UPDATE salary_slips SET file_hash = ?, file_name = ?, month = ?, year = ?, updated_at = ? WHERE id = ?",
                        params![file.file_hash, file.file_name, file.month, file.year, now, id],
                    )
                    .map_err(|e| e.to_string())?;
                    updated_count += 1;
                }
            } else {
                let canonical_id: Option<String> = tx
                    .query_row(
                        "SELECT id FROM salary_slips WHERE file_hash = ? ORDER BY created_at ASC LIMIT 1",
                        params![file.file_hash],
                        |row| row.get(0),
                    )
                    .ok();

                let id = format!("slip-{}", uuid_simple());

                if let Some(canonical) = canonical_id {
                    tx.execute(
                        r#"
                        INSERT INTO salary_slips (
                            id, file_path, file_name, file_hash, detected_employee_id, detected_name,
                            detected_phone, detected_email, extraction_method, extracted_text,
                            match_confidence, match_status, duplicate_of_id, month, year,
                            approval_status, ocr_status, created_at, updated_at
                        ) VALUES (?, ?, ?, ?, NULL, NULL, NULL, NULL, 'NOT_IDENTIFIED', NULL, 0.0, 'DUPLICATE_CONTENT', ?, ?, ?, 'PENDING', 'NOT_REQUIRED', ?, ?)
                        "#,
                        params![id, file.file_path, file.file_name, file.file_hash, canonical, file.month, file.year, now, now],
                    )
                    .map_err(|e| e.to_string())?;
                    duplicate_count += 1;
                } else {
                    tx.execute(
                        r#"
                        INSERT INTO salary_slips (
                            id, file_path, file_name, file_hash, detected_employee_id, detected_name,
                            detected_phone, detected_email, extraction_method, extracted_text,
                            match_confidence, match_status, duplicate_of_id, month, year,
                            approval_status, ocr_status, created_at, updated_at
                        ) VALUES (?, ?, ?, ?, NULL, NULL, NULL, NULL, 'NOT_IDENTIFIED', NULL, 0.0, 'UNMATCHED', NULL, ?, ?, 'PENDING', 'NOT_REQUIRED', ?, ?)
                        "#,
                        params![id, file.file_path, file.file_name, file.file_hash, file.month, file.year, now, now],
                    )
                    .map_err(|e| e.to_string())?;
                    new_count += 1;
                }
            }
        }

        tx.commit().map_err(|e| e.to_string())?;
        Ok((new_count, updated_count, unchanged_count, duplicate_count))
    }

    pub fn update_extraction_result(
        &self,
        conn: &Connection,
        id: &str,
        extracted_text: Option<&str>,
        detected_emp_id: Option<&str>,
        detected_name: Option<&str>,
        detected_phone: Option<&str>,
        detected_email: Option<&str>,
        extraction_method: &str,
        match_status: Option<&str>,
        document_type: Option<&str>,
        document_confidence: Option<f64>,
        target_ocr_status: Option<&str>,
        month: Option<&str>,
        year: Option<&str>,
    ) -> Result<bool, String> {
        let now = now_timestamp();

        let rows = conn
            .execute(
                r#"
                UPDATE salary_slips
                SET extracted_text = COALESCE(?1, extracted_text),
                    detected_employee_id = COALESCE(?2, detected_employee_id),
                    detected_name = COALESCE(?3, detected_name),
                    detected_phone = COALESCE(?4, detected_phone),
                    detected_email = COALESCE(?5, detected_email),
                    extraction_method = ?6,
                    match_status = COALESCE(?7, match_status),
                    ocr_status = COALESCE(?8, ocr_status),
                    document_type = COALESCE(?9, document_type),
                    document_confidence = COALESCE(?10, document_confidence),
                    month = COALESCE(?11, month),
                    year = COALESCE(?12, year),
                    updated_at = ?13
                WHERE id = ?14
                "#,
                params![
                    extracted_text,
                    detected_emp_id,
                    detected_name,
                    detected_phone,
                    detected_email,
                    extraction_method,
                    match_status,
                    target_ocr_status,
                    document_type,
                    document_confidence,
                    month,
                    year,
                    now,
                    id
                ],
            )
            .map_err(|e| e.to_string())?;

        Ok(rows > 0)
    }

    pub fn update_ocr_result(
        &self,
        conn: &Connection,
        id: &str,
        extracted_text: Option<&str>,
        detected_emp_id: Option<&str>,
        detected_name: Option<&str>,
        detected_phone: Option<&str>,
        detected_email: Option<&str>,
        extraction_method: &str,
        ocr_status: &str,
        ocr_confidence: Option<f64>,
        ocr_error: Option<&str>,
        document_type: Option<&str>,
        document_confidence: Option<f64>,
        ocr_page_count: Option<u32>,
        ocr_processing_time_ms: Option<u64>,
        month: Option<&str>,
        year: Option<&str>,
    ) -> Result<bool, String> {
        let now = now_timestamp();

        let rows = conn
            .execute(
                r#"
                UPDATE salary_slips
                SET extracted_text = COALESCE(?1, extracted_text),
                    detected_employee_id = COALESCE(?2, detected_employee_id),
                    detected_name = COALESCE(?3, detected_name),
                    detected_phone = COALESCE(?4, detected_phone),
                    detected_email = COALESCE(?5, detected_email),
                    extraction_method = ?6,
                    ocr_status = ?7,
                    ocr_confidence = COALESCE(?8, ocr_confidence),
                    ocr_processed_at = ?9,
                    ocr_error = ?10,
                    document_type = COALESCE(?11, document_type),
                    document_confidence = COALESCE(?12, document_confidence),
                    ocr_attempt_count = COALESCE(ocr_attempt_count, 0) + 1,
                    ocr_page_count = COALESCE(?13, ocr_page_count),
                    ocr_processing_time_ms = COALESCE(?14, ocr_processing_time_ms),
                    month = COALESCE(?15, month),
                    year = COALESCE(?16, year),
                    updated_at = ?9
                WHERE id = ?17
                "#,
                params![
                    extracted_text,
                    detected_emp_id,
                    detected_name,
                    detected_phone,
                    detected_email,
                    extraction_method,
                    ocr_status,
                    ocr_confidence,
                    now,
                    ocr_error,
                    document_type,
                    document_confidence,
                    ocr_page_count,
                    ocr_processing_time_ms,
                    month,
                    year,
                    id
                ],
            )
            .map_err(|e| e.to_string())?;

        Ok(rows > 0)
    }

    pub fn update_match_decision(
        &self,
        conn: &Connection,
        id: &str,
        matched_employee_id: Option<&str>,
        match_status: &str,
        match_confidence: f64,
        match_reason: &str,
        review_note: Option<&str>,
        reviewed_by: Option<&str>,
    ) -> Result<bool, String> {
        let now = now_timestamp();
        let approval_status = if match_status == "MANUALLY_CONFIRMED" || match_status == "CONFIRMED" {
            "APPROVED"
        } else if match_status == "MANUALLY_REJECTED" || match_status == "REJECTED" {
            "REJECTED"
        } else {
            "PENDING"
        };

        let rows = conn
            .execute(
                r#"
                UPDATE salary_slips
                SET matched_employee_id = ?,
                    match_status = ?,
                    match_confidence = ?,
                    match_reason = ?,
                    approval_status = CASE WHEN approval_status = 'APPROVED' THEN 'APPROVED' ELSE ? END,
                    matched_at = ?,
                    reviewed_at = ?,
                    reviewed_by = ?,
                    review_note = ?,
                    updated_at = ?
                WHERE id = ?
                "#,
                params![
                    matched_employee_id,
                    match_status,
                    match_confidence,
                    match_reason,
                    approval_status,
                    now,
                    now,
                    reviewed_by,
                    review_note,
                    now,
                    id
                ],
            )
            .map_err(|e| e.to_string())?;

        Ok(rows > 0)
    }

    pub fn update_approval_status(
        &self,
        conn: &Connection,
        id: &str,
        approval_status: &str,
        review_note: Option<&str>,
        reviewed_by: Option<&str>,
    ) -> Result<bool, String> {
        let now = now_timestamp();
        let rows = conn
            .execute(
                r#"
                UPDATE salary_slips
                SET approval_status = ?,
                    reviewed_at = ?,
                    reviewed_by = ?,
                    review_note = ?,
                    updated_at = ?
                WHERE id = ?
                "#,
                params![
                    approval_status,
                    now,
                    reviewed_by,
                    review_note,
                    now,
                    id
                ],
            )
            .map_err(|e| e.to_string())?;

        Ok(rows > 0)
    }

    pub fn remove_record_by_id(&self, conn: &Connection, id: &str) -> Result<bool, String> {
        let rows = conn
            .execute("DELETE FROM salary_slips WHERE id = ?", params![id])
            .map_err(|e| e.to_string())?;
        Ok(rows > 0)
    }

    pub fn remove_records_batch(&self, conn: &mut Connection, ids: &[String]) -> Result<usize, String> {
        if ids.is_empty() {
            return Ok(0);
        }
        let tx = conn.transaction().map_err(|e| e.to_string())?;
        let mut removed_count = 0;
        for id in ids {
            let rows = tx
                .execute("DELETE FROM salary_slips WHERE id = ?", params![id])
                .map_err(|e| e.to_string())?;
            removed_count += rows;
        }
        tx.commit().map_err(|e| e.to_string())?;
        Ok(removed_count)
    }
}

fn now_timestamp() -> String {
    let start = SystemTime::now();
    let since_the_epoch = start.duration_since(UNIX_EPOCH).unwrap_or_default();
    format!("{}", since_the_epoch.as_secs())
}

fn uuid_simple() -> String {
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    format!("{:x}", nanos)
}

#[cfg(test)]
pub mod tests {
    use super::*;
    use crate::database::connection::DbState;
    use crate::filesystem::file_metadata::DiscoveredFile;

    #[test]
    fn test_salary_slip_repository_crud() {
        let mut conn = Connection::open_in_memory().unwrap();
        DbState::migrate(&conn).unwrap();

        let repo = SalarySlipRepository::new();
        let file = DiscoveredFile {
            file_path: "C:\\Users\\joshi\\Downloads\\SalarySlips\\August\\130.pdf".to_string(),
            file_name: "130.pdf".to_string(),
            file_extension: "pdf".to_string(),
            file_size: 1024,
            modified_at: "1000".to_string(),
            file_hash: "hash-august-130".to_string(),
            month: Some("August".to_string()),
            year: Some("2026".to_string()),
        };

        let (new_c, up_c, un_c, dup_c) = repo.save_or_update_discovered(&mut conn, vec![file]).unwrap();
        assert_eq!(new_c, 1);
        assert_eq!(up_c, 0);
        assert_eq!(un_c, 0);
        assert_eq!(dup_c, 0);

        let slips = repo.find_all(&conn).unwrap();
        assert_eq!(slips.len(), 1);
        assert_eq!(slips[0].month, Some("August".to_string()));
        assert_eq!(slips[0].year, Some("2026".to_string()));
        assert_eq!(slips[0].approval_status, "PENDING");
        assert_eq!(slips[0].ocr_status, "NOT_REQUIRED");
    }

    #[test]
    fn test_multi_month_same_employee_separate_records() {
        let mut conn = Connection::open_in_memory().unwrap();
        DbState::migrate(&conn).unwrap();

        let repo = SalarySlipRepository::new();
        let aug_file = DiscoveredFile {
            file_path: "C:\\Users\\joshi\\Downloads\\SalarySlips\\August\\130.pdf".to_string(),
            file_name: "130.pdf".to_string(),
            file_extension: "pdf".to_string(),
            file_size: 1024,
            modified_at: "1000".to_string(),
            file_hash: "hash-shared-template-130".to_string(),
            month: Some("August".to_string()),
            year: Some("2026".to_string()),
        };

        let sep_file = DiscoveredFile {
            file_path: "C:\\Users\\joshi\\Downloads\\SalarySlips\\September\\130.pdf".to_string(),
            file_name: "130.pdf".to_string(),
            file_extension: "pdf".to_string(),
            file_size: 1024,
            modified_at: "2000".to_string(),
            file_hash: "hash-shared-template-130".to_string(),
            month: Some("September".to_string()),
            year: Some("2026".to_string()),
        };

        repo.save_or_update_discovered(&mut conn, vec![aug_file, sep_file]).unwrap();
        let slips = repo.find_all(&conn).unwrap();
        assert_eq!(slips.len(), 2);
        assert!(slips.iter().any(|s| s.month == Some("August".to_string())));
        assert!(slips.iter().any(|s| s.month == Some("September".to_string())));
    }

    #[test]
    fn test_remove_records_batch() {
        let mut conn = Connection::open_in_memory().unwrap();
        DbState::migrate(&conn).unwrap();

        let repo = SalarySlipRepository::new();
        let file1 = DiscoveredFile {
            file_path: "C:\\SalarySlips\\101.pdf".to_string(),
            file_name: "101.pdf".to_string(),
            file_extension: "pdf".to_string(),
            file_size: 1024,
            modified_at: "1000".to_string(),
            file_hash: "hash-101".to_string(),
            month: None,
            year: None,
        };
        let file2 = DiscoveredFile {
            file_path: "C:\\SalarySlips\\102.pdf".to_string(),
            file_name: "102.pdf".to_string(),
            file_extension: "pdf".to_string(),
            file_size: 1024,
            modified_at: "1000".to_string(),
            file_hash: "hash-102".to_string(),
            month: None,
            year: None,
        };

        repo.save_or_update_discovered(&mut conn, vec![file1, file2]).unwrap();
        let slips = repo.find_all(&conn).unwrap();
        assert_eq!(slips.len(), 2);

        let ids_to_remove = vec![slips[0].id.clone()];
        let removed = repo.remove_records_batch(&mut conn, &ids_to_remove).unwrap();
        assert_eq!(removed, 1);

        let remaining = repo.find_all(&conn).unwrap();
        assert_eq!(remaining.len(), 1);
        assert_eq!(remaining[0].id, slips[1].id);
    }
}
