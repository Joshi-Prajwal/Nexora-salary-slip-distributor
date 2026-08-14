# Prompt 04 — PDF Text Extraction & Employee Identifier Detection

## Objective
Implement local embedded PDF text extraction using `pdf-extract` and deterministic identifier parsing in Nexora for Phase 3.

## Implementation Details:
1. Integrated `pdf-extract = "0.7"` and `regex = "1"` in `src-tauri/Cargo.toml`.
2. Updated `extractor.rs` to extract embedded text from local PDF files cleanly.
3. Updated `parser.rs` with `DefaultDocumentParser` normalizing whitespace and running regex pattern matching for Employee ID, Name, Email, and Phone.
4. Added Rust unit tests in `parser.rs` for testing multiline Employee IDs, Emp Code labels, names, emails, and phone numbers.
5. Added `find_by_id` and `update_extraction_result` methods to `salary_slip_repo.rs`.
6. Exposed `extract_salary_slip_text` and `extract_all_salary_slips` Tauri commands.
7. Updated `salarySlipService.ts`, `salarySlipStore.ts`, `StatusBadge.tsx`, `SalarySlipDrawer.tsx`, and `SalarySlipsPage.tsx` with **"Identify Salary Slips"** primary bulk action and identifier display.
8. Created unit test suite `tests/unit/pdf/extractor.test.ts`.
9. Verified 0 TypeScript errors, 4/4 Rust unit tests passed, 36/36 Vitest tests passed, Vite production build succeeded, and Rust cargo check passed.
