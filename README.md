# Nexora — Salary Slip Distributor

**v1.0.0 · Windows Desktop Application**

> A modern Windows desktop application for managing, matching, approving, and distributing salary-slip documents.

<img width="1920" height="1008" alt="image" src="https://github.com/user-attachments/assets/b0a80927-3070-4953-a76c-9f6315cd2783" />


## Overview

Nexora is a Windows-first application built for HR and payroll teams to simplify salary-slip distribution.

It works with existing employee data and salary-slip PDF documents, helping users process documents, identify employees, review matches, approve salary slips, and distribute them through **Email and WhatsApp**.

Nexora focuses on **salary-slip document distribution**, not salary calculation or payroll generation.

---

## ✨ Features

* 📊 **Dashboard** — Overview of employees, salary slips, approvals, and deliveries
* 👥 **Employee Management** — Import and manage employee master data
* 📄 **Salary-Slip Processing** — Scan and process PDF salary slips
* 🔍 **PDF Extraction & OCR** — Extract information from digital and scanned documents
* 🎯 **Employee Matching** — Match salary slips with employee records
* ⚠️ **Conflict Detection** — Identify uncertain or conflicting matches
* ✅ **Review & Approval** — Review documents before distribution
* 📧 **Email Distribution** — Send approved salary slips through SMTP
* 💬 **WhatsApp Distribution** — Distribute approved salary slips through WhatsApp
* 📅 **Payroll Periods** — Work with salary slips across different months
* 📋 **Delivery History** — Track sent and failed deliveries
* 🔄 **Retry Workflow** — Retry eligible failed deliveries
* 🔐 **Security** — Local storage, protected credentials, validation, and backups
* 🖥️ **Windows Desktop** — Native desktop experience using Tauri

---

## 🔄 Workflow

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
```

---

## 🏗️ Architecture

![Nexora Architecture](assets/nexora-architecture.png)

```text
┌─────────────────────────────────────┐
│          React Frontend             │
│    TypeScript · Vite · Tailwind     │
└──────────────────┬──────────────────┘
                   │
                Tauri IPC
                   │
                   ▼
┌─────────────────────────────────────┐
│           Rust Backend              │
│       Services · Repositories       │
└──────────────────┬──────────────────┘
                   │
                   ▼
┌─────────────────────────────────────┐
│              SQLite                │
│        Local Application Data       │
└─────────────────────────────────────┘
```

### Technology Stack

| Technology       | Purpose                       |
| ---------------- | ----------------------------- |
| **Tauri v2**     | Desktop application framework |
| **React**        | User interface                |
| **TypeScript**   | Frontend development          |
| **Vite**         | Frontend build tooling        |
| **Tailwind CSS** | UI styling                    |
| **Rust**         | Backend and native operations |
| **SQLite**       | Local database                |
| **SMTP**         | Email delivery                |
| **WhatsApp**     | Salary-slip distribution      |
| **Tesseract**    | Optional OCR processing       |

---

## 📸 Application

### Dashboard

![Nexora Dashboard](assets/nexora-dashboard.png)

### Employee Management

![Employee Management](assets/nexora-employees.png)

### Matching & Approval

![Matching and Approval](assets/nexora-matching.png)

### Delivery History

![Delivery History](assets/nexora-history.png)

---

## 📥 Installation

Nexora is available for **Windows 10/11 x64**.

Download the latest release from the **GitHub Releases** section.

### Windows Installers

```text
Nexora-Setup-1.0.0-x64.exe
Nexora-1.0.0-x64.msi
```

Nexora uses a current-user installation.

Application files:

```text
%LOCALAPPDATA%\Programs\Nexora\
```

Application data:

```text
%APPDATA%\com.nexora.distributor\
```

For complete installation instructions, see [`INSTALL.md`](INSTALL.md).

---

## 🚀 Development

### Requirements

* Windows 10 or Windows 11
* Node.js
* npm
* Rust
* Tauri development prerequisites

### Clone

```bash
git clone https://github.com/Joshi-Prajwal/Nexora-salary-slip-distributor.git
cd Nexora-salary-slip-distributor
```

### Install

```bash
npm install
```

### Run

```bash
npm run tauri dev
```

### Build

```bash
npm run build
npx tauri build
```

### Test

```bash
npm test -- --run
```

```bash
cargo test --manifest-path src-tauri/Cargo.toml
```

---

## 🔐 Security

Nexora is designed for sensitive salary-slip workflows.

Key protections include:

* Windows DPAPI protection for sensitive credentials
* Parameterized database queries
* PDF validation
* Local SQLite storage
* Database integrity controls
* Protected backups
* Approval before delivery
* Delivery-state validation
* Original salary-slip documents remain unchanged

---

## 📁 Project Structure

```text
Nexora/
├── assets/                 # README images and diagrams
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

## 📚 Documentation

* [`INSTALL.md`](INSTALL.md) — Installation guide
* [`USER_GUIDE.md`](USER_GUIDE.md) — Application usage
* [`DEVELOPER_GUIDE.md`](DEVELOPER_GUIDE.md) — Development guide
* [`BUILD-VERIFICATION.md`](BUILD-VERIFICATION.md) — Build verification
* [`RELEASE_NOTES.md`](RELEASE_NOTES.md) — Release information
* [`RELEASE_MANIFEST.md`](RELEASE_MANIFEST.md) — Release artifacts

---

## 📦 Release

### v1.0.0

The current Windows production release includes:

```text
Nexora-Setup-1.0.0-x64.exe
Nexora-1.0.0-x64.msi
Nexora-1.0.0-SHA256SUMS.txt
```

See the **GitHub Releases** section for downloads and release information.

---

## 📄 License

Copyright © 2026 Nexora Team.

See [`LICENSE`](LICENSE) for license information.


