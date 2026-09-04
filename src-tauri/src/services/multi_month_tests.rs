use rusqlite::Connection;
use crate::database::connection::DbState;
use crate::database::repositories::{DeliveryRepository, SalarySlipRepository};
use crate::messaging::email::replace_placeholders;
use crate::models::DeliveryRecord;
use crate::services::{DeliveryService, SalarySlipService};

fn insert_test_slip(
    conn: &Connection,
    id: &str,
    file_path: &str,
    file_name: &str,
    month: Option<&str>,
    year: Option<&str>,
    detected_emp_id: Option<&str>,
    detected_name: Option<&str>,
    approval_status: &str,
) {
    conn.execute(
        r#"
        INSERT INTO salary_slips (
            id, file_path, file_name, file_hash, detected_employee_id, detected_name,
            detected_phone, detected_email, extraction_method, extracted_text,
            match_confidence, match_status, duplicate_of_id, month, year,
            approval_status, ocr_status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, 'TEXT_EMBEDDED', 'text', 1.0, 'UNMATCHED', NULL, ?, ?, ?, 'NOT_REQUIRED', '1000', '1000')
        "#,
        rusqlite::params![
            id,
            file_path,
            file_name,
            format!("hash_{}", id),
            detected_emp_id,
            detected_name,
            month,
            year,
            approval_status
        ],
    ).unwrap();
}

fn insert_test_employee(
    conn: &Connection,
    id: &str,
    emp_id: &str,
    name: &str,
    email: &str,
) {
    conn.execute(
        r#"
        INSERT INTO employees (
            id, employee_id, name, phone, whatsapp_number, email, department, designation, created_at, updated_at
        ) VALUES (?, ?, ?, '+1234567890', '+1234567890', ?, 'Engineering', 'Developer', '1000', '1000')
        "#,
        rusqlite::params![id, emp_id, name, email],
    ).unwrap();
}

#[test]
fn test_dynamic_delivery_month_year() {
    let subject_template = "Salary Slip for {{month}} {{year}} - {{employee_name}}";
    let body_template = "Dear {{name}},\n\nYour salary slip for {{month}} {{year}} is attached.\n\n{{company_name}}";

    // Test September 2026
    let sep_subj = replace_placeholders(subject_template, "Alice", "EMP001", "Nexora Corp", "September", "2026");
    let sep_body = replace_placeholders(body_template, "Alice", "EMP001", "Nexora Corp", "September", "2026");
    assert_eq!(sep_subj, "Salary Slip for September 2026 - Alice");
    assert!(sep_body.contains("September 2026"));
    assert!(!sep_subj.contains("August"));
    assert!(!sep_body.contains("August"));

    // Test November 2026
    let nov_subj = replace_placeholders(subject_template, "Bob", "EMP002", "Nexora Corp", "November", "2026");
    let nov_body = replace_placeholders(body_template, "Bob", "EMP002", "Nexora Corp", "November", "2026");
    assert_eq!(nov_subj, "Salary Slip for November 2026 - Bob");
    assert!(nov_body.contains("November 2026"));
    assert!(!nov_subj.contains("August"));

    // Test December 2026
    let dec_subj = replace_placeholders(subject_template, "Charlie", "EMP003", "Nexora Corp", "December", "2026");
    assert_eq!(dec_subj, "Salary Slip for December 2026 - Charlie");
}

