# 12 — Provider Configuration & Persistence Guide

## Purpose & Overview
This document describes the persistent configuration architecture for SMTP Email (including Gmail SMTP with App Passwords) and Meta WhatsApp Business Cloud API in **Nexora — Salary Slip Distributor**.

---

## 1. Provider Configuration Architecture
```
Settings UI (SettingsPage.tsx)
        ↓
settingsStore (Zustand)
        ↓
settingsService (IPC Wrapper)
        ↓
Tauri IPC Commands (save_email_settings, save_whatsapp_settings, test_email_connection, test_whatsapp_connection)
        ↓
Rust SettingsRepository (settings_repo.rs)
        ↓
SQLite Database (nexora.db → settings table)
```

---

## 2. Secrets Protection & Security Model
- **No Plaintext Passwords or Access Tokens to React**:
  - `AppSettingsResponse`, `EmailConfigResponse`, and `WhatsAppConfigResponse` strip plaintext secrets and expose boolean flags `hasPassword` and `hasAccessToken`.
- **Password Preservation on Save**:
  - When saving settings with a masked password value (`••••••••` / empty string), the backend retains the existing secret stored in SQLite.
- **Backend-Driven Connection Testing**:
  - `test_email_connection` and `test_whatsapp_connection` load credentials directly from SQLite in Rust. The frontend is never required to re-send passwords when running connection checks.

---

## 3. Gmail SMTP Configuration Instructions
To deliver salary slips via Gmail SMTP:
1. Enable **2-Step Verification** on your Google Account.
2. Generate an **App Password** under Google Account Security.
3. In Nexora Settings -> Email Provider:
   - **Mail Server (SMTP Host)**: `smtp.gmail.com`
   - **Port**: `587`
   - **Username / Account Email**: `your-email@gmail.com`
   - **App Password**: Paste your 16-character Google App Password.
   - **Sender Email Address**: `your-email@gmail.com`
   - **Security Mode**: `STARTTLS`
4. Click **Save Changes**, then **Test Email Connection**.

---

## 4. WhatsApp Business Cloud API Configuration
To deliver salary slips via WhatsApp:
1. Obtain Meta WhatsApp Business Cloud API credentials from Meta for Developers.
2. In Nexora Settings -> WhatsApp API:
   - **Service Endpoint (API URL)**: `https://graph.facebook.com/v18.0`
   - **Phone Number ID**: Your Meta Phone Number ID (e.g. `100020003000`).
   - **Access Token**: Your System User Permanent Access Token.
3. Click **Save Changes**, then **Test WhatsApp Connection**.

---

## 5. Delivery Engine Integration
The Salary Slip Delivery Engine (`delivery_service.rs`) reads saved `EmailConfig` and `WhatsAppConfig` directly from SQLite via `SettingsRepository`. Credentials persist across tab switches, page navigation, and application restarts.
