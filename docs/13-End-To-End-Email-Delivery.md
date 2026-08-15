# 13 — End-to-End Email Delivery & Audit Guide

## Purpose & Overview
This document describes the production-ready email transmission pipeline for **Nexora — Salary Slip Distributor**. It covers SMTP transmission (STARTTLS/SSL), Gmail App Password authentication, MIME multipart message construction, PDF attachment encoding, real test email dispatch, and delivery lifecycle persistence.

---

## 1. End-to-End Delivery Architecture
```
Sending Page (SendingPage.tsx)
        ↓
Delivery Store (deliveryStore.ts)
        ↓
Delivery Service (deliveryService.ts)
        ↓
Tauri IPC Commands (send_salary_slips_batch, send_test_email, retry_delivery_record)
        ↓
Rust DeliveryService (delivery_service.rs)
        ↓
SettingsRepository (Loads email_config & password from SQLite)
        ↓
SmtpEmailProvider (provider.rs using Lettre SMTP client)
        ↓
MIME Multipart Message Construction (Plain text body + PDF attachment bytes)
        ↓
Gmail SMTP Server (smtp.gmail.com:587 with STARTTLS & App Password)
        ↓
Recipient Mailbox (Real PDF Attachment Received)
        ↓
SQLite Database (delivery_records → status = SENT)
```

---

## 2. Distinction Between Connection Test & Real Email Send
- **Test Connection (`test_email_connection`)**:
  - Performs SMTP socket connection and `STARTTLS` / AUTH LOGIN handshake test.
  - Verifies that `smtp.gmail.com:587` credentials are valid without sending a message.
- **Send Test Email (`send_test_email`)**:
  - Builds a real MIME email (`Subject: "Nexora Email Delivery Test"`).
  - Transmits the message over SMTP to the specified recipient.
- **Salary Slip Send (`send_salary_slips_batch`)**:
  - Reads salary slip PDF bytes from disk (`application/pdf`).
  - Renders user template placeholders (`{{employee_name}}`, `{{employee_id}}`, `{{company_name}}`, `{{month}}`, `{{year}}`).
  - Transmits full MIME multipart message to recipient.

---

## 3. Idempotency & Duplicate Prevention
- `DeliveryService` checks `delivery_records` before sending.
- If a record with matching `salary_slip_id`, `channel = 'EMAIL'`, and status `SENT` exists, the slip is marked `ALREADY_SENT` / `SKIPPED`.
- Resending is blocked unless explicitly retrying a `FAILED` record via `retry_delivery_record`.

---

## 4. Troubleshooting & Error Diagnostics
- `SMTP_NOT_CONFIGURED`: Missing host, username, or password in Settings.
- `INVALID_RECIPIENT`: Recipient email format is invalid.
- `ATTACHMENT_ERROR`: PDF file not found or empty (0 bytes).
- `SMTP_AUTH_FAILED`: Gmail App Password authentication failed.
- `SMTP_CONNECT_FAILED`: Could not connect to mail server on port 587.
- `SMTP_SEND_FAILED`: Message transmission rejected by SMTP server.
