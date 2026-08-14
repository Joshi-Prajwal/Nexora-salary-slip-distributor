# Salary Slip Distributor — Local Desktop Application

> A secure, Windows-first desktop application for automated matching and distribution of pre-generated salary-slip PDFs to employees via official WhatsApp Business API and Email providers.

---

## 1. Product Purpose
The **Salary Slip Distributor** is a local desktop application designed for HR and payroll personnel to streamline the delivery of employee salary slips.

### Critical Limitations & Principles
- **No Salary Calculations**: This application does **NOT** calculate salaries, taxes, allowances, or net pay. Salary calculation is strictly outside the application scope.
- **No Document Generation**: Salary slips already exist as PDF files created by upstream payroll software.
- **Authorized WhatsApp API Only**: WhatsApp integration uses official WhatsApp Business API endpoints. Browsers, personal Web automation, or scraping methods are prohibited.
- **Strict Data Privacy**: Ambiguous employee-to-PDF matches **MUST NOT** be automatically sent. Human review and explicit confirmation are required to protect sensitive employee compensation data.

---

## 2. Core Business Workflow

```
Excel Employee Data
        ↓
Local SQLite Database
        ↓
Select Salary Slip Folder
        ↓
Scan PDF Files
        ↓
Extract PDF Text (Primary)
        ↓
OCR Engine Fallback (Scanned/Image PDFs)
        ↓
Extract Employee ID / Name / Phone / Email
        ↓
Signal Matcher with Confidence Score
        ↓
Manual HR Review for Ambiguous Matches
        ↓
WhatsApp (Business API) / Email (SMTP)
        ↓
Background Distribution Queue
        ↓
Success / Failure / Audit Log / Retry
```

---

## 3. Technology Architecture & Stack

### Desktop Shell
- **Tauri v2**: Windows-first desktop application runtime.
- **Rust Core Layer**: Multi-threaded file processing, database operations, and system integrations.

### Frontend UI
- **React 18**: UI rendering.
- **TypeScript**: Strict type safety.
- **Vite**: Ultra-fast bundler and hot module replacement (HMR).
- **Zustand**: Clean, centralized state management.
- **Tailwind CSS**: Modern desktop UI design system.

### Local Database
- **SQLite**: Local relational storage for employee records, slip metadata, match mappings, and audit logs.

### Architectural Layering Rule
The UI layer never contains business logic.

```
React UI Layer
      ↓
Zustand Store Layer
      ↓
Application Services
      ↓
Domain Layer & Interfaces
      ↓
SQLite Repository & External Adapters
```

---

## 4. Folder Structure

```
Nexora/
├── README.md
├── LICENSE
├── .gitignore
├── .env.example
├── package.json
├── tsconfig.json
├── vite.config.ts
├── index.html
│
├── src/
│   ├── app/ (App, routes, providers, config)
│   ├── components/ (common, layout, feedback, ui)
│   ├── pages/ (Dashboard, Employees, SalarySlips, Matching, Sending, History, Settings)
│   ├── features/ (employee-import, pdf-processing, matching, whatsapp, email, bulk-sending, history)
│   ├── stores/ (appStore, employeeStore, salarySlipStore, matchingStore, sendingStore, historyStore, settingsStore)
│   ├── services/ (employeeService, salarySlipService, matchingService, sendingService, historyService, settingsService)
│   ├── types/ (employee, salarySlip, matching, messaging, sending, settings)
│   ├── utils/ (validation, formatting, file, dates)
│   ├── styles/ (globals.css)
│   └── main.tsx
│
├── src-tauri/
│   ├── src/ (main.rs, lib.rs, commands, database, filesystem, pdf, ocr, matching, messaging, queue, models, services, errors, config)
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   └── capabilities/
│
├── docs/ (00-Product-Overview.md, 01-Architecture.md, 02-Database-Design.md, 03-Feature-Boundaries.md, 04-Security.md, 05-Development-Roadmap.md)
├── prompts/ (01-Foundation.md through 12-Packaging.md)
├── tests/ (unit, integration, fixtures)
├── scripts/ (dev, test, build, db-init)
└── assets/
```

---

## 5. Development Setup & Execution Commands

### Prerequisites
- **Node.js**: v18+ (Node v22 recommended)
- **Rust**: 1.75+ (with `cargo` installed)

### 1. Install Dependencies
```cmd
npm install
```

### 2. Run Development Server (Frontend)
```cmd
npm run dev
```

### 3. Run Full Desktop App Development Mode (Tauri + React)
```cmd
npm run tauri:dev
```

### 4. Run TypeScript Compiler & Type Check
```cmd
npx tsc --noEmit
```

### 5. Run Automated Tests
```cmd
npm run test
```

### 6. Build Production Desktop Application
```cmd
npm run build
```

### 7. Run Cargo Static Rust Diagnostics Check
```cmd
cargo check --manifest-path src-tauri/Cargo.toml
```

---

## 6. Phase Roadmap

- [x] **Phase 0**: Project Foundation, Architecture & Complete Folder Structure
- [ ] **Phase 1**: Excel Employee Import Module
- [ ] **Phase 2**: Salary Slip Directory Scanner Module
- [ ] **Phase 3**: Embedded PDF Text Extraction Engine
- [ ] **Phase 4**: Fallback OCR Engine
- [ ] **Phase 5**: Employee Matching Engine
- [ ] **Phase 6**: Manual Review & Confirmation UI
- [ ] **Phase 7**: SMTP Email Integration
- [ ] **Phase 8**: Official WhatsApp Business API Integration
- [ ] **Phase 9**: Bulk Sending Queue & Worker System
- [ ] **Phase 10**: History Audit Log & Retry Mechanism
- [ ] **Phase 11**: Automated Testing & Validation
- [ ] **Phase 12**: Packaging & Windows Installer Setup

---

## 7. Security Principles
- Employee documents and personal information never leave the local environment unless explicitly queued for sending.
- Credentials and provider secrets are stored securely in local database/configuration settings and are redacted in error messages.
