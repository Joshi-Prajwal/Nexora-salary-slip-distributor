# 10 — OCR Fallback Engine

## Purpose & Overview
Phase 4 implements a fully local, privacy-preserving Optical Character Recognition (OCR) fallback engine for **Nexora**. When a salary-slip PDF file cannot be read via embedded text extraction (scanned image PDFs, image-only documents, or unreadable embedded font streams returning `TEXT_EXTRACTION_FAILED`), Nexora triggers the OCR Fallback Engine locally, feeds the extracted OCR text directly into the existing Phase 3 identifier parser (`parser.rs`), persists the results into SQLite (`salary_slips` table), and updates the UI identification status.

---

## 1. Complete Pipeline Architecture
```
Salary Slip PDF
        ↓
Phase 3 Embedded Text Extraction (pdf-extract)
        ↓
Was embedded text successfully extracted?
        │
        ├── YES ──> Existing Phase 3 Parser ──> Identification Status (IDENTIFIED / PARTIALLY_IDENTIFIED / NOT_IDENTIFIED)
        │
        └── NO  ──> TEXT_EXTRACTION_FAILED
                          ↓
                    PHASE 4 LOCAL OCR FALLBACK ENGINE (src-tauri/src/ocr/)
                          ↓
                    Image Preprocessing (Grayscale + Contrast Enhancement via image crate)
                          ↓
                    Local Tesseract OCR Engine Execution (tesseract CLI)
                          ↓
                    Extracted OCR Text Output
                          ↓
                    EXISTING PHASE 3 PARSER (src-tauri/src/pdf/parser.rs)
                          ↓
                    Updated Identification Status (IDENTIFIED / PARTIALLY_IDENTIFIED / NOT_IDENTIFIED)
                          ↓
                    SQLite Persistence (ocr_confidence, ocr_processed_at, ocr_error)
```

---

## 2. OCR Engine Selection & Rationale
- **Selected Engine**: Local Tesseract OCR Executable (`tesseract` CLI).
- **Selection Rationale**:
  - 100% Offline & Local: Zero cloud APIs (OpenAI, Google Cloud Vision, Azure, AWS Textract).
  - Open-Source & Reliable: Standard document OCR engine for Windows desktop environments.
  - Executable Discovery: Automatically discovers `tesseract` in system `PATH` or standard installation locations (`C:\Program Files\Tesseract-OCR\tesseract.exe`, `.\tesseract.exe`).
  - Graceful Fallback: If Tesseract is not installed on the host system, returns structured `OcrError::EngineUnavailable` without crashing.

---

## 3. Privacy & Security Assurance
- **100% Local Processing**: PDF files, rendered images, OCR text, and employee PII never leave the user's computer.
- **No Unsafe Logging**: Employee names, IDs, emails, phone numbers, and OCR text streams are never written to unencrypted log files.
- **Original File Preservation**: Physical PDF files on disk are **never modified, renamed, moved, or deleted**.
- **Temp File Cleanup**: Rendered page images created in `temp_dir` are deleted immediately after OCR recognition completes.

---

## 4. Identification Status & Database Fields
- **Statuses**:
  - `IDENTIFIED`: Employee ID successfully extracted from OCR text.
  - `PARTIALLY_IDENTIFIED`: Employee ID missing, but Name, Email, or Phone extracted.
  - `NOT_IDENTIFIED`: OCR text produced, but no supported employee identifier matched.
  - `TEXT_EXTRACTION_FAILED`: OCR recognition failed or engine missing.
  - `DUPLICATE_CONTENT`: Phase 2 content duplicate status preserved.
- **New SQLite Columns**:
  - `ocr_confidence` (REAL)
  - `ocr_processed_at` (TEXT)
  - `ocr_error` (TEXT)
