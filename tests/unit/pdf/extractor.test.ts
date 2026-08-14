import { describe, it, expect } from 'vitest';
import { isPdfFile } from '../../../src/utils/file/fileUtils';

describe('PDF Extractor Scaffolding Tests', () => {
  it('should verify pdf file extension check', () => {
    expect(isPdfFile('salary_slip_001.pdf')).toBe(true);
    expect(isPdfFile('document.docx')).toBe(false);
  });
});
