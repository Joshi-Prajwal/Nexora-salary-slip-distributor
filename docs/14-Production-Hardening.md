# 14 — Production Hardening & Reliability Guide

## Purpose & Overview
This document describes the production reliability, safety, and recovery architecture implemented in **Nexora — Salary Slip Distributor** (Phase 8). It documents SQLite database migration ordering, automatic local database backups, delivery idempotency, abnormal shutdown recovery, OCR safety, and secrets protection.

---

## 1. Safe Database Migration Ordering
To prevent startup panics and table schema corruption:
1. **Base Tables Creation**: Tables (`employees`, `salary_slips`, `delivery_records`, `settings`) are created using `CREATE TABLE IF NOT EXISTS`.
2. **Dynamic Column Verification**: PRAGMA inspections verify and add missing columns (`matched_employee_id`, `duplicate_of_id`, `ocr_error`, etc.) BEFORE any index is created.
3. **Index Creation**: Indexes (`idx_salary_slips_matched_emp`, `idx_delivery_slip_channel`, etc.) are created ONLY AFTER all dependent columns are guaranteed to exist.

---

## 2. Automatic Local Database Backup
- **Service**: `DatabaseBackupService` in `src-tauri/src/database/backup.rs`.
- **Trigger**: Automatically creates a timestamped copy of existing SQLite database (`backups/nexora-backup-YYYYMMDD-HHmmss.db`) prior to running migrations.
- **Safety**: Fresh installs (non-existent DB files) skip backup cleanly. Backups remain strictly local and are never logged or transmitted.

---

## 3. Delivery Idempotency & Batch Recovery
- **Idempotency**: Before email transmission, `DeliveryService` checks existing records for `salary_slip_id` + `channel = 'EMAIL'` with status `SENT`. If found, duplicate delivery is skipped with an `already_sent` result.
- **Abnormal Shutdown Recovery**: On application startup, `DbState::recover_stuck_records` queries `delivery_records` for any items left in `PROCESSING` state during an abrupt application crash and transitions them to `FAILED` (`error_code = 'INTERRUPTED_SHUTDOWN'`). These items can be cleanly retried without duplicating `SENT` records.
- **Partial Batch Isolation**: Each item in a batch send maintains an independent status. If one PDF is missing or one recipient email fails, the remaining batch items proceed unaffected.

---

## 4. Secrets Security & Privacy Logging
- **Password & Token Preservation**: Password updates with masked placeholders (`••••••••`) preserve existing secrets in SQLite without overwriting them.
- **Log Redaction**: Passwords, App Passwords, API tokens, employee email addresses, phone numbers, and salary slip extracted texts are redacted from system logs.
- **User Error Messages**: Raw stack traces or internal secrets are never displayed to end users. User-facing errors feature safe, actionable human-readable messages.

---

## 5. UI Action Safety & Double-Click Protection
- All primary buttons across Settings, Salary Slips, Matching, Sending, and Employees pages are disabled during processing states (`isLoading`, `isSaving`, `isTesting`, `isSending`) to prevent double-click duplicate actions.
