# Nexora — Salary Slip Distributor
## Production Release Manifest — v1.0.0

**Generated At**: September 5, 2026  
**Status**: APPROVED PRODUCTION RELEASE  

---

### 1. Product Identity

| Property | Value |
| :--- | :--- |
| **Product Name** | Nexora — Salary Slip Distributor |
| **Application Identifier** | `com.nexora.distributor` |
| **Production Version** | `1.0.0` |
| **Target Platform** | Windows 10/11 x64 (`x86_64-pc-windows-msvc`) |
| **Publisher** | Nexora Team |
| **Copyright** | Copyright © 2026 Nexora |
| **Install Scope** | Current User (`currentUser`) |
| **Runtime Architecture** | Tauri v2.2.0 + Rust 1.75+ + React 18 + Vite |

---

### 2. Final Release Artifacts

#### A. Production NSIS Installer
- **File Path**: `release\Nexora-Setup-1.0.0-x64.exe`
- **File Size**: 4,627,257 bytes
- **SHA-256 Checksum**:
  `15A419A76908AEB0E93A099B7F72DBFCC2B0F2AA4FD0B24FF06E692A6980EB65`
- **Target Architecture**: x64 PE executable
- **Packaging Format**: NSIS (Nullsoft Scriptable Install System) v3.x
- **Signing Status**: Unsigned (Pre-v1.0 Community/Direct Distribution)

#### B. Windows Installer Package (MSI)
- **File Path**: `release\Nexora-1.0.0-x64.msi`
- **File Size**: 6,348,800 bytes
- **SHA-256 Checksum**:
  `F244C72A42761B4E26F2AD17EC377242F54990B5820DF2832B3D4D8AE8F59B5B`
- **Target Architecture**: x64
- **Packaging Format**: Windows Installer MSI (WiX Toolset — candle + light)
- **OLE Magic**: `D0-CF-11-E0` (genuine Windows Installer format)
- **Signing Status**: Unsigned

#### C. Standalone Release Executable
- **File Path**: `src-tauri\target\release\nexora-salary-slip-distributor.exe`
- **File Size**: 15,942,144 bytes
- **SHA-256 Checksum**:
  `B1BDA3DEA957AA454473E5A48C16B98A84833A003CF2ADB705E8F360994D96C3`
- **PE Machine Type**: `0x8664` (x64 / AMD64)
- **Subsystem**: Windows GUI (no background console window)
- **Product Version**: `1.0.0`

---

### 3. Verification & Diagnostic Metrics

| Verification Gate | Result / Metrics | Status |
| :--- | :--- | :---: |
| **TypeScript Compilation** | `npx tsc --noEmit` -> 0 errors | **PASS** |
| **Frontend Unit Tests** | Vitest 110 / 110 passing (13 test suites) | **PASS** |
| **Frontend Production Build** | `npm run build` -> 1656 modules transformed, 13.48s | **PASS** |
| **Rust Static Diagnostics** | `cargo check` -> 0 warnings, 0 errors | **PASS** |
| **Rust Unit & Integration Tests** | `cargo test` -> 83 / 83 passing (42.91s) | **PASS** |
| **Total Test Suite Execution** | 193 / 193 tests passed (100.0%) | **PASS** |
| **Database Integrity Pragma** | `PRAGMA integrity_check;` -> `ok` | **PASS** |
| **Foreign Key Enforcement** | `PRAGMA foreign_keys;` -> `1` (Active in runtime) | **PASS** |
| **Physical PDF Document Safety** | 100.0% SHA-256 hash match on 9/9 files | **PASS** |

---

### 4. Integration Status

- **WhatsApp Cloud API**: Unconfigured (Intentionally out of scope for v1.0.0; zero credentials or network requests required).
- **OCR Engine (Tesseract)**: Digital text extraction PASS (100% fidelity). Tesseract is optional; live acceptance not performed in release environment due to absence of local binary.
- **Windows SmartScreen**: Documented warning for unsigned binary; user bypass instructions provided.
- **Git Working Tree Status**: Clean (only intentional release documentation and version bumps tracked).

---

### 5. Final Release Sign-Off

**Release Gate Verdict**: **READY FOR v1.0.0 PRODUCTION RELEASE**  
**Authorized By**: Nexora Core Release Engineering  
