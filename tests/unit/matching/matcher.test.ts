import { describe, it, expect } from 'vitest';
import { formatConfidence } from '../../../src/utils/formatting/formatter';

describe('Matching Scaffolding Tests', () => {
  it('should format confidence percentages correctly', () => {
    expect(formatConfidence(0.95)).toBe('95%');
    expect(formatConfidence(0.854)).toBe('85%');
    expect(formatConfidence(0)).toBe('0%');
  });
});