#[test]
fn test_document_month_year_persistence() {
    let conn = Connection::open_in_memory().unwrap();
    DbState::migrate(&conn).unwrap();

    let slip_repo = SalarySlipRepository::new();
    insert_test_slip(&conn, "slip_pers_1", "C:/slips/slip1.pdf", "slip1.pdf", None, None, Some("EMP001"), Some("Alice"), "PENDING");

    // Verify initially null
    let fetched = slip_repo.find_by_id(&conn, "slip_pers_1").unwrap().unwrap();
    assert_eq!(fetched.month, None);
    assert_eq!(fetched.year, None);

    // Update extraction result with extracted November 2026
    slip_repo.update_extraction_result(
        &conn,
        "slip_pers_1",
        Some("Raw text for November"),
        Some("EMP001"),
        Some("Alice"),
        None,
        None,
        "TEXT_EMBEDDED",
        Some("UNMATCHED"),
        Some("SALARY_SLIP"),
        Some(100.0),
        Some("NOT_REQUIRED"),
        Some("November"),
        Some("2026"),
    ).unwrap();

    let fetched2 = slip_repo.find_by_id(&conn, "slip_pers_1").unwrap().unwrap();
    assert_eq!(fetched2.month.as_deref(), Some("November"));
    assert_eq!(fetched2.year.as_deref(), Some("2026"));

    // Safe COALESCE: calling update_ocr_result with None does NOT overwrite existing valid period
    slip_repo.update_ocr_result(
        &conn,
        "slip_pers_1",
        None,
        Some("EMP001"),
        Some("Alice"),
        None,
        None,
        "TEXT_EMBEDDED",
        "NOT_REQUIRED",
        Some(100.0),
        None,
        Some("SALARY_SLIP"),
        Some(100.0),
        Some(1),
        Some(50),
        None,
        None,
    ).unwrap();

    let fetched3 = slip_repo.find_by_id(&conn, "slip_pers_1").unwrap().unwrap();
    assert_eq!(fetched3.month.as_deref(), Some("November"), "Safe COALESCE must protect existing month");
    assert_eq!(fetched3.year.as_deref(), Some("2026"), "Safe COALESCE must protect existing year");
}

#[test]
fn test_approved_historical_slip_not_reset_by_matching() {
    let mut conn = Connection::open_in_memory().unwrap();
    DbState::migrate(&conn).unwrap();

    let slip_repo = SalarySlipRepository::new();
    let slip_service = SalarySlipService::new();

    // 1. Create employee
    insert_test_employee(&conn, "emp_uuid_1", "EMP001", "Alice Smith", "alice@example.com");

    // 2. Create September slip
    insert_test_slip(&conn, "slip_sep_001", "C:/slips/sep/EMP001.pdf", "EMP001.pdf", Some("September"), Some("2026"), Some("EMP001"), Some("Alice Smith"), "PENDING");

    // 3. Match September
    let match_res = slip_service.run_matching_engine(&mut conn).unwrap();
    assert_eq!(match_res.exact_matches, 1);

    // 4. Approve September
    slip_repo.update_approval_status(&conn, "slip_sep_001", "APPROVED", None, Some("HR Manager")).unwrap();
    let sep_verified = slip_repo.find_by_id(&conn, "slip_sep_001").unwrap().unwrap();
    assert_eq!(sep_verified.approval_status, "APPROVED");

    // 5. Add November slip for same employee
    insert_test_slip(&conn, "slip_nov_001", "C:/slips/nov/EMP001.pdf", "EMP001.pdf", Some("November"), Some("2026"), Some("EMP001"), Some("Alice Smith"), "PENDING");

    // 6. Re-run matching engine
    let match_res_2 = slip_service.run_matching_engine(&mut conn).unwrap();
    // September slip was already approved, so engine increments already_reviewed and matches November
    assert_eq!(match_res_2.already_reviewed, 1, "September slip should be counted as already reviewed");
    assert_eq!(match_res_2.exact_matches, 1, "November slip matched");

    // 7. Verify September remains APPROVED
    let sep_after = slip_repo.find_by_id(&conn, "slip_sep_001").unwrap().unwrap();
    assert_eq!(sep_after.approval_status, "APPROVED", "September slip MUST remain APPROVED after matching re-run");

    // 8. Verify November is independently processable
    let nov_after = slip_repo.find_by_id(&conn, "slip_nov_001").unwrap().unwrap();
    assert_eq!(nov_after.approval_status, "PENDING", "November slip starts PENDING");
    assert_eq!(nov_after.match_status, "EXACT_MATCH");
    assert_eq!(nov_after.matched_employee_id.as_deref(), Some("emp_uuid_1"));
}

