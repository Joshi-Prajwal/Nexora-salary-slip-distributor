# Nexora — Salary Slip Distributor
## User Guide

**Version:** 1.0.0  
**Platform:** Windows 10 / Windows 11 (x64)

---

## Table of Contents

1. [Overview](#overview)
2. [Core Concepts](#core-concepts)
3. [Getting Started](#getting-started)
4. [Managing Employees](#managing-employees)
5. [Importing Salary Slips](#importing-salary-slips)
6. [Employee Matching & Manual Review](#employee-matching--manual-review)
7. [Approving & Distributing Salary Slips](#approving--distributing-salary-slips)
8. [Email Delivery History](#email-delivery-history)
9. [Retry & Re-delivery](#retry--re-delivery)
10. [Settings & Configuration](#settings--configuration)
11. [Multi-Month Payroll](#multi-month-payroll)
12. [Keyboard Shortcuts](#keyboard-shortcuts)
13. [Frequently Asked Questions](#frequently-asked-questions)

---

## Overview

**Nexora** is a local Windows desktop application for distributing salary slips to employees via email. It runs entirely offline (except for sending email), stores all data locally, and never sends your payroll data to any external server.

### What Nexora Does

- Imports employee lists from Excel (.xlsx)
- Scans folders of salary slip PDFs
- Extracts employee identifiers from PDFs (text extraction + OCR fallback)
- Matches PDFs to employee records
- Presents unmatched slips for manual review
- Sends approved salary slips to employees via your configured SMTP provider
- Records delivery history per employee per month
- Prevents duplicate delivery (idempotency enforcement)

### What Nexora Does NOT Do

- ❌ Calculate salary or generate payroll
- ❌ Create or edit PDF files
- ❌ Send data to any cloud service
- ❌ Require an internet connection (except for SMTP during delivery)
- ❌ Store data anywhere except your local machine

---

## Core Concepts

| Term | Meaning |
|---|---|
| **Employee** | A person in your database, identified by employee ID and name |
| **Salary Slip** | A PDF document for a specific employee for a specific pay period |
| **Pay Period** | A month/year combination (e.g., September 2026) |
| **Matching** | The process of linking a PDF to an employee record |
| **Approval** | The human review step required before any email is sent |
| **Delivery** | The act of emailing an approved salary slip to the employee |

---

## Getting Started

### Step 1: Configure Email (SMTP)

Before distributing any salary slips, configure your email provider:

1. Click **Settings** (gear icon) in the left navigation
2. Select **Email Provider**
3. Fill in:
   - **SMTP Host** (e.g., `smtp.gmail.com`)
   - **SMTP Port** (e.g., `587` for TLS, `465` for SSL)
   - **Username** (your email address)
   - **Password** (your email password or app password)
   - **From Name** (e.g., "HR Department")
   - **From Address** (e.g., `hr@yourcompany.com`)
4. Click **Test Connection** to verify
5. Click **Save**

> **Security Note:** SMTP credentials are encrypted at rest using Windows DPAPI. They are never stored in plain text.

### Step 2: Import Employees

See [Managing Employees](#managing-employees).

### Step 3: Import Salary Slips

See [Importing Salary Slips](#importing-salary-slips).

---

## Managing Employees

### Importing from Excel

Nexora imports employee data from `.xlsx` files.

**Required columns in your Excel file:**

| Column | Required | Notes |
|---|---|---|
| Employee ID | ✅ Yes | Unique identifier (e.g., EMP001) |
| Name | ✅ Yes | Full name |
| Email | ✅ Yes | Email address for delivery |
| Department | No | Optional grouping |

**Steps:**

1. Click **Employees** in the left navigation
2. Click **Import from Excel**
3. Select your `.xlsx` file
4. Review the preview showing mapped columns
5. Click **Import**

### Adding Employees Manually

1. Click **Employees** in the left navigation
2. Click **+ Add Employee**
3. Fill in the form fields
4. Click **Save**

### Editing an Employee

1. Click the employee row in the table
2. Click the **Edit** (pencil) icon
3. Make changes
4. Click **Save**

> **Note:** Changing an employee's email address does not affect already-delivered salary slips. Only future deliveries use the new address.

---

## Importing Salary Slips

### Scan a Salary Slip Folder

1. Click **Salary Slips** in the left navigation
2. Click **Scan Folder**
3. Choose a folder containing PDF salary slips
4. Select the **Pay Period** (month + year)
5. Click **Start Scan**

Nexora will:
- Enumerate all `.pdf` files in the folder
- Extract text from each PDF
- Use OCR on pages where text extraction fails
- Attempt to match each PDF to an employee in your database
- Present results with confidence scores

### Understanding Scan Results

| Status | Meaning |
|---|---|
| **Matched** | PDF confidently linked to an employee |
| **Needs Review** | Low-confidence or ambiguous match — human review required |
| **Unmatched** | No employee candidate found |

---

## Employee Matching & Manual Review

### Auto-matched Slips

High-confidence matches are shown with a green indicator. These are ready for approval.

### Manual Review Queue

Slips requiring human review are shown with an amber indicator.

**To review a slip:**

1. Click the slip row to open the detail panel
2. Review the extracted text from the PDF
3. Review the suggested employee candidates (if any)
4. Either:
   - **Select the correct employee** from the list
   - **Enter an employee ID** manually
   - **Mark as Undeliverable** if the slip cannot be matched
5. Click **Confirm Match**

> **Important:** Nexora requires a confirmed match before any approval or delivery is possible. This is a deliberate human-in-the-loop safety gate.

---

## Approving & Distributing Salary Slips

### Approval Workflow

No salary slip is ever emailed without an explicit approval step.

1. Navigate to **Salary Slips** → select a pay period
2. Review the list of matched slips
3. Select one or more slips (checkbox)
4. Click **Approve Selected** (or click individual **Approve** buttons)
5. Nexora marks them as approved — they are now queued for delivery

### Sending Approved Slips

1. After approving, click **Send Approved**
2. Nexora displays a pre-send summary:
   - Number of slips to send
   - Recipient email addresses
   - Pay period
3. Click **Confirm & Send**

Nexora sends each approved slip with the PDF attached. Real-time status is shown.

### Delivery Safety

- Nexora **checks for existing successful delivery** before sending
- If a slip was already delivered, it will **not** be sent again (idempotency)
- You can override this with **Force Re-send** (available per-slip in history)

---

## Email Delivery History

1. Click **History** in the left navigation
2. Filter by:
   - Employee
   - Pay period (month/year)
   - Status (Delivered / Failed / Pending)
3. Click any row to see:
   - Timestamp
   - Recipient address
   - SMTP response
   - Error details (for failures)

---

## Retry & Re-delivery

### Automatic Retry

Failed deliveries (SMTP errors, connection timeouts) are automatically retried up to **3 times** with exponential back-off.

### Manual Retry

1. Go to **History**
2. Find the failed delivery
3. Click **Retry**

Nexora will attempt delivery again immediately.

### Force Re-send

To send a salary slip that was already successfully delivered:

1. Go to **History**
2. Find the delivered record
3. Click **Force Re-send**
4. Confirm the dialog

> **Warning:** Force Re-send will send a duplicate email to the employee. Use only when explicitly requested (e.g., employee did not receive the original).

---

## Settings & Configuration

### Email Provider

Configure SMTP credentials. See [Getting Started](#step-1-configure-email-smtp).

### Organisation Settings

- **Company Name** — displayed in the application header and email subject lines
- **Pay Period Label** — label format for monthly pay periods

### Data Management

- **Export Database** — export the SQLite database for backup
- **Import Database** — restore from a backup (replaces current data)

> **Warning:** Import Database replaces all current data. Back up first.

---

## Multi-Month Payroll

Nexora supports managing salary slips across multiple pay periods independently.

- Each pay period is completely isolated in the database
- You can have October 2026 slips fully delivered while November 2026 slips are still in review
- History for each month is preserved indefinitely
- Scanning a new folder always prompts you to confirm the pay period

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl + E` | Open Employees |
| `Ctrl + S` | Open Salary Slips |
| `Ctrl + H` | Open History |
| `Ctrl + ,` | Open Settings |
| `Escape` | Close modal / cancel |

---

## Frequently Asked Questions

**Q: Does Nexora work without an internet connection?**  
A: Yes — all data is stored locally. Only the email delivery step requires network access to reach your SMTP server.

**Q: Can I use Gmail as my SMTP provider?**  
A: Yes. Use `smtp.gmail.com:587` with TLS. You must generate a Google App Password (not your regular Gmail password) in your Google Account security settings.

**Q: What happens if the app crashes during email delivery?**  
A: Nexora tracks delivery state in the database. On next launch, you can retry any failed deliveries from the History screen. Successfully delivered slips are never re-sent automatically.

**Q: Can I move the database to a different PC?**  
A: Yes. Use **Settings → Data Management → Export Database** to export, then **Import Database** on the new machine.

**Q: The PDF has no text — what happens?**  
A: Nexora falls back to OCR (Optical Character Recognition) using Windows OCR or Tesseract (if installed). If OCR also fails to extract an employee identifier, the slip is placed in the manual review queue.

**Q: How do I handle an employee who has left the company?**  
A: The employee record remains in the database for historical purposes. You can mark them as inactive in the employee settings, which prevents future deliveries to that address.

**Q: Are employee email addresses encrypted?**  
A: Employee records (names, email addresses) are stored in the local SQLite database. SMTP credentials (passwords) are encrypted using Windows DPAPI. The database itself is protected by local OS file permissions.
