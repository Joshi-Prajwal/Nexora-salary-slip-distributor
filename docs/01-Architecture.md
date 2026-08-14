# 01 — System Architecture

## Architecture Layers

```
React UI Layer (Pages, Components)
  ↓
Zustand State Management (appStore, employeeStore, matchingStore, etc)
  ↓
Application Services (employeeService, salarySlipService, matchingService)
  ↓
Domain Layer & Adapters (PDF extractor, OCR Engine, Matcher, Providers)
  ↓
Rust Tauri Core Commands & Local SQLite Database
```

## Desktop Shell
- Built with **Tauri v2** for Windows target.
- IPC communication using Tauri commands.
- Local SQLite database storage.
