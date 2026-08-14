# 04 — Security Architecture

## Principles
1. **Local Data Isolation**: No employee data or salary PDFs are stored outside local disk.
2. **Credential Sanitization**: Provider secrets (SMTP passwords, API tokens) must never be logged or exposed in UI error state.
3. **Error Redaction**: All backend errors pass through `SanitizedError` transformation.
