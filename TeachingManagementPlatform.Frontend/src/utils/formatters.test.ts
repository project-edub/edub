import { describe, it, expect } from 'vitest';
import { formatDate, formatCurrency } from './formatters';

describe('formatDate', () => {
  it('formats ISO date string to dd/MM/yyyy', () => {
    expect(formatDate('2024-06-15T10:00:00Z')).toBe('15/06/2024');
  });

  it('pads single-digit day and month with leading zeros', () => {
    expect(formatDate('2024-01-05T00:00:00Z')).toBe('05/01/2024');
  });

  it('handles end-of-year date', () => {
    expect(formatDate('2023-12-31T12:00:00Z')).toBe('31/12/2023');
  });

  it('handles date-only string', () => {
    expect(formatDate('2025-03-18')).toBe('18/03/2025');
  });
});

describe('formatCurrency', () => {
  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('0đ');
  });

  it('formats small amount without separators', () => {
    expect(formatCurrency(500)).toBe('500đ');
  });

  it('formats thousands with dot separator', () => {
    expect(formatCurrency(1500)).toBe('1.500đ');
  });

  it('formats millions with dot separators', () => {
    expect(formatCurrency(1500000)).toBe('1.500.000đ');
  });

  it('formats large amount', () => {
    expect(formatCurrency(100000000)).toBe('100.000.000đ');
  });

  it('truncates decimal portion', () => {
    expect(formatCurrency(1500.75)).toBe('1.500đ');
  });
});
