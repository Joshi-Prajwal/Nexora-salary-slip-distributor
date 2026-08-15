# 11 — Employee Matching & Manual Review System

## Purpose & Overview
Phase 5 implements a 100% local, deterministic Employee Matching and HR Manual Review Engine for **Nexora**. It compares extracted salary-slip employee metadata (Employee ID, Name, Email, Phone) against authoritative employee records stored in SQLite, computes a deterministic match score and status, presents candidates in a dedicated Review Workspace UI, and enables manual confirmation, correction, rejection, or reset.

---

## 1. Matching Data Flow & Pipeline
```
Salary Slip PDF
        ↓
Phase 3 Embedded Text Extraction / Phase 4 Local OCR
        ↓
Extracted Identifiers (Employee ID, Name, Email, Phone)
        ↓
Phase 5 Normalization Layer (normalizer.rs)
        ↓
Deterministic Matching Engine (matcher.rs)
        │
        ├── Priority 1: Exact Employee ID  ──> EXACT_MATCH (100% confidence)
        ├── Priority 2: Exact Email        ──> STRONG_MATCH (95% confidence)
        ├── Priority 3: Exact Phone        ──> STRONG_MATCH (90% confidence)
        ├── Priority 4: Conservative Name   ──> POSSIBLE_MATCH (80% confidence)
        └── Conflicting Identifiers       ──> CONFLICT (Requires Manual Review)
        │
        ▼
HR Review Workspace UI (ReviewPage.tsx & SalarySlipReviewDrawer.tsx)
        │
        ├── Confirm Match     ──> MANUALLY_CONFIRMED (Eligible for delivery)
        ├── Change Employee   ──> Searchable Employee List Selection
        ├── Reject Match      ──> MANUALLY_REJECTED (Not eligible for delivery)
        └── Reset Match       ──> Recalculate automatic match result
        │
        ▼
SQLite Database Persistence (matched_employee_id, match_status, match_reason, reviewed_at)
```

---

## 2. Match Priority Rules & Confidence Scoring
- **`EXACT_MATCH` (100% Score)**: Normalized `detected_employee_id` exactly matches `employees.employee_id`.
- **`STRONG_MATCH` (95% or 90% Score)**: `detected_email` matches `employees.email` (95%) or `detected_phone` matches `employees.phone` (90%).
- **`POSSIBLE_MATCH` (80% Score)**: `detected_name` conservatively matches `employees.name`.
- **`CONFLICT`**: Extracted Employee ID points to Employee A while Email/Phone points to Employee B, or multiple candidate employees have near-identical match scores.
- **`NO_MATCH` (0% Score)**: No candidate employee qualifies.

---

## 3. Delivery Eligibility Policy
Only salary slips with the following approved statuses are eligible for Phase 6 distribution:
1. `EXACT_MATCH`
2. `STRONG_MATCH`
3. `MANUALLY_CONFIRMED`

Slips marked `POSSIBLE_MATCH`, `CONFLICT`, `NO_MATCH`, `UNMATCHED`, or `MANUALLY_REJECTED` are **not** eligible for delivery until manually reviewed and confirmed.

---

## 4. Privacy & Local Storage
- **100% Local**: Zero cloud network requests or external LLM API calls.
- **Master Data Protection**: Salary-slip extraction never overwrites authoritative employee master records in SQLite.
- **Original PDF Safety**: Original PDF files on disk are **never modified, renamed, moved, or deleted**.
