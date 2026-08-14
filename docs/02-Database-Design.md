# 02 — Database Design (SQLite)

## Entities & Tables

### 1. `employees`
Stores employee demographic & contact records imported from Excel.
- `id` (TEXT PRIMARY KEY)
- `employee_id` (TEXT UNIQUE)
- `name` (TEXT)
- `phone` (TEXT)
- `whatsapp_number` (TEXT)
- `email` (TEXT)
- `department` (TEXT)
- `designation` (TEXT)

### 2. `salary_slips`
Metadata for scanned PDF files in selected local folder.
- `id` (TEXT PRIMARY KEY)
- `file_path` (TEXT UNIQUE)
- `file_name` (TEXT)
- `file_hash` (TEXT)
- `detected_employee_id` (TEXT)
- `extraction_method` (TEXT)
- `match_confidence` (REAL)
- `match_status` (TEXT)

### 3. `mappings`
Explicit links between salary slips and employees.

### 4. `message_logs`
Audit log of distribution attempts.

### 5. `settings`
Local application settings and provider credentials.
