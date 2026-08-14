import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

const fixturesDir = path.resolve('tests/fixtures/employees');
if (!fs.existsSync(fixturesDir)) {
  fs.mkdirSync(fixturesDir, { recursive: true });
}

function createWorkbook(data) {
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Employees');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

// 1. Valid Employees
fs.writeFileSync(
  path.join(fixturesDir, 'valid_employees.xlsx'),
  createWorkbook([
    ['Employee ID', 'Full Name', 'Email Address', 'Phone Number', 'Department'],
    ['EMP001', 'Test Employee 1', 'emp1@example.com', '9876543210', 'Engineering'],
    ['EMP002', 'Test Employee 2', 'emp2@example.com', '9876543211', 'HR'],
  ])
);

// 2. Missing Required Column (Employee ID)
fs.writeFileSync(
  path.join(fixturesDir, 'missing_required_column.xlsx'),
  createWorkbook([
    ['Full Name', 'Email Address', 'Phone Number'],
    ['Test Employee', 'emp@example.com', '9876543210'],
  ])
);

// 3. Duplicate Employee IDs inside file
fs.writeFileSync(
  path.join(fixturesDir, 'duplicate_employee_ids.xlsx'),
  createWorkbook([
    ['Employee ID', 'Full Name', 'Email Address'],
    ['EMP001', 'First Copy', 'first@example.com'],
    ['EMP001', 'Second Copy', 'second@example.com'],
  ])
);

// 4. Invalid Email
fs.writeFileSync(
  path.join(fixturesDir, 'invalid_email.xlsx'),
  createWorkbook([
    ['Employee ID', 'Full Name', 'Email Address'],
    ['EMP001', 'Valid Email', 'valid@example.com'],
    ['EMP002', 'Invalid Email', 'invalid-email-address'],
  ])
);

// 5. Empty Spreadsheet
const emptyWb = XLSX.utils.book_new();
const emptyWs = XLSX.utils.aoa_to_sheet([]);
XLSX.utils.book_append_sheet(emptyWb, emptyWs, 'EmptySheet');
fs.writeFileSync(path.join(fixturesDir, 'empty.xlsx'), XLSX.write(emptyWb, { type: 'buffer', bookType: 'xlsx' }));

console.log('Test fixtures created successfully!');
