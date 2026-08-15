# 11 — Salary Slip Delivery Engine

## Purpose & Overview
Phase 6 implements a production-ready, local-first Salary Slip Delivery Engine for **Nexora**. Approved salary slips (`EXACT_MATCH`, `STRONG_MATCH`, `MANUALLY_CONFIRMED`) are dispatched to employees via Email (SMTP attachment), WhatsApp (Official Cloud API document upload), or Both channels concurrently.

---

## 1. Delivery Architecture & Data Flow
```
Approved Salary Slips (EXACT_MATCH, STRONG_MATCH, MANUALLY_CONFIRMED)
        ↓
Channel Selection (Email, WhatsApp, Both)
        ↓
Pre-Send Validation & Idempotency Check (preview_delivery_batch)
        ↓
Delivery Batch Execution (send_salary_slips_batch)
        ├── Email Provider Adapter (SmtpEmailProvider) ──> Attachment Validation & Dispatch
        └── WhatsApp Provider Adapter (CloudApiWhatsAppProvider) ──> Document Upload & Dispatch
        ↓
SQLite Database Record Persistence (delivery_records)
        ↓
Real-Time Progress & Delivery Summary UI (SendingPage.tsx)
        ↓
Audit History & Failed Retry Workspace (HistoryPage.tsx)
```

---

## 2. Channel Rules & Provider Abstractions
- **Email Delivery (`EMAIL`)**:
  - Requires employee email address.
  - Requires valid SMTP configuration (`host`, `port`, `username`, `password`, `from_address`).
  - Sends original salary slip PDF as an attachment.
  - Substitutes template placeholders (`{{employee_name}}`, `{{employee_id}}`, `{{company_name}}`, `{{month}}`, `{{year}}`).
- **WhatsApp Delivery (`WHATSAPP`)**:
  - Requires employee phone number.
  - Requires Meta WhatsApp Business Cloud API configuration (`api_url`, `api_token`, `phone_number_id`).
  - Uploads original salary slip PDF document.
  - Zero browser scraping or unofficial web automation.
- **Both Channels (`BOTH`)**:
  - Attempts Email and WhatsApp independently.
  - Failure on Email does not block WhatsApp execution; failure on WhatsApp does not block Email execution.

---

## 3. Idempotency & Duplicate Send Prevention
- Before dispatching, `DeliveryService` queries `delivery_records` for matching `salary_slip_id`, `channel`, and status `SENT`.
- If a successful delivery record already exists, the slip is marked `ALREADY_SENT` / `SKIPPED`.
- Resending a delivered slip is prevented unless explicitly executing a `retry_delivery_record` on a previously `FAILED` attempt.

---

## 4. Attachment Validation & PDF Safety
- Verifies original PDF file existence on disk, file readability, non-zero file size, and PDF extension.
- Original salary-slip PDF files on disk are **never modified, renamed, moved, or deleted**.

---

## 5. Security & Credentials
- SMTP passwords and WhatsApp access tokens remain strictly in backend/configuration state.
- No credentials or secrets are exposed in logs, SQLite plaintext, or React UI.
- Local-first architecture: PDF files and SQLite records remain strictly local.
