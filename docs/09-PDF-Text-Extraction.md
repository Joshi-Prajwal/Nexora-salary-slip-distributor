# 09 — PDF Embedded Text Extraction & Identifier Detection

## Purpose & Overview
Phase 3 implements local, privacy-focused embedded-text extraction from salary-slip PDF files in **Nexora**. It opens local PDFs in Rust using `pdf-extract`, normalizes whitespace, extracts employee identifiers (Employee ID, Name, Email, Phone) via deterministic regex rules, persists the results into SQLite (`salary_slips` table), and displays identification statuses in the UI.

---

## 1. Architecture Flow
```
React SalarySlipsPage ("Identify Salary Slips" / "Extract")
        ↓
salarySlipStore (Zustand)
        ↓
salarySlipService (src/services/salarySlipService.ts)
        ↓
Tauri Commands (extract_salary_slip_text, extract_all_salary_slips)
        ↓
Rust Salary Slip Service (src-tauri/src/services/salary_slip_service.rs)
        ↓
PDF Text Extractor (src-tauri/src/pdf/extractor.rs using pdf-extract crate)
        ↓
Document Identifier Parser (src-tauri/src/pdf/parser.rs with regex rules)
        ↓
Salary Slip Repository (src-tauri/src/database/repositories/salary_slip_repo.rs)
        ↓
SQLite Database (nexora.db via rusqlite)
```

---

## 2. Text Extractor Library Selection
- **Library**: `pdf-extract` (v0.7.12)
- **Rationale**: Maintainable pure Rust crate for extracting text from local PDF documents cleanly with zero external C/C++ build dependencies. Operates 100% offline.
- **Scanned / Image-only PDFs**: Controlled fallback to `match_status = 'TEXT_EXTRACTION_FAILED'` without crashing. (OCR is deferred to Phase 4).

---

## 3. Identifier Extraction Rules
- **Employee ID**:
  - Labels: `Employee ID`, `Employee Code`, `Employee No`, `Emp ID`, `Emp Code`, `Staff ID`, `Staff Number`.
  - Also supports multiline layout (label on line 1, value on line 2).
- **Employee Name**:
  - Labels: `Employee Name`, `Full Name`, `Name of Employee`, `Name`.
  - Filters out false positives (e.g. `Department`, `Designation`, `Month`, `Year`, `Salary`).
- **Email**:
  - Regular Expression: `(?i)\b([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})\b`.
- **Phone**:
  - Labels: `Phone`, `Mobile`, `Contact`, `Phone Number`, `Mobile No`.

---

## 4. Identification Statuses
- **`IDENTIFIED`**: Employee ID detected from PDF text (`extraction_method = 'TEXT_EMBEDDED'`).
- **`PARTIALLY_IDENTIFIED`**: Name, Email, or Phone detected, but missing Employee ID.
- **`NOT_IDENTIFIED`**: Embedded text extracted successfully, but no employee identifiers detected.
- **`TEXT_EXTRACTION_FAILED`**: PDF contains no embedded text (scanned image or empty).
- **`DUPLICATE_CONTENT`**: Content duplicate status from Phase 2 preserved.

---

## 5. Privacy & Security Model
- **100% Local**: No network calls, cloud APIs, or LLMs used.
- **No PII Logging**: Employee names, IDs, emails, phone numbers, and raw PDF bytes are never logged to console logs or written to unencrypted log files.
- **Read-Only Filesystem**: Original PDF files are never modified or deleted.