#[test]
fn test_delivery_history_includes_salary_period() {
    let conn = Connection::open_in_memory().unwrap();
    DbState::migrate(&conn).unwrap();

    let delivery_repo = DeliveryRepository::new();

    // Create salary slip with October 2026
    insert_test_slip(&conn, "slip_oct_100", "C:/slips/oct/EMP002.pdf", "EMP002.pdf", Some("October"), Some("2026"), Some("EMP002"), Some("Bob"), "APPROVED");

    // Create delivery record with month/year None initially in the delivery record row
    let record = DeliveryRecord {
        id: "del_oct_1".to_string(),
        salary_slip_id: "slip_oct_100".to_string(),
        employee_id: "EMP002".to_string(),
        channel: "EMAIL".to_string(),
        status: "SENT".to_string(),
        recipient: "bob@example.com".to_string(),
        provider: "SMTP".to_string(),
        message: Some("Salary slip for October 2026".to_string()),
        error_code: None,
        error_message: None,
        provider_message_id: Some("msg-oct-1".to_string()),
        attempt_number: 1,
        created_at: "2000".to_string(),
        started_at: Some("2000".to_string()),
        completed_at: Some("2001".to_string()),
        employee_name: Some("Bob".to_string()),
        month: None, // intentionally None here to test that SQL query joins salary_slips and populates it!
        year: None,
    };
    delivery_repo.create_record(&conn, &record).unwrap();

    // Query find_all
    let all_records = delivery_repo.find_all(&conn).unwrap();
    assert_eq!(all_records.len(), 1);
    assert_eq!(all_records[0].month.as_deref(), Some("October"), "Delivery record MUST expose salary_slips.month");
    assert_eq!(all_records[0].year.as_deref(), Some("2026"), "Delivery record MUST expose salary_slips.year");

    // Query find_by_id
    let by_id = delivery_repo.find_by_id(&conn, "del_oct_1").unwrap().unwrap();
    assert_eq!(by_id.month.as_deref(), Some("October"));
    assert_eq!(by_id.year.as_deref(), Some("2026"));
}

#[test]
fn test_same_employee_multiple_months() {
    let conn = Connection::open_in_memory().unwrap();
    DbState::migrate(&conn).unwrap();

    let slip_repo = SalarySlipRepository::new();

    insert_test_slip(&conn, "slip_emp1_sep", "C:/slips/sep/EMP001.pdf", "EMP001.pdf", Some("September"), Some("2026"), Some("EMP001"), Some("Alice"), "PENDING");
    insert_test_slip(&conn, "slip_emp1_oct", "C:/slips/oct/EMP001.pdf", "EMP001.pdf", Some("October"), Some("2026"), Some("EMP001"), Some("Alice"), "PENDING");
    insert_test_slip(&conn, "slip_emp1_nov", "C:/slips/nov/EMP001.pdf", "EMP001.pdf", Some("November"), Some("2026"), Some("EMP001"), Some("Alice"), "PENDING");

    let all = slip_repo.find_all(&conn).unwrap();
    assert_eq!(all.len(), 3);
    assert_eq!(all.iter().filter(|s| s.detected_employee_id.as_deref() == Some("EMP001")).count(), 3);
}

fn create_temp_test_pdf(name: &str) -> std::path::PathBuf {
    let p = std::env::temp_dir().join(name);
    let _ = std::fs::write(&p, b"%PDF-1.4 dummy salary slip test content");
    p
}

#[test]
fn test_previous_month_not_resent() {
    let conn = Connection::open_in_memory().unwrap();
    DbState::migrate(&conn).unwrap();

    let delivery_repo = DeliveryRepository::new();
    let delivery_service = DeliveryService::new();

    let pdf_path = create_temp_test_pdf("test_prev_sep.pdf");
    let pdf_str = pdf_path.to_str().unwrap();

    insert_test_employee(&conn, "emp_1", "EMP001", "Alice", "alice@example.com");

    insert_test_slip(&conn, "slip_sep", pdf_str, "sep.pdf", Some("September"), Some("2026"), Some("EMP001"), Some("Alice"), "APPROVED");
    conn.execute("UPDATE salary_slips SET matched_employee_id = 'emp_1', match_status = 'EXACT_MATCH' WHERE id = 'slip_sep'", []).unwrap();

    // Mark September as already SENT
    let del = DeliveryRecord {
        id: "del_sep_sent".to_string(),
        salary_slip_id: "slip_sep".to_string(),
        employee_id: "EMP001".to_string(),
        channel: "EMAIL".to_string(),
        status: "SENT".to_string(),
        recipient: "alice@example.com".to_string(),
        provider: "SMTP".to_string(),
        message: Some("September slip".to_string()),
        error_code: None,
        error_message: None,
        provider_message_id: Some("msg-sep".to_string()),
        attempt_number: 1,
        created_at: "1000".to_string(),
        started_at: Some("1000".to_string()),
        completed_at: Some("1001".to_string()),
        employee_name: Some("Alice".to_string()),
        month: Some("September".to_string()),
        year: Some("2026".to_string()),
    };
    delivery_repo.create_record(&conn, &del).unwrap();

    // Preview September slip again
    let prev = delivery_service.preview_batch(&conn, &["slip_sep".to_string()], "EMAIL").unwrap();
    assert_eq!(prev.already_sent_count, 1, "September slip must be flagged as already_sent");
    assert_eq!(prev.eligible_count, 0, "September slip should NOT be eligible to send again");

    let _ = std::fs::remove_file(&pdf_path);
}

