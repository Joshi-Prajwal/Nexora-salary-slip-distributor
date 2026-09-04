# Nexora — Salary Slip Distributor
## Developer Guide

**Version:** 1.0.0  
**Platform:** Windows 10 / Windows 11 (x64)  
**Stack:** Tauri v2 · Rust · React 18 · TypeScript · SQLite

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Technology Stack](#technology-stack)
3. [Prerequisites](#prerequisites)
4. [Repository Structure](#repository-structure)
5. [Development Setup](#development-setup)
6. [Running in Development Mode](#running-in-development-mode)
7. [Running Tests](#running-tests)
8. [Building for Production](#building-for-production)
9. [Key Systems](#key-systems)
10. [Database Schema](#database-schema)
11. [Security Model](#security-model)
12. [Adding New Features](#adding-new-features)
13. [Release Process](#release-process)
14. [Known Limitations](#known-limitations)

---

## Architecture Overview

Nexora follows the Tauri v2 architecture: a **Rust backend** providing native system capabilities and a **React/TypeScript frontend** rendering the UI in a WebView.

```
┌─────────────────────────────────────────────┐
│              React / TypeScript UI           │
│    (WebView — Tauri WebView2 / WKWebView)    │
├─────────────────────────────────────────────┤
│              Tauri IPC Bridge                │
│         (invoke() / listen() calls)          │
├─────────────────────────────────────────────┤
│            Rust Backend Services             │
│  ┌──────────┐ ┌─────────┐ ┌──────────────┐  │
│  │ Employee │ │ Salary  │ │  Delivery    │  │
│  │  Repo   │ │ Slip    │ │  Service     │  │
│  │         │ │ Repo    │ │  (SMTP)      │  │
│  └──────────┘ └─────────┘ └──────────────┘  │
├─────────────────────────────────────────────┤
│              SQLite Database                  │
│        (%APPDATA%\com.nexora.distributor\)   │
└─────────────────────────────────────────────┘
```

### Data Flow

1. User triggers an action in the React UI
2. Frontend calls `invoke('<command>', { ...args })` via Tauri IPC
3. Rust command handler validates inputs, calls appropriate service
4. Service reads/writes SQLite via repository layer
5. Result is serialized and returned to the frontend
6. UI renders the updated state

---

## Technology Stack

| Layer | Technology | Version |
|---|---|---|
| Desktop Shell | Tauri | 2.x |
| Backend Language | Rust | 1.80+ (stable) |
| Database | SQLite (via rusqlite) | 3.x |
| Frontend Framework | React | 18.x |
| Frontend Language | TypeScript | 5.x |
| UI Styling | Tailwind CSS | 3.x |
| Build Tool | Vite | 5.x |
| Testing (Frontend) | Vitest | 2.x |
| Testing (Backend) | Cargo test (built-in) | — |

---

## Prerequisites

### Required

| Tool | Purpose | Installation |
|---|---|---|
| **Rust (stable)** | Compile Rust backend | https://rustup.rs |
| **Node.js (LTS)** | Build React frontend | https://nodejs.org |
| **npm** | Package manager | Included with Node.js |
| **WebView2** | WebView runtime | Pre-installed on Windows 11; auto-installed on Windows 10 |

### Verify Installation

```powershell
rustc --version     # Expect: rustc 1.80+
cargo --version     # Expect: cargo 1.80+
node --version      # Expect: v18+ or v20+
npm --version       # Expect: 9+
```

### Optional

| Tool | Purpose |
|---|---|
| **Tesseract OCR** | OCR fallback for PDFs lacking embedded text |
| **VS Code** | Recommended editor (with rust-analyzer extension) |

---

## Repository Structure

```
Nexora/
├── src/                        # React/TypeScript frontend
│   ├── app/
│   │   ├── config/appConfig.ts # Version, app constants
│   │   ├── router/             # React Router pages
│   │   └── store/              # State management (Zustand)
│   ├── components/             # Reusable UI components
│   ├── features/               # Feature-level modules
│   │   ├── employees/
│   │   ├── salary-slips/
│   │   ├── delivery/
│   │   └── settings/
│   └── lib/                    # Utilities, Tauri invoke wrappers
├── src-tauri/                  # Rust backend
│   ├── Cargo.toml
│   ├── src/
│   │   ├── commands/           # Tauri #[tauri::command] handlers
│   │   ├── database/
│   │   │   ├── connection.rs   # Pool, schema migrations
│   │   │   └── repositories/   # Typed DB access per entity
│   │   ├── services/
│   │   │   ├── delivery_service.rs   # Email delivery + idempotency
│   │   │   ├── pdf_service.rs        # PDF text extraction
│   │   │   ├── ocr_service.rs        # OCR fallback
│   │   │   └── matching_service.rs   # Employee-PDF matching
│   │   └── security/           # DPAPI encryption, audit
│   └── tauri.conf.json         # Tauri configuration
├── tests/                      # Integration / E2E tests
├── docs/                       # Technical design docs
├── release/                    # Production release artifacts
├── README.md
├── INSTALL.md
├── USER_GUIDE.md
├── DEVELOPER_GUIDE.md          # This file
├── RELEASE_NOTES.md
├── RELEASE_MANIFEST.md
└── BUILD-VERIFICATION.md
```

---

## Development Setup

```powershell
# 1. Clone the repository
git clone <repository-url>
cd Nexora

# 2. Install Node dependencies
npm install

# 3. Verify Rust toolchain
rustup update stable
rustup default stable
```

---

## Running in Development Mode

```powershell
npm run tauri dev
```

This:
1. Starts the Vite dev server on `http://localhost:1420`
2. Compiles the Rust backend in debug mode
3. Launches the Tauri WebView shell with hot-reload enabled

Any changes to React files reload the UI instantly. Rust changes require a recompile (Tauri handles this automatically).

---

## Running Tests

### Frontend Tests (Vitest)

```powershell
# Run all frontend tests once
npm test -- --run

# Watch mode (for TDD)
npm test

# Coverage report
npm test -- --run --coverage
```

### Backend Tests (Cargo)

```powershell
# Run all Rust tests
cargo test --manifest-path src-tauri/Cargo.toml

# Run with output (useful for debugging)
cargo test --manifest-path src-tauri/Cargo.toml -- --nocapture

# Run a specific test module
cargo test --manifest-path src-tauri/Cargo.toml security_tests
```

### TypeScript Type Check

```powershell
npx tsc --noEmit
```

---

## Building for Production

### Full Production Build (EXE + NSIS installer)

```powershell
npx tauri build
```

Output location:
- **Application binary:** `src-tauri/target/release/nexora-salary-slip-distributor.exe`
- **NSIS installer:** `src-tauri/target/release/bundle/nsis/Nexora_1.0.0_x64-setup.exe`

### Build MSI Only

```powershell
npx tauri build --bundles msi
```

Output: `src-tauri/target/release/bundle/msi/Nexora_1.0.0_x64_en-US.msi`

### Build NSIS Only (faster, skips MSI)

```powershell
npx tauri build --bundles nsis
```

---

## Key Systems

### Database Connection & Migrations (`connection.rs`)

- Opens / creates the SQLite database at `%APPDATA%\com.nexora.distributor\nexora.db`
- Applies versioned schema migrations on every startup
- Supports automatic recovery from WAL corruption
- Uses `r2d2` connection pooling for thread-safe concurrent access

### Delivery Service (`delivery_service.rs`)

The delivery service enforces these invariants:

1. **Approval gate:** A salary slip must be in `Approved` state before delivery can proceed
2. **Idempotency guard:** Checks `delivery_history` for a prior successful delivery before attempting SMTP
3. **Retry logic:** On failure, updates `delivery_status` to `Failed` with the error message; the UI exposes a retry action
4. **SMTP:** Uses `lettre` crate for TLS-secured SMTP with `STARTTLS` support

### PDF Service (`pdf_service.rs`)

- Extracts embedded text from PDFs using `pdf-extract` crate
- Falls back to OCR if extracted text is empty or yields no usable identifiers
- Returns structured extraction result with confidence indicators

### Employee Matching (`matching_service.rs`)

- Tokenizes extracted PDF text
- Scores employee candidates using identifier matching (ID, name variants)
- Returns sorted list of candidates with confidence scores
- Slips below the threshold go to the manual review queue

### Security (`security/`)

- SMTP passwords encrypted with Windows DPAPI (`encrypt_dpapi` / `decrypt_dpapi`)
- Encrypted values stored with `enc:dpapi:` prefix for format versioning
- Parameterized SQL throughout — no string interpolation in queries
- CSP enforced via `tauri.conf.json`: restricts inline scripts, external connections

---

## Database Schema

### Core Tables

```sql
-- Employee master record
CREATE TABLE employees (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id TEXT    NOT NULL UNIQUE,
    name        TEXT    NOT NULL,
    email       TEXT    NOT NULL,
    department  TEXT,
    active      INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT    NOT NULL,
    updated_at  TEXT    NOT NULL
);

-- Salary slip metadata (not the PDF itself)
CREATE TABLE salary_slips (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id     INTEGER REFERENCES employees(id),
    pay_period      TEXT    NOT NULL,  -- "YYYY-MM"
    file_path       TEXT    NOT NULL,
    file_name       TEXT    NOT NULL,
    match_status    TEXT    NOT NULL,  -- Matched | NeedsReview | Unmatched
    approval_status TEXT    NOT NULL,  -- Pending | Approved | Rejected
    created_at      TEXT    NOT NULL,
    updated_at      TEXT    NOT NULL
);

-- Delivery audit log
CREATE TABLE delivery_history (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    slip_id       INTEGER NOT NULL REFERENCES salary_slips(id),
    recipient     TEXT    NOT NULL,
    status        TEXT    NOT NULL,  -- Delivered | Failed | Retrying
    smtp_response TEXT,
    error_message TEXT,
    sent_at       TEXT    NOT NULL
);

-- SMTP provider configuration
CREATE TABLE smtp_config (
    id         INTEGER PRIMARY KEY,
    host       TEXT NOT NULL,
    port       INTEGER NOT NULL,
    username   TEXT NOT NULL,
    password   TEXT NOT NULL,  -- enc:dpapi:<base64>
    from_name  TEXT NOT NULL,
    from_email TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
```

---

## Security Model

| Concern | Mitigation |
|---|---|
| Credential storage | DPAPI encryption at rest; never plain text |
| SQL injection | 100% parameterized queries; no string concatenation |
| XSS | CSP disables inline scripts; Tauri IPC is the only bridge |
| Unauthorized delivery | Approval status enforced in Rust; UI cannot bypass |
| Duplicate email | `delivery_history` checked before every send |
| Local data access | SQLite protected by OS user file permissions |
| Network | Only SMTP egress; no telemetry; no external API calls |

---

## Adding New Features

### Frontend Command

1. Add a new `#[tauri::command]` function in `src-tauri/src/commands/`
2. Register it in `src-tauri/src/lib.rs` → `tauri::generate_handler![]`
3. Create a TypeScript wrapper in `src/lib/commands.ts`
4. Call it from your React component via `invoke()`

### New Database Table

1. Add a new migration block in `connection.rs` with an incremented migration version
2. Create a new repository file in `src-tauri/src/database/repositories/`
3. Add unit tests for the repository

### Running Static Analysis

```powershell
# Rust
cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings

# TypeScript  
npx tsc --noEmit

# Formatting
cargo fmt --manifest-path src-tauri/Cargo.toml
npx prettier --write src/
```

---

## Release Process

1. Bump version in all files (must be synchronized):
   - `package.json`
   - `package-lock.json`
   - `src/app/config/appConfig.ts`
   - `src-tauri/Cargo.toml`
   - `src-tauri/Cargo.lock` (run `cargo check` to update)
   - `src-tauri/tauri.conf.json`

2. Run full test suite:
   ```powershell
   npm test -- --run
   cargo test --manifest-path src-tauri/Cargo.toml
   npx tsc --noEmit
   ```

3. Build release:
   ```powershell
   npx tauri build
   npx tauri build --bundles msi
   ```

4. Copy artifacts to `release/`:
   ```powershell
   Copy-Item "src-tauri\target\release\bundle\nsis\Nexora_X.Y.Z_x64-setup.exe" "release\Nexora-Setup-X.Y.Z-x64.exe"
   Copy-Item "src-tauri\target\release\bundle\msi\Nexora_X.Y.Z_x64_en-US.msi" "release\Nexora-X.Y.Z-x64.msi"
   ```

5. Generate checksums:
   ```powershell
   $hash1 = (Get-FileHash "release\Nexora-Setup-X.Y.Z-x64.exe" -Algorithm SHA256).Hash
   $hash2 = (Get-FileHash "release\Nexora-X.Y.Z-x64.msi" -Algorithm SHA256).Hash
   "$hash1 *Nexora-Setup-X.Y.Z-x64.exe`n$hash2 *Nexora-X.Y.Z-x64.msi" | Set-Content "release\Nexora-X.Y.Z-SHA256SUMS.txt"
   ```

6. Update `RELEASE_NOTES.md` and `RELEASE_MANIFEST.md`

7. Commit, tag, and push:
   ```powershell
   git add -A
   git commit -m "chore: release vX.Y.Z"
   git tag vX.Y.Z
   git push && git push --tags
   ```

---

## Known Limitations

| Limitation | Notes |
|---|---|
| **Windows only** | Tauri targets macOS/Linux too, but this build targets Windows x64 exclusively |
| **No code signing** | Installer triggers SmartScreen; expected for unsigned builds |
| **NSIS current-user install** | Does not install system-wide; separate admin-mode NSIS config required for that |
| **WhatsApp delivery** | UI scaffolding present but intentionally unconfigured in v1.0.0 |
| **OCR quality** | Dependent on Tesseract or Windows OCR runtime availability |
| **Large datasets** | Tested up to ~500 employees; performance degrades gracefully above that |
