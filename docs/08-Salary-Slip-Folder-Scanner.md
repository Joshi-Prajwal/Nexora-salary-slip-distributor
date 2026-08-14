# 08 — Salary Slip Folder Scanner & PDF Discovery

## Purpose & Overview
Phase 2 implements the local, recursive filesystem scanner for salary-slip PDF files in **Nexora**. It allows users to select a local directory, recursively discover `.pdf` files, calculate deterministic SHA-256 content hashes, extract filesystem metadata, and persist/update registration records in the local SQLite database (`salary_slips` table).

---

## 1. Architecture & Persistence Flow
```
React SalarySlipsPage / SalarySlipDrawer
        ↓
salarySlipStore (Zustand)
        ↓
salarySlipService (src/services/salarySlipService.ts)
        ↓
Tauri commands (scan_salary_slips, get_salary_slips, remove_salary_slip_record)
        ↓
Rust Salary Slip Service (src-tauri/src/services/salary_slip_service.rs)
        ↓
Filesystem Scanner (src-tauri/src/filesystem/folder_scanner.rs & file_metadata.rs)
        ↓
SHA-256 Content Hash (sha2 crate)
        ↓
Salary Slip Repository (src-tauri/src/database/repositories/salary_slip_repo.rs)
        ↓
SQLite Database (nexora.db via rusqlite)
```

---

## 2. Path Identity vs. Content Identity (SHA-256 Duplicate Detection)

Nexora enforces a dual identity model for registered salary slip files:

### A. Path Identity (`file_path`)
The physical file path serves as the path identity (`UNIQUE` constraint on `file_path` in SQLite).
- **Same path + Same SHA-256**: Scanned file is unchanged. Summary counter increments `unchangedCount`.
- **Same path + Different SHA-256**: File content was modified on disk. The existing record's `file_hash`, `file_name`, and `updated_at` are updated (`updatedCount`).

### B. Content Identity (`file_hash` & Canonical Record)
Files in different folder paths with identical SHA-256 hashes represent **Content Duplicates**.
- **Different path + Same SHA-256**: The earliest registered record serves as the **Canonical Record**. The newly discovered file is registered with `match_status = 'DUPLICATE_CONTENT'` and `duplicate_of_id = canonical.id`.
- **UI Display**: Classified as **Duplicate** with secondary note: *"This PDF has the same content as another registered salary slip."*
- **Different path + Different SHA-256**: Registered as an independent record (`match_status = 'UNMATCHED'`, `newCount`).

---

## 3. Physical Read-Only Safety & Record Removal
- **Read-Only Standard**: Nexora **NEVER** modifies, renames, moves, deletes, overwrites, generates, or uploads user PDF files.
- **Database Record Removal**: Removing a salary slip record in Nexora deletes **ONLY** its SQLite database registration row (`remove_salary_slip_record`). The physical PDF file on disk is left completely untouched.