#[test]
fn test_new_month_independently_deliverable() {
    let conn = Connection::open_in_memory().unwrap();
    DbState::migrate(&conn).unwrap();

    let delivery_repo = DeliveryRepository::new();
    let delivery_service = DeliveryService::new();

    let sep_path = create_temp_test_pdf("test_indep_sep.pdf");
    let nov_path = create_temp_test_pdf("test_indep_nov.pdf");
    let sep_str = sep_path.to_str().unwrap();
    let nov_str = nov_path.to_str().unwrap();

    insert_test_employee(&conn, "emp_1", "EMP001", "Alice", "alice@example.com");

    // September slip: APPROVED and SENT
    insert_test_slip(&conn, "slip_sep", sep_str, "sep.pdf", Some("September"), Some("2026"), Some("EMP001"), Some("Alice"), "APPROVED");
    conn.execute("UPDATE salary_slips SET matched_employee_id = 'emp_1', match_status = 'EXACT_MATCH' WHERE id = 'slip_sep'", []).unwrap();

    // November slip: APPROVED and PENDING delivery
    insert_test_slip(&conn, "slip_nov", nov_str, "nov.pdf", Some("November"), Some("2026"), Some("EMP001"), Some("Alice"), "APPROVED");
    conn.execute("UPDATE salary_slips SET matched_employee_id = 'emp_1', match_status = 'EXACT_MATCH' WHERE id = 'slip_nov'", []).unwrap();

    let del_sep = DeliveryRecord {
        id: "del_sep_sent".to_string(),
        salary_slip_id: "slip_sep".to_string(),
        employee_id: "EMP001".to_string(),
        channel: "EMAIL".to_string(),
        status: "SENT".to_string(),
        recipient: "alice@example.com".to_string(),
        provider: "SMTP".to_string(),
        message: Some("September slip".to_string()),
        error_code: None,
        error_message: None,
        provider_message_id: Some("msg-sep".to_string()),
        attempt_number: 1,
        created_at: "1000".to_string(),
        started_at: Some("1000".to_string()),
        completed_at: Some("1001".to_string()),
        employee_name: Some("Alice".to_string()),
        month: Some("September".to_string()),
        year: Some("2026".to_string()),
    };
    delivery_repo.create_record(&conn, &del_sep).unwrap();

    // Preview November batch: must be eligible even though September was already sent to same employee!
    let prev = delivery_service.preview_batch(&conn, &["slip_nov".to_string()], "EMAIL").unwrap();
    assert_eq!(prev.eligible_count, 1, "November slip must be eligible");
    assert_eq!(prev.already_sent_count, 0, "November slip has not been sent");
    assert_eq!(prev.estimated_deliveries, 1);

    let _ = std::fs::remove_file(&sep_path);
    let _ = std::fs::remove_file(&nov_path);
}

#[test]
fn test_matching_month_filter() {
    let conn = Connection::open_in_memory().unwrap();
    DbState::migrate(&conn).unwrap();

    let slip_repo = SalarySlipRepository::new();

    insert_test_slip(&conn, "sep_1", "C:/sep1.pdf", "sep1.pdf", Some("September"), Some("2026"), Some("EMP001"), Some("Alice"), "PENDING");
    insert_test_slip(&conn, "sep_2", "C:/sep2.pdf", "sep2.pdf", Some("September"), Some("2026"), Some("EMP002"), Some("Bob"), "PENDING");
    insert_test_slip(&conn, "nov_1", "C:/nov1.pdf", "nov1.pdf", Some("November"), Some("2026"), Some("EMP001"), Some("Alice"), "PENDING");

    let all = slip_repo.find_all(&conn).unwrap();
    let sep_slips: Vec<_> = all.iter().filter(|s| s.month.as_deref() == Some("September") && s.year.as_deref() == Some("2026")).collect();
    let nov_slips: Vec<_> = all.iter().filter(|s| s.month.as_deref() == Some("November") && s.year.as_deref() == Some("2026")).collect();

    assert_eq!(sep_slips.len(), 2);
    assert_eq!(nov_slips.len(), 1);
}

