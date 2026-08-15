# Prompt 06 — Phase 5 Employee Matching & Manual Review System

## Objective
Implement local deterministic employee matching, candidate detection, conflict resolution, and HR manual review workspace in Nexora for Phase 5.

## Implementation Details:
1. Extended `src-tauri/src/matching/` with `normalizer.rs`, `matcher.rs`, `result.rs`, and `mod.rs`.
2. Implemented `StandardMatcher` supporting exact ID (100%), exact email (95%), exact phone (90%), conservative name matching (80%), conflict detection, and candidate scoring.
3. Updated SQLite schema & migrations in `connection.rs` with `matched_employee_id`, `match_reason`, `matched_at`, `reviewed_at`, `reviewed_by`, `review_note`, and indexes.
4. Extended `salary_slip_repo.rs` with `update_match_decision`.
5. Updated `salary_slip_service.rs` with `run_matching_engine`, `confirm_match`, `reject_match`, `reset_match`, `get_match_candidates`.
6. Exposed Tauri commands (`run_matching_engine`, `confirm_salary_slip_match`, `reject_salary_slip_match`, `reset_salary_slip_match`, `get_match_candidates`) and registered handlers in `lib.rs`.
7. Updated frontend types (`matching.ts`), services (`matchingService.ts`), Zustand stores (`matchingStore.ts`, `salarySlipStore.ts`), status badges (`StatusBadge.tsx`), and Dashboard statistics (`DashboardPage.tsx`).
8. Created `SalarySlipReviewDrawer.tsx` (`src/features/review/SalarySlipReviewDrawer.tsx`) providing sectioned extracted details, suggested employee, match explanation, candidate selector, and manual decision actions.
9. Turned `MatchingPage.tsx` (`src/pages/Matching/MatchingPage.tsx`) into full Review Workspace UI with confidentiality notice, batch cards, filter tabs, search, and batch matching.
10. Added Vitest unit tests (`tests/unit/matching/matcher.test.ts`) and Rust unit tests in `matcher.rs` and `normalizer.rs`.
11. All 5 verification commands (`tsc`, Vitest, Cargo test, Vite build, Cargo check) passed cleanly.
