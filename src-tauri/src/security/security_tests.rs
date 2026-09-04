#[cfg(test)]
mod security_invariants_tests {
    use crate::database::connection::DbState;
    use crate::database::repositories::{DeliveryRepository, EmployeeRepository, SalarySlipRepository, SettingsRepository};
    use crate::filesystem::file_metadata::DiscoveredFile;
    use crate::filesystem::folder_scanner::FolderScanner;
    use crate::models::{CreateEmployeeInput, DeliveryRecord, SaveEmailPayload};
    use crate::security::{redact_secret, sanitize_error_message};
    use crate::services::DeliveryService;
    use rusqlite::Connection;
    use std::fs::{self, File};
    use std::io::Write;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn setup_memory_db() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        DbState::migrate(&conn).unwrap();
        conn
    }

    fn test_uuid() -> String {
        format!("{}", SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos())
    }

    // INVARIANT 1: No credential is logged or exposed in errors
    #[test]
    fn test_invariant_1_credential_redaction() {
        let password = "SuperSecretPassword#2026!";
        let raw_err = format!("Connection failed using password='{}' to port 587", password);
        let sanitized = sanitize_error_message(&redact_secret(&raw_err, password));
        assert!(!sanitized.contains(password));
        assert!(sanitized.contains("[REDACTED]"));

        let token = "EAABw1234567890MetaTokenVal";
        let raw_wa = format!("Failed request with Bearer {}", token);
        let sanitized_wa = sanitize_error_message(&redact_secret(&raw_wa, token));
        assert!(!sanitized_wa.contains(token));
        assert!(sanitized_wa.contains("Bearer [REDACTED]"));
    }

    // INVARIANT 2, 3, 4: Delivery blocking for Unapproved, CONFLICT, and UNMATCHED records
    #[test]
    fn test_invariants_2_3_4_delivery_blocking() {
        let mut conn = setup_memory_db();
        let delivery_service = DeliveryService::new();
        let slip_repo = SalarySlipRepository::new();
        let emp_repo = EmployeeRepository::new();

        // Add employee
        emp_repo.bulk_insert(&mut conn, vec![CreateEmployeeInput {
            employee_id: "EMP-001".into(),
            name: "John Doe".into(),
            phone: Some("9876543210".into()),
            whatsapp_number: None,
            email: Some("john@example.com".into()),
            department: Some("Engineering".into()),
            designation: Some("Developer".into()),
        }]).unwrap();

        // 1. Unapproved slip (PENDING)
        let unapproved_file = DiscoveredFile {
            file_path: "C:\\Slips\\slip1.pdf".into(),
            file_name: "slip1.pdf".into(),
            file_extension: "pdf".into(),
            file_size: 1024,
            modified_at: "1000".into(),
            file_hash: "hash_unapproved".into(),
            month: None,
            year: None,
        };
        slip_repo.save_or_update_discovered(&mut conn, vec![unapproved_file]).unwrap();
        let mut slips = slip_repo.find_all(&conn).unwrap();
        let unapproved_id = slips[0].id.clone();
        slip_repo.update_match_decision(&conn, &unapproved_id, Some("EMP-001"), "EXACT", 1.0, "Auto match", None, None).unwrap();
        // Force approval_status = PENDING
        slip_repo.update_approval_status(&conn, &unapproved_id, "PENDING", None, None).unwrap();

        let batch_res = delivery_service.send_batch(&conn, &[unapproved_id.clone()], "EMAIL").unwrap();
        assert_eq!(batch_res.sent, 0);
        assert_eq!(batch_res.skipped, 1);

        // 2. CONFLICT slip (even if someone maliciously sets approval_status = APPROVED)
        let conflict_file = DiscoveredFile {
            file_path: "C:\\Slips\\slip_conflict.pdf".into(),
            file_name: "slip_conflict.pdf".into(),
            file_extension: "pdf".into(),
            file_size: 1024,
            modified_at: "1000".into(),
            file_hash: "hash_conflict".into(),
            month: None,
            year: None,
        };
        slip_repo.save_or_update_discovered(&mut conn, vec![conflict_file]).unwrap();
        slips = slip_repo.find_all(&conn).unwrap();
        let conflict_slip = slips.iter().find(|s| s.file_hash == "hash_conflict").unwrap();
        let conflict_id = conflict_slip.id.clone();
        slip_repo.update_match_decision(&conn, &conflict_id, Some("EMP-001"), "CONFLICT", 0.5, "Conflict detected", None, None).unwrap();
        // Try forcing approval_status to APPROVED
        conn.execute("UPDATE salary_slips SET approval_status = 'APPROVED' WHERE id = ?", [&conflict_id]).unwrap();

        let batch_conflict = delivery_service.send_batch(&conn, &[conflict_id.clone()], "EMAIL").unwrap();
        assert_eq!(batch_conflict.sent, 0);
        assert_eq!(batch_conflict.skipped, 1, "CONFLICT slip must be skipped regardless of approval_status");

        // 3. UNMATCHED slip
        let unmatched_file = DiscoveredFile {
            file_path: "C:\\Slips\\slip_unmatched.pdf".into(),
            file_name: "slip_unmatched.pdf".into(),
            file_extension: "pdf".into(),
            file_size: 1024,
            modified_at: "1000".into(),
            file_hash: "hash_unmatched".into(),
            month: None,
            year: None,
        };
        slip_repo.save_or_update_discovered(&mut conn, vec![unmatched_file]).unwrap();
        slips = slip_repo.find_all(&conn).unwrap();
        let unmatched_slip = slips.iter().find(|s| s.file_hash == "hash_unmatched").unwrap();
        let unmatched_id = unmatched_slip.id.clone();
        conn.execute("UPDATE salary_slips SET approval_status = 'APPROVED', match_status = 'UNMATCHED' WHERE id = ?", [&unmatched_id]).unwrap();

        let batch_unmatched = delivery_service.send_batch(&conn, &[unmatched_id], "EMAIL").unwrap();
        assert_eq!(batch_unmatched.sent, 0);
        assert_eq!(batch_unmatched.skipped, 1, "UNMATCHED slip must never be delivered");
    }

    // INVARIANT 5: Physical salary-slip PDFs are NEVER deleted by DB record deletion
    #[test]
    fn test_invariant_5_physical_pdf_preservation_on_db_deletion() {
        let temp_dir = std::env::temp_dir().join(format!("nexora_preserve_test_{}", test_uuid()));
        fs::create_dir_all(&temp_dir).unwrap();

        let pdf_path = temp_dir.join("real_employee_salary.pdf");
        {
            let mut f = File::create(&pdf_path).unwrap();
            f.write_all(b"%PDF-1.4 Important HR Payroll Document").unwrap();
        }
        assert!(pdf_path.exists());

        let mut conn = setup_memory_db();
        let slip_repo = SalarySlipRepository::new();
        let file = DiscoveredFile {
            file_path: pdf_path.to_str().unwrap().to_string(),
            file_name: "real_employee_salary.pdf".into(),
            file_extension: "pdf".into(),
            file_size: 1024,
            modified_at: "1000".into(),
            file_hash: "hash_preserve".into(),
            month: None,
            year: None,
        };
        slip_repo.save_or_update_discovered(&mut conn, vec![file]).unwrap();
        let slips = slip_repo.find_all(&conn).unwrap();
        assert_eq!(slips.len(), 1);

        // Delete from database
        let deleted = slip_repo.remove_records_batch(&mut conn, &[slips[0].id.clone()]).unwrap();
        assert_eq!(deleted, 1);
        assert_eq!(slip_repo.find_all(&conn).unwrap().len(), 0);

        // Verify physical file STILL exists on disk!
        assert!(pdf_path.exists(), "Physical PDF file must NEVER be deleted when DB record is removed!");

        let _ = fs::remove_dir_all(&temp_dir);
    }

    // INVARIANT 6: Replace All Employees cannot leave database partially replaced
    #[test]
    fn test_invariant_6_replace_all_employees_transaction_safety() {
        let mut conn = setup_memory_db();
        let emp_repo = EmployeeRepository::new();

        // Seed 2 employees
        emp_repo.bulk_insert(&mut conn, vec![
            CreateEmployeeInput {
                employee_id: "EMP-101".into(),
                name: "Alice".into(),
                phone: None,
                whatsapp_number: None,
                email: None,
                department: None,
                designation: None,
            },
            CreateEmployeeInput {
                employee_id: "EMP-102".into(),
                name: "Bob".into(),
                phone: None,
                whatsapp_number: None,
                email: None,
                department: None,
                designation: None,
            },
        ]).unwrap();

        assert_eq!(emp_repo.find_all(&conn).unwrap().len(), 2);

        // Attempt replacement where second employee has a duplicate/colliding employee_id that violates UNIQUE constraint
        let bad_replacement = vec![
            CreateEmployeeInput {
                employee_id: "EMP-201".into(),
                name: "Charlie".into(),
                phone: None,
                whatsapp_number: None,
                email: None,
                department: None,
                designation: None,
            },
            CreateEmployeeInput {
                employee_id: "EMP-201".into(), // Duplicate ID inside batch -> violates UNIQUE(employee_id)
                name: "David".into(),
                phone: None,
                whatsapp_number: None,
                email: None,
                department: None,
                designation: None,
            },
        ];

        let result = emp_repo.replace_all(&mut conn, bad_replacement);
        assert!(result.is_err(), "Duplicate ID in batch must fail unique constraint");

        // Verify full rollback: Alice and Bob MUST still exist!
        let current_employees = emp_repo.find_all(&conn).unwrap();
        assert_eq!(current_employees.len(), 2, "Database must not be left in partially replaced state");
        assert!(current_employees.iter().any(|e| e.employee_id == "EMP-101"));
        assert!(current_employees.iter().any(|e| e.employee_id == "EMP-102"));
    }

    // INVARIANT 7: OCR failure cannot erase previously valid detected employee metadata
    #[test]
    fn test_invariant_7_ocr_failure_preserves_detected_metadata() {
        let mut conn = setup_memory_db();
        let slip_repo = SalarySlipRepository::new();

        let file = DiscoveredFile {
            file_path: "C:\\Slips\\valid_metadata.pdf".into(),
            file_name: "valid_metadata.pdf".into(),
            file_extension: "pdf".into(),
            file_size: 1024,
            modified_at: "1000".into(),
            file_hash: "hash_metadata".into(),
            month: Some("August".into()),
            year: Some("2026".into()),
        };
        slip_repo.save_or_update_discovered(&mut conn, vec![file]).unwrap();
        let slips = slip_repo.find_all(&conn).unwrap();
        let id = slips[0].id.clone();

        // Simulate successful embedded text extraction with detected employee ID
        slip_repo.update_extraction_result(
            &conn,
            &id,
            Some("Employee ID: EMP-999, Name: Alice Smith"),
            Some("EMP-999"),
            Some("Alice Smith"),
            None,
            None,
            "EMBEDDED_TEXT",
            Some("EXACT"),
            Some("SALARY_SLIP"),
            Some(1.0),
            Some("NOT_REQUIRED"),
            None,
            None,
        ).unwrap();

        let before = slip_repo.find_by_id(&conn, &id).unwrap().unwrap();
        assert_eq!(before.detected_employee_id.as_deref(), Some("EMP-999"));
        assert_eq!(before.extraction_method, "EMBEDDED_TEXT");

        // Simulate subsequent OCR failure (e.g. renderer or engine error)
        let fallback_method = if before.extraction_method == "NOT_IDENTIFIED" { "NOT_IDENTIFIED" } else { &before.extraction_method };
        slip_repo.update_ocr_result(
            &conn,
            &id,
            None,
            None,
            None,
            None,
            None,
            fallback_method,
            "ENGINE_ERROR",
            None,
            Some("OCR engine timeout"),
            None,
            None,
            None,
            Some(100),
            None,
            None,
        ).unwrap();

        let after = slip_repo.find_by_id(&conn, &id).unwrap().unwrap();
        assert_eq!(after.detected_employee_id.as_deref(), Some("EMP-999"), "Detected employee ID must not be wiped by OCR failure");
        assert_eq!(after.detected_name.as_deref(), Some("Alice Smith"), "Detected employee name must not be wiped by OCR failure");
        assert_eq!(after.extraction_method, "EMBEDDED_TEXT", "Extraction method must not be downgraded by OCR failure");
        assert_eq!(after.ocr_status, "ENGINE_ERROR");
    }

    // INVARIANT 8: OCR RUNNING and Delivery PROCESSING states are recoverable after application restart
    #[test]
    fn test_invariant_8_restart_recovery() {
        let mut conn = setup_memory_db();
        let slip_repo = SalarySlipRepository::new();
        let delivery_repo = DeliveryRepository::new();

        // 1. Insert slip stuck in RUNNING
        let file = DiscoveredFile {
            file_path: "C:\\Slips\\stuck.pdf".into(),
            file_name: "stuck.pdf".into(),
            file_extension: "pdf".into(),
            file_size: 1024,
            modified_at: "1000".into(),
            file_hash: "hash_stuck".into(),
            month: None,
            year: None,
        };
        slip_repo.save_or_update_discovered(&mut conn, vec![file]).unwrap();
        let slip = slip_repo.find_all(&conn).unwrap().pop().unwrap();
        conn.execute("UPDATE salary_slips SET ocr_status = 'RUNNING' WHERE id = ?", [&slip.id]).unwrap();

        // 2. Insert delivery record stuck in PROCESSING
        let record = DeliveryRecord {
            id: "del_stuck_1".into(),
            salary_slip_id: slip.id.clone(),
            employee_id: "EMP-001".into(),
            channel: "EMAIL".into(),
            status: "PROCESSING".into(),
            recipient: "user@example.com".into(),
            provider: "SMTP".into(),
            message: None,
            error_code: None,
            error_message: None,
            provider_message_id: None,
            attempt_number: 1,
            created_at: "1000".into(),
            started_at: Some("1000".into()),
            completed_at: None,
            employee_name: Some("User".into()),
            month: None,
            year: None,
        };
        delivery_repo.create_record(&conn, &record).unwrap();

        // Execute recovery procedure (as called on DbState::new)
        DbState::recover_stuck_records(&conn).unwrap();

        // Verify OCR status was reset to PENDING
        let recovered_slip = slip_repo.find_by_id(&conn, &slip.id).unwrap().unwrap();
        assert_eq!(recovered_slip.ocr_status, "PENDING");
        assert!(recovered_slip.ocr_error.unwrap().contains("interrupted by application shutdown"));

        // Verify delivery record was reset to FAILED with INTERRUPTED_SHUTDOWN
        let recovered_del = delivery_repo.find_by_id(&conn, "del_stuck_1").unwrap().unwrap();
        assert_eq!(recovered_del.status, "FAILED");
        assert_eq!(recovered_del.error_code.as_deref(), Some("INTERRUPTED_SHUTDOWN"));
    }

    // INVARIANT 9: Delivery retry preserves historical attempts
    #[test]
    fn test_invariant_9_delivery_retry_preserves_historical_attempts() {
        let mut conn = setup_memory_db();
        let slip_repo = SalarySlipRepository::new();
        let emp_repo = EmployeeRepository::new();
        let delivery_repo = DeliveryRepository::new();

        // Add employee and approved slip
        emp_repo.bulk_insert(&mut conn, vec![CreateEmployeeInput {
            employee_id: "EMP-777".into(),
            name: "Sarah Connor".into(),
            phone: None,
            whatsapp_number: None,
            email: Some("sarah@resistance.org".into()),
            department: None,
            designation: None,
        }]).unwrap();

        let temp_dir = std::env::temp_dir().join(format!("nexora_retry_test_{}", test_uuid()));
        fs::create_dir_all(&temp_dir).unwrap();
        let pdf_path = temp_dir.join("sarah.pdf");
        File::create(&pdf_path).unwrap().write_all(b"%PDF-1.4 Sarah slip").unwrap();

        let file = DiscoveredFile {
            file_path: pdf_path.to_str().unwrap().into(),
            file_name: "sarah.pdf".into(),
            file_extension: "pdf".into(),
            file_size: 1024,
            modified_at: "1000".into(),
            file_hash: "hash_sarah".into(),
            month: None,
            year: None,
        };
        slip_repo.save_or_update_discovered(&mut conn, vec![file]).unwrap();
        let slip = slip_repo.find_all(&conn).unwrap().pop().unwrap();
        slip_repo.update_match_decision(&conn, &slip.id, Some("EMP-777"), "EXACT", 1.0, "Auto match", None, None).unwrap();
        slip_repo.update_approval_status(&conn, &slip.id, "APPROVED", None, None).unwrap();

        // Create attempt 1: FAILED
        let attempt1 = DeliveryRecord {
            id: "del_attempt_1".into(),
            salary_slip_id: slip.id.clone(),
            employee_id: "EMP-777".into(),
            channel: "EMAIL".into(),
            status: "FAILED".into(),
            recipient: "sarah@resistance.org".into(),
            provider: "SMTP".into(),
            message: None,
            error_code: Some("SMTP_CONNECT_FAILED".into()),
            error_message: Some("Connection timed out".into()),
            provider_message_id: None,
            attempt_number: 1,
            created_at: "1000".into(),
            started_at: Some("1000".into()),
            completed_at: Some("1005".into()),
            employee_name: Some("Sarah Connor".into()),
            month: None,
            year: None,
        };
        delivery_repo.create_record(&conn, &attempt1).unwrap();

        let delivery_service = DeliveryService::new();
        let _ = delivery_service.retry_delivery_record(&conn, "del_attempt_1");

        // Verify history: BOTH attempt 1 and attempt 2 must exist in DB!
        let records = delivery_repo.find_all(&conn).unwrap();
        assert_eq!(records.len(), 2, "Historical delivery attempts must be preserved!");
        assert!(records.iter().any(|r| r.attempt_number == 1 && r.status == "FAILED"));
        assert!(records.iter().any(|r| r.attempt_number == 2));

        let _ = fs::remove_dir_all(&temp_dir);
    }

    // INVARIANT 10: WhatsApp remains safely unconfigured without fake credentials
    #[test]
    fn test_invariant_10_whatsapp_unconfigured_safety() {
        let conn = setup_memory_db();
        let repo = SettingsRepository::new();
        let wa_cfg = repo.get_whatsapp_config(&conn).unwrap();

        // Should be unconfigured by default
        assert!(wa_cfg.api_url.is_empty());
        assert!(wa_cfg.api_token.is_none());
        assert!(wa_cfg.phone_number_id.is_empty());

        let app_settings = repo.get_app_settings_response(&conn).unwrap();
        assert!(!app_settings.whatsapp_config.configured);
        assert!(!app_settings.whatsapp_config.has_access_token);
    }

    // INVARIANT 11: SQL Injection Protection
    #[test]
    fn test_invariant_11_sql_injection_defense() {
        let mut conn = setup_memory_db();
        let emp_repo = EmployeeRepository::new();

        let sql_injection_id = "EMP'; DROP TABLE employees; --";
        let sql_injection_name = "Robert'); DROP TABLE salary_slips; --";

        let res = emp_repo.bulk_insert(&mut conn, vec![CreateEmployeeInput {
            employee_id: sql_injection_id.into(),
            name: sql_injection_name.into(),
            phone: None,
            whatsapp_number: None,
            email: None,
            department: None,
            designation: None,
        }]);

        assert!(res.is_ok(), "Parameterized query handles injection strings safely");

        // Verify tables still exist and are unharmed
        let emp_count: i64 = conn.query_row("SELECT count(*) FROM employees", [], |r| r.get(0)).unwrap();
        assert_eq!(emp_count, 1);
        let slip_count: i64 = conn.query_row("SELECT count(*) FROM salary_slips", [], |r| r.get(0)).unwrap();
        assert_eq!(slip_count, 0);

        let emp = emp_repo.find_by_id(&conn, sql_injection_id).unwrap();
        assert!(emp.is_some());
        assert_eq!(emp.unwrap().name, sql_injection_name);
    }

    // INVARIANT 12: Unsupported dropped files cannot enter PDF/OCR processing
    #[test]
    fn test_invariant_12_unsupported_dropped_files() {
        let temp_dir = std::env::temp_dir().join(format!("nexora_drop_inv_test_{}", test_uuid()));
        fs::create_dir_all(&temp_dir).unwrap();

        let bad_files = vec![
            ("invoice.docx", b"PK\x03\x04 fake docx" as &[u8]),
            ("script.ps1", b"Write-Host 'hello'"),
            ("payload.bat", b"@echo off\npause"),
            ("renamed_exec.pdf", b"MZ\x90\x00\x03\x00"), // Fake PDF
            ("zero_byte.pdf", b""),                      // 0 byte
        ];

        let mut paths = Vec::new();
        for (name, content) in &bad_files {
            let p = temp_dir.join(name);
            File::create(&p).unwrap().write_all(content).unwrap();
            paths.push(p.to_str().unwrap().to_string());
        }

        let scanner = FolderScanner::new();
        let (discovered, diag) = scanner.scan_paths(&paths).unwrap();

        // Zero files should be discovered
        assert_eq!(discovered.len(), 0, "No unsupported or fake PDF files should ever be ingested");
        assert_eq!(diag.pdf_count, 0);
        assert_eq!(diag.scan_errors.len(), 5);

        for err in &diag.scan_errors {
            assert_eq!(err.error_kind, "UnsupportedFileType");
        }

        let _ = fs::remove_dir_all(&temp_dir);
    }

    // DPAPI Credential Store Test at rest in SQLite
    #[test]
    fn test_dpapi_credential_store_at_rest() {
        let conn = setup_memory_db();
        let repo = SettingsRepository::new();

        let test_pass = "Complex#Secret#991!";
        let payload = SaveEmailPayload {
            host: Some("smtp.company.com".into()),
            port: Some(587),
            username: Some("hr@company.com".into()),
            password: Some(test_pass.into()),
            from_address: Some("hr@company.com".into()),
            from_name: Some("HR".into()),
            security_mode: Some("STARTTLS".into()),
            use_tls: Some(true),
            enabled: Some(true),
        };

        repo.save_email_config(&conn, &payload).unwrap();

        // Check SQLite table directly: must be encrypted with DPAPI prefix and NOT contain plaintext
        let raw_val = repo.get_value(&conn, "email_config").unwrap().unwrap();
        assert!(!raw_val.contains(test_pass));
        assert!(raw_val.contains("enc:dpapi:"));

        // Reading via repository API must decrypt seamlessly
        let loaded = repo.get_email_config(&conn).unwrap();
        assert_eq!(loaded.password.as_deref(), Some(test_pass));
    }
}