#[test]
fn test_sending_month_filter() {
    let conn = Connection::open_in_memory().unwrap();
    DbState::migrate(&conn).unwrap();

    let delivery_service = DeliveryService::new();

    let sep_path = create_temp_test_pdf("test_filt_sep.pdf");
    let nov_path = create_temp_test_pdf("test_filt_nov.pdf");
    let sep_str = sep_path.to_str().unwrap();
    let nov_str = nov_path.to_str().unwrap();

    insert_test_employee(&conn, "e1", "EMP001", "Alice", "alice@example.com");
    insert_test_employee(&conn, "e2", "EMP002", "Bob", "bob@example.com");

    insert_test_slip(&conn, "sep_1", sep_str, "sep1.pdf", Some("September"), Some("2026"), Some("EMP001"), Some("Alice"), "APPROVED");
    conn.execute("UPDATE salary_slips SET matched_employee_id = 'e1', match_status = 'EXACT_MATCH' WHERE id = 'sep_1'", []).unwrap();

    insert_test_slip(&conn, "nov_1", nov_str, "nov1.pdf", Some("November"), Some("2026"), Some("EMP001"), Some("Alice"), "APPROVED");
    conn.execute("UPDATE salary_slips SET matched_employee_id = 'e1', match_status = 'EXACT_MATCH' WHERE id = 'nov_1'", []).unwrap();

    // When frontend filters to November, it passes only November slip IDs to preview/send
    let nov_ids = vec!["nov_1".to_string()];
    let prev = delivery_service.preview_batch(&conn, &nov_ids, "EMAIL").unwrap();
    assert_eq!(prev.total_requested, 1);
    assert_eq!(prev.eligible_count, 1);

    let _ = std::fs::remove_file(&sep_path);
    let _ = std::fs::remove_file(&nov_path);
}

