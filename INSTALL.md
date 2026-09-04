# Nexora — Salary Slip Distributor
## Installation Guide

**Version:** 1.0.0  
**Platform:** Windows 10 / Windows 11 (x64)  
**Release Date:** September 2026

---

## Table of Contents

1. [System Requirements](#system-requirements)
2. [Before You Install](#before-you-install)
3. [EXE Installer (Recommended)](#exe-installer-recommended)
4. [MSI Installer (Enterprise / IT Deployment)](#msi-installer-enterprise--it-deployment)
5. [Verify Your Download](#verify-your-download)
6. [First Launch](#first-launch)
7. [Uninstallation](#uninstallation)
8. [Troubleshooting Installation](#troubleshooting-installation)

---

## System Requirements

| Requirement | Minimum | Recommended |
|---|---|---|
| **OS** | Windows 10 (x64, 1903+) | Windows 11 (x64) |
| **RAM** | 4 GB | 8 GB |
| **Disk** | 150 MB free | 500 MB free |
| **Display** | 1280 × 720 | 1920 × 1080 |
| **Network** | Required for email delivery | Required for email delivery |
| **Privileges** | Standard user (no admin needed) | Standard user |

> **Note:** Nexora does **not** require administrator privileges to install or run. It installs to the current user's local application data folder.

---

## Before You Install

### Verify the Checksum

Always verify the SHA-256 checksum of your downloaded file before installation to confirm authenticity.

**PowerShell (recommended):**
```powershell
# For the EXE installer
Get-FileHash "Nexora-Setup-1.0.0-x64.exe" -Algorithm SHA256

# For the MSI installer
Get-FileHash "Nexora-1.0.0-x64.msi" -Algorithm SHA256
```

Compare the output against the values in `Nexora-1.0.0-SHA256SUMS.txt` (included in the release).

---

## EXE Installer (Recommended)

The NSIS-based EXE installer is the simplest installation method for individual users.

### Steps

1. Download `Nexora-Setup-1.0.0-x64.exe` from the release folder.
2. Verify the SHA-256 checksum (see above).
3. Double-click the installer file.

**SmartScreen Warning:**  
Because the installer is not yet code-signed with a commercial certificate, Windows SmartScreen may display a "Windows protected your PC" warning.

To proceed:
- Click **"More info"**
- Click **"Run anyway"**

4. Follow the on-screen installation wizard.
5. Choose an installation location (or accept the default under `%LOCALAPPDATA%\Nexora`).
6. Click **Install** and wait for completion.
7. Click **Finish** — Nexora will launch automatically (optional).

### Default Installation Location

```
C:\Users\<YourUsername>\AppData\Local\Nexora\
```

---

## MSI Installer (Enterprise / IT Deployment)

The Windows Installer (MSI) package is provided for IT administrators and enterprise deployment scenarios (Group Policy, SCCM, Intune).

### Silent Installation

```cmd
msiexec /i "Nexora-1.0.0-x64.msi" /quiet /norestart
```

### Silent Installation with Log

```cmd
msiexec /i "Nexora-1.0.0-x64.msi" /quiet /norestart /l*v "nexora_install.log"
```

### Silent Uninstallation

```cmd
msiexec /x "Nexora-1.0.0-x64.msi" /quiet /norestart
```

> **Note:** The MSI installs per-user by default, consistent with the EXE installer.

---

## First Launch

On first launch, Nexora will:

1. Create the local SQLite database at `%APPDATA%\com.nexora.distributor\nexora.db`
2. Run automatic schema migrations (version-stamped, safe)
3. Open the **Configuration** screen to set up your SMTP email provider

### Initial Configuration Checklist

- [ ] Navigate to **Settings → Email Provider**
- [ ] Enter your SMTP host, port, and credentials
- [ ] Click **Test Connection** to verify connectivity
- [ ] Navigate to **Settings → Organisation** and enter your company name

---

## Uninstallation

### Via Windows Settings (EXE install)

1. Open **Settings → Apps → Installed Apps**
2. Search for "Nexora"
3. Click the three-dot menu → **Uninstall**
4. Follow the uninstall wizard

### Via Control Panel (EXE install)

1. Open **Control Panel → Programs → Programs and Features**
2. Select **Nexora**
3. Click **Uninstall**

### Via MSI

```cmd
msiexec /x "Nexora-1.0.0-x64.msi" /quiet
```

### Data Retention After Uninstall

Nexora **does not delete your data on uninstall**. The following are preserved:

- `%APPDATA%\com.nexora.distributor\nexora.db` — SQLite database (employees, payroll history)
- `%APPDATA%\com.nexora.distributor\` — Application data folder

To fully remove all data, manually delete the folder above after uninstalling.

---

## Troubleshooting Installation

### "Windows protected your PC" (SmartScreen)

**Cause:** The installer lacks a commercial code-signing certificate.  
**Fix:** Click "More info" → "Run anyway"

### Installer fails to launch / nothing happens

1. Right-click the EXE → **Properties** → **General** tab → check if it is blocked
2. If blocked, click **Unblock** → **OK**
3. Try running again

### "The application failed to start" after install

1. Ensure your system is Windows 10 x64 (version 1903 or later)
2. Check `%LOCALAPPDATA%\Nexora\` exists with application files
3. Check Windows Event Viewer → Application logs for errors

### Application data not found after reinstall

The database is stored in `%APPDATA%\com.nexora.distributor\` and is preserved across reinstalls. No data is lost by reinstalling.

---

## Support

For issues, consult the [USER_GUIDE.md](USER_GUIDE.md) or [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md).
