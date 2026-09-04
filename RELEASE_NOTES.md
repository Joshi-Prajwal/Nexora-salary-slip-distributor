# Nexora — Salary Slip Distributor
## Release Notes — Version 1.0.0 (Production Release)

**Release Date**: September 5, 2026  
**Target Platform**: Windows 10/11 x64  
**Release Artifact**: `release/Nexora-Setup-1.0.0-x64.exe`  
**Application Binary**: `src-tauri/target/release/nexora-salary-slip-distributor.exe`  

---

### Overview
Nexora v1.0.0 marks the official production release of the local desktop application for salary slip distribution. Engineered with Tauri 2, Rust, and React, Nexora delivers an enterprise-grade, secure, and privacy-first solution for distributing monthly salary slips to employees.

---

### Validated Production Capabilities

1. **Employee Excel Master Import**
   - Direct ingestion of Excel workbooks (`.xlsx`, `.xls`) and CSV files.
   - Preserves leading zeros in employee IDs, sanitizes email strings, and normalizes phone numbers.
   - Safe bulk replacement with pre-import database backups and automatic transaction rollback.

2. **Salary-Slip Discovery & Ingestion**
   - Recursive and root-level scanning of salary-slip folders.
   - Magic byte validation (`%PDF-`) that rejects spoofed executables, batch scripts, or corrupted files.
   - Physical payroll documents remain read-only and immutable.

3. **Digital PDF Text Extraction**
   - High-throughput embedded text extraction for digital payroll PDFs.
   - Accurate parsing of Employee IDs, names, email addresses, months, and years.
   - Full persistence in SQLite without data truncation.

4. **Intelligent Employee Matching Engine**
   - Multi-factor heuristic matching across exact IDs, normalized alphanumeric strings, and names.
   - Automatic detection of ambiguous matches and cross-candidate conflicts.
   - Strict adherence to the core safety rule: **matching never automatically approves a document**.

5. **Human Review & Approval Workflow**
   - Intuitive review UI displaying match confidence scores and side-by-side metadata comparisons.
   - Explicit approval requirement for every salary slip prior to delivery authorization.
   - Safe bulk-approval actions scoped strictly by calendar month.

6. **Multi-Month Payroll Lifecycle & Integrity**
   - Clean calendar month and year scoping (e.g., September 2026, October 2026, November 2026).
   - Prevents cross-month data bleed, accidental overwrites, or historical record resets.
   - Dynamic subject and body email templating: `{{month}}`, `{{year}}`, `{{employee_name}}`.

7. **SMTP Email Delivery Engine**
   - High-performance SMTP transport supporting STARTTLS and SSL/TLS encryption.
   - Direct PDF attachment delivery with personalized email body templates.
   - Comprehensive delivery status tracking (`SENT`, `FAILED`, `PROCESSING`).

8. **Delivery History & Non-Destructive Retry**
   - Full audit trail logging recipient, timestamps, provider message IDs, and attempt numbers.
   - Sanitized error message reporting with automatic secret and password masking.
   - Non-destructive retry mechanism: retrying a failed delivery generates attempt #2 while permanently preserving attempt #1 in the database.

9. **Delivery Idempotency Protection**
   - Hardened `(salary_slip_id, channel)` idempotency check prevents duplicate transmissions.
   - Batch preview flags already-sent records and excludes them from active delivery queues.

10. **Enterprise Security & Data Protection**
    - **DPAPI Encryption**: Sensitive SMTP passwords and tokens are encrypted at rest using Windows Data Protection API (`enc:dpapi:`).
    - **Credential Redaction**: Passwords, authorization headers, and bearer tokens are automatically masked with `[REDACTED]`.
    - **Crash Recovery**: Stuck processing states from abnormal system shutdowns are safely recovered on startup.
    - **Data Preservation**: Application uninstallers clean binaries but preserve user data in `%APPDATA%\com.nexora.distributor\`.

---

### Automated Quality Assurance Summary

Across 10 comprehensive QA testing phases (Phase 13.1 through Phase 13.10), all functional, security, performance, lifecycle, and packaging criteria achieved consecutive **PASS** verdicts:

- **TypeScript Type Safety**: 0 errors (`npx tsc --noEmit`)
- **Vitest Unit & Integration Tests**: 110 / 110 passing (13 test suites)
- **Rust Native Unit & Integration Tests**: 83 / 83 passing
- **Total Automated Test Count**: 193 / 193 passing (100.0%)
- **Database Integrity**: `PRAGMA integrity_check;` -> `ok`, `PRAGMA foreign_keys;` -> `1`
- **Physical Document Integrity**: 100.0% SHA-256 hash preservation across all operations

---

### Known Release Considerations

1. **WhatsApp Business Cloud API**
   - WhatsApp Cloud API integration is intentionally unconfigured for the initial v1.0.0 release.
   - No Meta tokens, phone number IDs, or webhook secrets are required for normal email operation.

2. **Optical Character Recognition (OCR)**
   - Digital PDF text extraction operates natively at 100% fidelity without external dependencies.
   - Tesseract OCR engine fallback is optional. If Tesseract is installed on the host system, OCR fallback activates for scanned PDFs; otherwise, an informative engine notice is displayed.
   - Live OCR acceptance testing was not performed in the release candidate environment because Tesseract was not installed on the test host.

3. **Code Signing & Windows SmartScreen**
   - This release candidate is distributed as an unsigned binary.
   - Windows SmartScreen may present an "Unknown Publisher" prompt upon initial installation. Users can safely proceed by clicking **"More info"** and then **"Run anyway"**.