#[test]
fn test_multi_month_delivery_lifecycle() {
    // =========================================================================
    // MULTI-MONTH GOLDEN SCENARIO
    // EMP001, EMP002, EMP003
    // September 2026 (3 slips) -> matched -> approved -> email delivery (SENT)
    // October 2026 (3 slips) -> matched -> approved -> email delivery (SENT)
    // November 2026 (3 slips) -> matched -> approved -> email delivery (SENT)
    // =========================================================================
    let mut conn = Connection::open_in_memory().unwrap();
    DbState::migrate(&conn).unwrap();

    let slip_repo = SalarySlipRepository::new();
    let delivery_repo = DeliveryRepository::new();
    let slip_service = SalarySlipService::new();

    // Ingest Master Employees
    insert_test_employee(&conn, "emp_uuid_1", "EMP001", "Alice Smith", "alice@example.com");
    insert_test_employee(&conn, "emp_uuid_2", "EMP002", "Bob Jones", "bob@example.com");
    insert_test_employee(&conn, "emp_uuid_3", "EMP003", "Charlie Brown", "charlie@example.com");

    // -------------------------------------------------------------------------
    // CYCLE 1: SEPTEMBER 2026
    // -------------------------------------------------------------------------
    let sep_slips = vec![
        ("slip_sep_1", "C:/Payroll/2026-09/EMP001.pdf", "EMP001.pdf", "EMP001", "Alice Smith"),
        ("slip_sep_2", "C:/Payroll/2026-09/EMP002.pdf", "EMP002.pdf", "EMP002", "Bob Jones"),
        ("slip_sep_3", "C:/Payroll/2026-09/EMP003.pdf", "EMP003.pdf", "EMP003", "Charlie Brown"),
    ];
    for (id, path, name, emp_id, emp_name) in &sep_slips {
        insert_test_slip(&conn, id, path, name, Some("September"), Some("2026"), Some(emp_id), Some(emp_name), "PENDING");
    }

    let m_sep = slip_service.run_matching_engine(&mut conn).unwrap();
    assert_eq!(m_sep.exact_matches, 3);

    // Approve September slips and record successful delivery
    for (id, _path, _name, emp_id, emp_name) in &sep_slips {
        slip_repo.update_approval_status(&conn, id, "APPROVED", None, Some("HR")).unwrap();
        let del = DeliveryRecord {
            id: format!("del_sep_{}", id),
            salary_slip_id: id.to_string(),
            employee_id: emp_id.to_string(),
            channel: "EMAIL".to_string(),
            status: "SENT".to_string(),
            recipient: format!("{}@example.com", emp_id.to_lowercase()),
            provider: "SMTP".to_string(),
            message: Some(format!("September 2026 slip for {}", id)),
            error_code: None,
            error_message: None,
            provider_message_id: Some(format!("msg_{}", id)),
            attempt_number: 1,
            created_at: "1000".to_string(),
            started_at: Some("1000".to_string()),
            completed_at: Some("1001".to_string()),
            employee_name: Some(emp_name.to_string()),
            month: Some("September".to_string()),
            year: Some("2026".to_string()),
        };
        delivery_repo.create_record(&conn, &del).unwrap();
    }

    assert_eq!(slip_repo.find_all(&conn).unwrap().len(), 3);
    assert_eq!(delivery_repo.find_all(&conn).unwrap().len(), 3);

    // -------------------------------------------------------------------------
    // CYCLE 2: OCTOBER 2026
    // -------------------------------------------------------------------------
    let oct_slips = vec![
        ("slip_oct_1", "C:/Payroll/2026-10/EMP001.pdf", "EMP001.pdf", "EMP001", "Alice Smith"),
        ("slip_oct_2", "C:/Payroll/2026-10/EMP002.pdf", "EMP002.pdf", "EMP002", "Bob Jones"),
        ("slip_oct_3", "C:/Payroll/2026-10/EMP003.pdf", "EMP003.pdf", "EMP003", "Charlie Brown"),
    ];
    for (id, path, name, emp_id, emp_name) in &oct_slips {
        insert_test_slip(&conn, id, path, name, Some("October"), Some("2026"), Some(emp_id), Some(emp_name), "PENDING");
    }

    let m_oct = slip_service.run_matching_engine(&mut conn).unwrap();
    assert_eq!(m_oct.already_reviewed, 3, "September slips protected as already reviewed");
    assert_eq!(m_oct.exact_matches, 3, "All October slips matched");

    // Approve October slips and simulate delivery
    for (id, _path, _name, emp_id, emp_name) in &oct_slips {
        slip_repo.update_approval_status(&conn, id, "APPROVED", None, Some("HR")).unwrap();
        let del = DeliveryRecord {
            id: format!("del_oct_{}", id),
            salary_slip_id: id.to_string(),
            employee_id: emp_id.to_string(),
            channel: "EMAIL".to_string(),
            status: "SENT".to_string(),
            recipient: format!("{}@example.com", emp_id.to_lowercase()),
            provider: "SMTP".to_string(),
            message: Some(format!("October 2026 slip for {}", id)),
            error_code: None,
            error_message: None,
            provider_message_id: Some(format!("msg_{}", id)),
            attempt_number: 1,
            created_at: "2000".to_string(),
            started_at: Some("2000".to_string()),
            completed_at: Some("2001".to_string()),
            employee_name: Some(emp_name.to_string()),
            month: Some("October".to_string()),
            year: Some("2026".to_string()),
        };
        delivery_repo.create_record(&conn, &del).unwrap();
    }

    // Verify September slips are STILL approved and untouched
    for (id, _path, _name, _emp_id, _emp_name) in &sep_slips {
        let sep_chk = slip_repo.find_by_id(&conn, id).unwrap().unwrap();
        assert_eq!(sep_chk.approval_status, "APPROVED");
        assert_eq!(sep_chk.month.as_deref(), Some("September"));
    }

    assert_eq!(slip_repo.find_all(&conn).unwrap().len(), 6);
    assert_eq!(delivery_repo.find_all(&conn).unwrap().len(), 6);

    // -------------------------------------------------------------------------
    // CYCLE 3: NOVEMBER 2026
    // -------------------------------------------------------------------------
    let nov_slips = vec![
        ("slip_nov_1", "C:/Payroll/2026-11/EMP001.pdf", "EMP001.pdf", "EMP001", "Alice Smith"),
        ("slip_nov_2", "C:/Payroll/2026-11/EMP002.pdf", "EMP002.pdf", "EMP002", "Bob Jones"),
        ("slip_nov_3", "C:/Payroll/2026-11/EMP003.pdf", "EMP003.pdf", "EMP003", "Charlie Brown"),
    ];
    for (id, path, name, emp_id, emp_name) in &nov_slips {
        insert_test_slip(&conn, id, path, name, Some("November"), Some("2026"), Some(emp_id), Some(emp_name), "PENDING");
    }

    let m_nov = slip_service.run_matching_engine(&mut conn).unwrap();
    assert_eq!(m_nov.already_reviewed, 6, "September and October slips protected");
    assert_eq!(m_nov.exact_matches, 3, "All November slips matched");

    // Approve November slips and simulate delivery
    for (id, _path, _name, emp_id, emp_name) in &nov_slips {
        slip_repo.update_approval_status(&conn, id, "APPROVED", None, Some("HR")).unwrap();
        let del = DeliveryRecord {
            id: format!("del_nov_{}", id),
            salary_slip_id: id.to_string(),
            employee_id: emp_id.to_string(),
            channel: "EMAIL".to_string(),
            status: "SENT".to_string(),
            recipient: format!("{}@example.com", emp_id.to_lowercase()),
            provider: "SMTP".to_string(),
            message: Some(format!("November 2026 slip for {}", id)),
            error_code: None,
            error_message: None,
            provider_message_id: Some(format!("msg_{}", id)),
            attempt_number: 1,
            created_at: "3000".to_string(),
            started_at: Some("3000".to_string()),
            completed_at: Some("3001".to_string()),
            employee_name: Some(emp_name.to_string()),
            month: Some("November".to_string()),
            year: Some("2026".to_string()),
        };
        delivery_repo.create_record(&conn, &del).unwrap();
    }

    // -------------------------------------------------------------------------
    // FINAL INVARIANT CHECKS ACROSS ALL THREE MONTHS
    // -------------------------------------------------------------------------
    let final_slips = slip_repo.find_all(&conn).unwrap();
    assert_eq!(final_slips.len(), 9, "Final database must contain 9 independent salary-slip records");

    let final_deliveries = delivery_repo.find_all(&conn).unwrap();
    assert_eq!(final_deliveries.len(), 9, "Final delivery repository must contain 9 successful delivery records");

    // Check each month has 3 slips and 3 delivery records
    let sep_del_count = final_deliveries.iter().filter(|d| d.month.as_deref() == Some("September")).count();
    let oct_del_count = final_deliveries.iter().filter(|d| d.month.as_deref() == Some("October")).count();
    let nov_del_count = final_deliveries.iter().filter(|d| d.month.as_deref() == Some("November")).count();

    assert_eq!(sep_del_count, 3, "September must have exactly 3 deliveries");
    assert_eq!(oct_del_count, 3, "October must have exactly 3 deliveries");
    assert_eq!(nov_del_count, 3, "November must have exactly 3 deliveries");

    // Invariant: No September record changed
    for (id, _path, _name, _emp_id, _emp_name) in &sep_slips {
        let rec = slip_repo.find_by_id(&conn, id).unwrap().unwrap();
        assert_eq!(rec.approval_status, "APPROVED");
        assert_eq!(rec.month.as_deref(), Some("September"));
    }

    // Invariant: No October record changed
    for (id, _path, _name, _emp_id, _emp_name) in &oct_slips {
        let rec = slip_repo.find_by_id(&conn, id).unwrap().unwrap();
        assert_eq!(rec.approval_status, "APPROVED");
        assert_eq!(rec.month.as_deref(), Some("October"));
    }

    // Invariant: All 9 slips are APPROVED
    for s in &final_slips {
        assert_eq!(s.approval_status, "APPROVED");
    }

    // Invariant: All 9 deliveries are SENT
    for d in &final_deliveries {
        assert_eq!(d.status, "SENT");
    }
}
