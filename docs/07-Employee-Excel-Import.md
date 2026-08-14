# 07 — Employee Excel Import Module

## Purpose & Architecture
Phase 1 implements local Excel spreadsheet parsing, header mapping, row validation, duplicate detection, import preview, and persistent storage for employee records in **Nexora**.

---

## 1. Supported File Formats & Privacy
- **Supported Formats**: `.xlsx`, `.xls`
- **Privacy Standard**: All spreadsheet parsing occurs 100% locally on the user's desktop using SheetJS (`xlsx`). Spreadsheet contents are never uploaded to an external server or logged in telemetry.

---

## 2. Header Mapping Rules
Header mapping is case-insensitive, whitespace-normalized, and deterministic.

| Logical Field | Required | Supported Header Aliases |
| :--- | :---: | :--- |
| **Employee ID** | **Yes** | `Employee ID`, `EmployeeID`, `Employee Id`, `Employee Code`, `Emp Code`, `Employee Code ID`, `ID`, `Emp ID`, `EmpID` |
| **Full Name** | **Yes** | `Full Name`, `Name`, `Employee Name`, `Employee Full Name`, `FullName` |
| **Email Address** | **Yes** | `Email`, `Email Address`, `Email ID`, `Email Id`, `EmailAddress` |
| **Phone Number** | Optional | `Phone`, `Phone Number`, `Mobile`, `Mobile Number`, `Contact Number`, `PhoneNumber`, `Contact` |
| **Department** | Optional | `Department`, `Dept` |

---

## 3. Validation & Duplicate Policy
- **Missing Required Columns**: Import is blocked immediately if Employee ID, Full Name, or Email Address header is absent.
- **Row Errors**: Missing Employee ID, missing Name, missing/invalid Email (`^\S+@\S+\.\S+$`), or duplicate Employee ID within the same file.
- **Row Warnings**: Missing optional fields (Phone or Department).
- **Existing Records**: Employee IDs already saved in Nexora are flagged as `Already imported` and excluded from new record counts.

---

## 4. Import Workflow Steps
1. **File Selection**: Click **Import Excel** to launch the file picker (`.xlsx`, `.xls`).
2. **Local Parsing**: `excelReader.ts` parses the workbook into JSON rows.
3. **Preview Modal**: Displays summary counters (`Total rows`, `Ready to import`, `Already imported`, `Needs attention`) and interactive preview table.
4. **User Confirmation**: User reviews details and clicks `Import X Employees` to confirm.
5. **Persistence**: Saves new valid employee records locally and refreshes the Employee Directory and Dashboard total employee counts.
