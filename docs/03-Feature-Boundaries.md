# 03 — Feature Module Boundaries

1. **Module 1: Employee Import**: Excel parsing -> SQLite records.
2. **Module 2: Salary Slip Processing**: Local folder scan -> PDF file hash.
3. **Module 3: PDF Extraction**: Primary embedded text extractor.
4. **Module 4: OCR Engine**: Fallback for scanned/image PDFs.
5. **Module 5: Employee Matching**: Signal-based matching priority.
6. **Module 6: Review UI**: Human approval for ambiguous matches.
7. **Module 7: WhatsApp**: Official Cloud API provider integration.
8. **Module 8: Email**: SMTP/provider integration.
9. **Module 9: Bulk Sending**: Async job queue worker.
10. **Module 10: History**: Delivery audit logs & retries.
