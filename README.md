# Nexora — Salary Slip Distributor

**v1.0.0 · Windows Desktop Application**

> A modern Windows desktop application for managing, matching, approving, and distributing salary-slip documents.

## Overview

Nexora is a Windows-first application built for HR and payroll teams to simplify the operational workflow around existing salary-slip documents.

It connects employee master data with salary-slip PDFs, identifies the relevant employee, provides a review and approval workflow, and distributes approved documents through **Email and WhatsApp**.

Nexora focuses on **salary-slip document distribution**, not salary calculation or payroll generation.

---

## Features

- 📊 **Dashboard** — Overview of employees, salary slips, approvals, and delivery activity
- 👥 **Employee Management** — Import and manage employee master data
- 📥 **Excel Import** — Import employee records from Excel files
- 📄 **Salary-Slip Processing** — Scan and process existing salary-slip PDF documents
- 🔍 **PDF Extraction & OCR** — Extract information from digital and scanned documents
- 🎯 **Employee Matching** — Match salary slips with employee records
- ⚠️ **Conflict Detection** — Identify uncertain or conflicting matches
- ✅ **Review & Approval** — Review documents before distribution
- 📧 **Email Distribution** — Send approved salary slips through SMTP
- 💬 **WhatsApp Distribution** — Distribute approved salary slips through WhatsApp
- 📅 **Payroll Periods** — Organize salary slips across different months and years
- 📋 **Delivery History** — Track successful and failed deliveries
- 🔄 **Retry Workflow** — Retry eligible failed deliveries
- 🔐 **Security** — Protected credentials, validation, local storage, and backups
- 🖥️ **Windows Desktop** — Native desktop experience powered by Tauri

## Workflow

```text
Employee Data
     │
     ▼
Excel Import
     │
     ▼
Salary-Slip PDFs
     │
     ▼
PDF Processing
     │
     ├── Text Extraction
     └── OCR
     │
     ▼
Employee Matching
     │
     ▼
Review & Approval
     │
     ▼
Distribution
   ┌─┴──────────┐
   ▼            ▼
 Email       WhatsApp
   │            │
   └─────┬──────┘
         ▼
 Delivery History
         │
         ▼
 Retry & Tracking
```

## Main Features

### Employee Management

Import and manage the employee master used for salary-slip matching.

- Excel employee import
- Employee records
- Employee ID, name, email, phone, department, and designation
- Search and filtering
- Validation during import

### Salary-Slip Processing

Process existing salary-slip documents from a local folder.

- Recursive PDF discovery
- PDF validation
- Digital PDF text extraction
- OCR fallback for scanned documents
- Payroll month and year detection
- Duplicate detection
- Processing status tracking
- Original salary-slip files are preserved

### Employee Matching

Nexora compares information extracted from a salary slip with the employee master.

```text
Employee ID
Name
Email
Phone
    │
    ▼
Matching Engine
    │
    ▼
Match Result
```

Matching results can identify:

- Exact matches
- Possible matches
- Conflicting matches
- Unmatched documents

The result is presented for review before delivery.

### Review & Approval

The application provides an approval workflow between matching and delivery.

```text
Match
  │
  ▼
Review
  │
  ▼
Approve
  │
  ▼
Deliver
```

This keeps document identification separate from the final delivery decision.

### Email Distribution

Send approved salary slips through SMTP email.

- SMTP configuration
- Connection testing
- Email templates
- PDF attachments
- Recipient validation
- Delivery status
- Failed-delivery handling
- Retry workflow
- Delivery history

### WhatsApp Distribution

Nexora also supports WhatsApp-based salary-slip distribution.

The delivery layer keeps the document-processing and approval workflow separate from the external messaging channel.

```text
Approved Salary Slip
        │
        ▼
Delivery Selection
     ┌──┴────┐
     ▼       ▼
   Email  WhatsApp
```

### Delivery History

Track salary-slip delivery activity from a single interface.

- Sent deliveries
- Failed deliveries
- Retry operations
- Delivery channel
- Payroll period
- Search and filtering
- Historical records

---

## Dashboard

The dashboard provides a quick view of the salary-slip distribution workflow.

<img width="1920" height="1032" alt="Screenshot 2026-09-05 060439" src="https://github.com/user-attachments/assets/1bd3cda9-76a5-4719-a071-973f7c66b248" />


Typical areas include:

- Employee overview
- Salary-slip processing
- Pending review
- Approval status
- Delivery status
- Recent activity

---

## Architecture

Nexora uses a modern desktop architecture built around Tauri, React, Rust, and SQLite.

```text
┌─────────────────────────────────────────────┐
│              React + TypeScript             │
│             Vite + Tailwind CSS             │
└──────────────────────┬──────────────────────┘
                       │
                    Tauri IPC
                       │
                       ▼
┌─────────────────────────────────────────────┐
│                 Rust Backend                │
│             Services + Repositories         │
└──────────────────────┬──────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────┐
│                   SQLite                    │
│              Local Application Data         │
└─────────────────────────────────────────────┘
```

### Technology Stack

