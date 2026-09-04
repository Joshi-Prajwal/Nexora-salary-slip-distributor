# Nexora — Salary Slip Distributor

**Version 1.0.0 (Production Release)**  
*Windows-First Desktop Application for Automated Salary Slip Matching and Distribution*

---

## 1. Overview
**Nexora — Salary Slip Distributor** is an enterprise-grade, privacy-first Windows desktop application engineered for HR and payroll departments. Nexora automates the ingestion, matching, approval, and email delivery of pre-generated salary-slip PDFs to employees with strict human review safeguards, cryptographic credential encryption, and multi-month historical record integrity.

### Core Philosophy & Operational Boundaries
- **No Salary Computation**: Nexora does **NOT** compute wages, tax withholdings, allowances, deductions, or net payouts. Salary calculation belongs entirely to upstream payroll ERPs.
- **No PDF Document Generation**: Nexora distributes existing, pre-generated salary-slip PDFs.
- **Strict Approval Gate**: Automated matching computes confidence scores but **never** automatically authorizes dispatch. Human review and explicit confirmation are required to safeguard confidential compensation data.
- **Zero Document Mutation**: Physical salary-slip PDFs on disk are treated as strictly immutable read-only records. Nexora never alters, renames, or deletes payroll documents.

---

## 2. System Architecture

```
[ Excel Master Import ]             [ Local Salary-Slip Folder ]
           ↓                                      ↓
[ SQLite Employee Repository ]       [ Folder Scanner / PDF Parser ]
           ↓                                      ↓
           └───────────→ [ Heuristic Matcher ] ←──┘
                                ↓
                     [ Match Confidence & Conflicts ]
                                ↓
                     [ HR Review & Approval Gate ]
                                ↓
                     [ Delivery Preview & Eligibility ]
                                ↓
                     [ SMTP Email Dispatch Queue ]
                                ↓
                     [ Audit History & Non-Destructive Retry ]
```

