-- Phase 0 SQLite Database Schema Migration
-- Defines tables for employees, salary_slips, mappings, message_logs, and settings

CREATE TABLE IF NOT EXISTS employees (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    phone TEXT,
    whatsapp_number TEXT,
    email TEXT,
    department TEXT,
    designation TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS salary_slips (
    id TEXT PRIMARY KEY,
    file_path TEXT NOT NULL UNIQUE,
    file_name TEXT NOT NULL,
    file_hash TEXT NOT NULL,
    detected_employee_id TEXT,
    detected_name TEXT,
    detected_phone TEXT,
    detected_email TEXT,
    extraction_method TEXT NOT NULL, -- TEXT_EMBEDDED, OCR, MANUAL
    extracted_text TEXT,
    match_confidence REAL NOT NULL DEFAULT 0.0,
    match_status TEXT NOT NULL DEFAULT 'UNMATCHED', -- READY, REVIEW_REQUIRED, UNMATCHED, CONFIRMED, REJECTED
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS mappings (
    id TEXT PRIMARY KEY,
    salary_slip_id TEXT NOT NULL UNIQUE,
    employee_id TEXT NOT NULL,
    match_method TEXT NOT NULL, -- EXACT_EMPLOYEE_ID, NORMALIZED_EMPLOYEE_ID, EXACT_NAME, PHONE, EMAIL, COMBINED_SIGNALS, MANUAL_REVIEW
    confidence REAL NOT NULL,
    confirmed INTEGER NOT NULL DEFAULT 0, -- 0 = False, 1 = True
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(salary_slip_id) REFERENCES salary_slips(id) ON DELETE CASCADE,
    FOREIGN KEY(employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS message_logs (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL,
    salary_slip_id TEXT NOT NULL,
    channel TEXT NOT NULL, -- WHATSAPP, EMAIL, BOTH
    status TEXT NOT NULL, -- QUEUED, PROCESSING, SENT, FAILED, RETRYING, CANCELLED
    provider_message_id TEXT,
    error_message TEXT,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    sent_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(employee_id) REFERENCES employees(id),
    FOREIGN KEY(salary_slip_id) REFERENCES salary_slips(id)
);

CREATE TABLE IF NOT EXISTS settings (
    id TEXT PRIMARY KEY,
    company_name TEXT NOT NULL,
    email_configuration TEXT NOT NULL, -- JSON string
    whatsapp_configuration TEXT NOT NULL, -- JSON string
    message_template_configuration TEXT NOT NULL, -- JSON string
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Indices for rapid lookup during matching & reporting
CREATE INDEX IF NOT EXISTS idx_employees_emp_id ON employees(employee_id);
CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);
CREATE INDEX IF NOT EXISTS idx_salary_slips_status ON salary_slips(match_status);
CREATE INDEX IF NOT EXISTS idx_message_logs_status ON message_logs(status);
