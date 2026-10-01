import { describe, it, expect } from 'vitest';
import { formatCurrency, formatNumber, formatDate, formatTime, formatDateTime } from '@/lib/utils';

describe('format helpers are null-safe', () => {
  // The dashboard crashed with "Application Error" because RecentActivity
  // rows were rendered with formatDate(undefined), which threw
  // "Cannot read properties of undefined (reading 'getDate')".
  // These guards keep a single bad row from taking down the whole page.
  it('formatDate does not throw on null, undefined or empty input', () => {
    expect(() => formatDate(undefined)).not.toThrow();
    expect(() => formatDate(null)).not.toThrow();
    expect(() => formatDate('')).not.toThrow();
    expect(formatDate(undefined)).toBe('-');
    expect(formatDate(null)).toBe('-');
    expect(formatDate('')).toBe('-');
  });

  it('formatDate does not throw on an unparseable string', () => {
    expect(() => formatDate('not-a-date')).not.toThrow();
    expect(formatDate('not-a-date')).toBe('-');
  });

  it('formatDate still formats real dates', () => {
    expect(formatDate('2026-03-09')).toBe('09-03-2026');
    expect(formatDate('2026-03-09', 'YYYY-MM-DD')).toBe('2026-03-09');
    expect(formatDate('2026-03-09', 'DD/MM/YYYY')).toBe('09/03/2026');
  });

  it('formatTime and formatDateTime are null-safe', () => {
    expect(() => formatTime(undefined)).not.toThrow();
    expect(() => formatDateTime(undefined)).not.toThrow();
    expect(formatTime(undefined)).toBe('-');
    expect(formatDateTime(undefined)).toBe('-');
  });

  it('formatCurrency falls back to zero for non-numeric input', () => {
    expect(() => formatCurrency(undefined)).not.toThrow();
    expect(() => formatCurrency(null)).not.toThrow();
    expect(() => formatCurrency(Number.NaN)).not.toThrow();
    expect(formatCurrency(undefined)).toBe(formatCurrency(0));
  });

  it('formatNumber falls back to zero for non-numeric input', () => {
    expect(formatNumber(undefined)).toBe('0');
    expect(formatNumber(null)).toBe('0');
  });
});