### Technology Stack
- **Desktop Runtime**: [Tauri v2](https://v2.tauri.app/) (Windows x64 MSVC)
- **Backend & Native Core**: Rust (multi-threaded PDF parsing, SQLite database, DPAPI encryption, SMTP transport)
- **Frontend Layer**: React 18, TypeScript (strict mode), Vite, Zustand, Tailwind CSS
- **Database Engine**: Embedded SQLite in Write-Ahead Logging (`WAL`) mode with foreign key enforcement
- **Security Primitives**: Windows Data Protection API (DPAPI) for at-rest secret encryption, automatic credential redaction in logs/errors, and Content Security Policy (`CSP`) isolation.

---

## 3. Installation & Distribution

### Requirements
- **Operating System**: Windows 10 or Windows 11 (64-bit architecture)
- **Hardware**: Minimum 4 GB RAM, 200 MB free disk space
- **Network**: Internet/Intranet connectivity required only for SMTP email dispatch; all core workflows operate 100% offline.

### Installation Instructions
1. Download the production installer: `Nexora-Setup-1.0.0-x64.exe`.
2. Run the installer. The application installs under user scope:
   `%LOCALAPPDATA%\Programs\Nexora\`
   *(No Administrator elevation is required).*
3. Launch Nexora from the Start Menu or Desktop shortcut.

> [!NOTE]
> **Windows SmartScreen Notice**: The v1.0.0 pre-release package is unsigned. When Windows SmartScreen displays the standard "Unknown Publisher" protection dialog, click **"More info"** and select **"Run anyway"** to complete installation.

### Storage & Data Locations
- **Application Binaries**: `%LOCALAPPDATA%\Programs\Nexora\`
- **Database & Active State**: `%APPDATA%\com.nexora.distributor\nexora.db`
- **Automatic Snapshots & Backups**: `%APPDATA%\com.nexora.distributor\backups\`

### Uninstall Behavior
Uninstalling Nexora via Windows Settings or `Uninstall Nexora.exe` removes application binaries and system shortcuts while **preserving** user data in `%APPDATA%\com.nexora.distributor\`. Historical payroll records, delivery logs, settings, and physical PDFs remain untouched and are instantly recovered upon reinstallation.

---

## 4. End-to-End Workflow Guide

### Step 1: Employee Master Import
- Prepare an Excel workbook (`.xlsx`, `.xls`, or `.csv`) containing employee columns: `Employee ID`, `Name`, `Email`, `Phone`, `Department`, `Designation`.
- Navigate to **Employees** -> **Import Excel**.
- Nexora validates email formatting, preserves leading zeros in IDs, and stores records in SQLite.
- Using **Replace All** safely captures a pre-import snapshot backup with full rollback on validation failure.

### Step 2: Salary-Slip Folder Ingestion
- Navigate to **Salary Slips** -> **Scan Folder** or drag-and-drop a folder.
- Recursive scanner discovers all valid `%PDF-` files, rejecting non-PDF or spoofed files.
- Embedded text extractor extracts Employee IDs, names, dates, and salary figures.
- Ingested documents initialize strictly in `PENDING` approval status.

### Step 3: OCR Engine Fallback (Optional)
- For image-based or scanned PDFs with sparse text, Nexora supports optical character recognition fallback.
- **Tesseract OCR Status**: Tesseract is an optional system enhancement. If Tesseract is not installed, digital PDF parsing functions at 100% fidelity. If OCR is unavailable on a scanned document, Nexora logs an `ENGINE_ERROR` without corrupting metadata.

### Step 4: Intelligent Matching & Conflict Detection
- Run the **Matching Engine** across ingested documents.
- Nexora applies multi-signal matching (exact ID, normalized ID, full name, email prefix).
- Match outcomes: `EXACT`, `HIGH_CONFIDENCE`, `LOW_CONFIDENCE`, `CONFLICT`, or `UNMATCHED`.
- **Safety Rule**: High-confidence matching **never** automatically authorizes sending.

### Step 5: HR Review & Explicit Approval
- Review matched slips on the **Matching & Approval** screen.
- Verify employee association, month, and year.
- Click **Approve** individually or use period-scoped **Bulk Approve**.
- Slips flagged with `CONFLICT` cannot be approved until manually reassigned.

### Step 6: Delivery Preview & Email Dispatch
- Navigate to **Send Slips**.
- Select the delivery channel (**Email**) and choose the payroll month.
- Nexora evaluates delivery eligibility:
  - Must have valid employee association.
  - Must be in `APPROVED` or `MANUALLY_CONFIRMED` status.
  - Recipient email must be valid and non-empty.
  - Physical PDF must exist on disk.
  - Must not have already been sent (`already_sent_count` idempotency guard).
- Click **Send Batch** to queue deliveries.

### Step 7: Delivery Audit Log & Non-Destructive Retry
- Inspect the **History** tab for complete delivery logs with attempt numbers, status (`SENT` or `FAILED`), and sanitized error details.
- For any `FAILED` delivery, review the error and click **Retry Delivery**.
- The retry mechanism re-validates approval and file existence, dispatches attempt #2, and permanently preserves attempt #1 in the database for auditing.

---

## 5. Security & Privacy Architecture

- **Encryption at Rest**: Sensitive SMTP credentials and configuration tokens are encrypted using Windows Data Protection API (DPAPI) with a machine-bound master key (`enc:dpapi:` prefix).
- **Secret Redaction**: Error logs and diagnostic outputs dynamically mask credentials, authorization headers, and passwords with `[REDACTED]`.
- **SQL Injection Defense**: 100% of SQLite database queries use parameterized prepared statements.
- **Immutable Documents**: Physical files on disk are opened read-only. Database operations never execute disk deletions.
- **WhatsApp Cloud API Status**: WhatsApp integration is intentionally unconfigured in this release. Zero unauthorized network requests or tokens are required.

---

## 6. Build & Verification Commands

```cmd
# 1. Install Node dependencies
npm install

# 2. Run TypeScript compiler check
npx tsc --noEmit

# 3. Execute Vitest test suite (110 unit tests)
npm test -- --run

# 4. Execute Rust cargo test suite (83 unit & integration tests)
cargo test --manifest-path src-tauri/Cargo.toml

# 5. Execute Rust static check
cargo check --manifest-path src-tauri/Cargo.toml

# 6. Build production frontend
npm run build

# 7. Package production Windows x64 NSIS installer
npx tauri build
```

---

## 7. License & Copyright
Copyright © 2026 Nexora Team. All rights reserved.