| Layer | Technology |
|---|---|
| Desktop Framework | Tauri v2 |
| Frontend | React 18 |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Build Tool | Vite |
| State Management | Zustand |
| Backend | Rust |
| Database | SQLite |
| Email | SMTP |
| Messaging | WhatsApp integration |
| PDF Processing | PDF text extraction |
| OCR | Tesseract fallback |
| Platform | Windows 10/11 x64 |

---

## Installation

### Windows

Nexora is distributed as a Windows x64 desktop application.

### Requirements

- Windows 10 or Windows 11
- 64-bit Windows system
- Sufficient local storage for application data and salary-slip documents

### Install

Download the latest release from **GitHub Releases** and run either installer:

```text
Nexora-Setup-1.0.0-x64.exe
Nexora-1.0.0-x64.msi
```

Nexora uses a current-user installation.

Application files are installed under:

```text
%LOCALAPPDATA%\Programs\Nexora\
```

Application data is stored under:

```text
%APPDATA%\com.nexora.distributor\
```

For detailed installation instructions, see [`INSTALL.md`](INSTALL.md).

---

## Quick Start

1. Download the latest Windows installer from GitHub Releases.
2. Install Nexora.
3. Launch the application.
4. Import the employee master Excel file.
5. Select the salary-slip folder.
6. Process the salary-slip documents.
7. Review employee matches.
8. Approve eligible documents.
9. Configure Email or WhatsApp delivery.
10. Deliver approved salary slips.
11. Review delivery history and retry eligible failures.

---

## Security

Nexora is designed for sensitive payroll-document workflows.

Key protections include:

- Windows DPAPI protection for sensitive credentials
- Parameterized database queries
- PDF validation
- Local SQLite storage
- Database integrity controls
- Protected backups
- Approval checks before delivery
- Delivery-state validation
- Duplicate-delivery protection
- Original salary-slip documents remain unchanged

---

## Project Structure

```text
Nexora/
├── assets/                 # README screenshots and diagrams
├── public/                 # Application assets
├── src/                    # React + TypeScript frontend
├── src-tauri/              # Tauri + Rust backend
├── scripts/                # Project scripts
├── tests/                  # Automated tests
│
├── README.md
├── INSTALL.md
├── USER_GUIDE.md
├── DEVELOPER_GUIDE.md
├── BUILD-VERIFICATION.md
├── RELEASE_NOTES.md
├── RELEASE_MANIFEST.md
└── LICENSE
```

---

## Development

### Prerequisites

- Windows 10/11
- Node.js
- npm
- Rust
- Tauri development prerequisites

### Clone

```bash
git clone https://github.com/Joshi-Prajwal/Nexora-salary-slip-distributor.git
cd Nexora-salary-slip-distributor
```

### Install Dependencies

```bash
npm install
```

### Start Development

```bash
npm run tauri dev
```

---

## Testing

Run the frontend test suite:

```bash
npm test -- --run
```

Run the Rust test suite:

```bash
cargo test --manifest-path src-tauri/Cargo.toml
```

Run TypeScript validation:

```bash
npx tsc --noEmit
```

The v1.0.0 release verification recorded:

```text
TypeScript        0 errors
Vitest            110 / 110 passed
Rust              83 / 83 passed
Total             193 / 193 passed
Production Build  PASS
Cargo Check       PASS
```

See [`BUILD-VERIFICATION.md`](BUILD-VERIFICATION.md) for build verification information.

---

## Build

Build the frontend:

```bash
npm run build
```

Build the Windows desktop application:

```bash
npx tauri build
```

---

## Release

### v1.0.0

The current Windows production release includes:

```text
Nexora-Setup-1.0.0-x64.exe
Nexora-1.0.0-x64.msi
Nexora-1.0.0-SHA256SUMS.txt
```

See the **GitHub Releases** section for installers and release information.

Release documentation:

- [`RELEASE_NOTES.md`](RELEASE_NOTES.md)
- [`RELEASE_MANIFEST.md`](RELEASE_MANIFEST.md)

---

## Documentation

| Document | Purpose |
|---|---|
| [`INSTALL.md`](INSTALL.md) | Installation |
| [`USER_GUIDE.md`](USER_GUIDE.md) | Using Nexora |
| [`DEVELOPER_GUIDE.md`](DEVELOPER_GUIDE.md) | Development |
| [`BUILD-VERIFICATION.md`](BUILD-VERIFICATION.md) | Build verification |
| [`RELEASE_NOTES.md`](RELEASE_NOTES.md) | Release information |
| [`RELEASE_MANIFEST.md`](RELEASE_MANIFEST.md) | Release artifacts |

---

## Limitations

- Nexora processes existing salary-slip documents; it does not calculate payroll or generate salary slips.
- OCR processing depends on the availability of the configured OCR component.
- External delivery channels require their respective service configuration.
- Nexora is currently distributed as a Windows desktop application.

---

## License

Copyright © 2026 Nexora Team.

See [`LICENSE`](LICENSE) for license information.

---

<p align="center">
  <strong>Nexora — Salary Slip Distributor</strong><br>
</p>
