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
                       match_confidence, match_status, duplicate_of_id, created_at, updated_at
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
                    created_at: row.get(13)?,
                    updated_at: row.get(14)?,
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
                       match_confidence, match_status, duplicate_of_id, created_at, updated_at
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
                    created_at: row.get(13)?,
                    updated_at: row.get(14)?,
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
            // 1. PATH IDENTITY CHECK: Check if file_path already exists in SQLite
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
                    // Content modified on disk for existing file path
                    tx.execute(
                        "UPDATE salary_slips SET file_hash = ?, file_name = ?, updated_at = ? WHERE id = ?",
                        params![file.file_hash, file.file_name, now, id],
                    )
                    .map_err(|e| e.to_string())?;
                    updated_count += 1;
                }
            } else {
                // 2. CONTENT IDENTITY CHECK: New file path, check if file_hash already exists in DB
                let canonical_id: Option<String> = tx
                    .query_row(
                        "SELECT id FROM salary_slips WHERE file_hash = ? ORDER BY created_at ASC LIMIT 1",
                        params![file.file_hash],
                        |row| row.get(0),
                    )
                    .ok();

                let id = format!("slip-{}", uuid_simple());

                if let Some(canonical) = canonical_id {
                    // Content Duplicate Discovered!
                    tx.execute(
                        r#"
                        INSERT INTO salary_slips (
                            id, file_path, file_name, file_hash, detected_employee_id, detected_name,
                            detected_phone, detected_email, extraction_method, extracted_text,
                            match_confidence, match_status, duplicate_of_id, created_at, updated_at
                        ) VALUES (?, ?, ?, ?, NULL, NULL, NULL, NULL, 'NOT_IDENTIFIED', NULL, 0.0, 'DUPLICATE_CONTENT', ?, ?, ?)
                        "#,
                        params![id, file.file_path, file.file_name, file.file_hash, canonical, now, now],
                    )
                    .map_err(|e| e.to_string())?;
                    duplicate_count += 1;
                } else {
                    // New Independent PDF Discovered!
                    tx.execute(
                        r#"
                        INSERT INTO salary_slips (
                            id, file_path, file_name, file_hash, detected_employee_id, detected_name,
                            detected_phone, detected_email, extraction_method, extracted_text,
                            match_confidence, match_status, duplicate_of_id, created_at, updated_at
                        ) VALUES (?, ?, ?, ?, NULL, NULL, NULL, NULL, 'NOT_IDENTIFIED', NULL, 0.0, 'UNMATCHED', NULL, ?, ?)
                        "#,
                        params![id, file.file_path, file.file_name, file.file_hash, now, now],
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
        match_status: &str,
    ) -> Result<bool, String> {
        let now = now_timestamp();
        let rows = conn
            .execute(
                r#"
                UPDATE salary_slips
                SET extracted_text = ?,
                    detected_employee_id = ?,
                    detected_name = ?,
                    detected_phone = ?,
                    detected_email = ?,
                    extraction_method = ?,
                    match_status = ?,
                    updated_at = ?
                WHERE id = ?
                "#,
                params![
                    extracted_text,
                    detected_emp_id,
                    detected_name,
                    detected_phone,
                    detected_email,
                    extraction_method,
                    match_status,
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
