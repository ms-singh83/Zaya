import { describe, expect, it } from 'vitest';
import { addDays, daysBetweenIst, financialYearLabel, fromIst, istDateString, toIstParts } from '../time';

describe('IST conversion', () => {
  it('shifts UTC by +05:30', () => {
    // 2026-08-18T10:42:00Z is 2026-08-18 16:12 IST, the timestamp used across the docs.
    expect(toIstParts(new Date('2026-08-18T10:42:00Z'))).toEqual({
      year: 2026,
      month: 8,
      day: 18,
      hour: 16,
      minute: 12,
    });
  });

  it('rolls the IST date forward late in the UTC evening', () => {
    expect(istDateString(new Date('2026-08-18T19:00:00Z'))).toBe('2026-08-19');
  });

  it('round-trips through fromIst', () => {
    const instant = fromIst(2026, 8, 18, 16, 12);
    expect(instant.toISOString()).toBe('2026-08-18T10:42:00.000Z');
  });
});

describe('financialYearLabel', () => {
  // docs/16 §2.2: the financial year runs 1 April to 31 March.
  it.each([
    ['2026-04-01T00:00:00+05:30', '2026-27'],
    ['2026-08-18T16:12:00+05:30', '2026-27'],
    ['2027-03-31T23:59:00+05:30', '2026-27'],
    ['2027-04-01T00:00:00+05:30', '2027-28'],
    ['2027-01-15T10:00:00+05:30', '2026-27'],
  ])('%s falls in %s', (iso, expected) => {
    expect(financialYearLabel(new Date(iso))).toBe(expected);
  });

  it('handles the century-adjacent short year', () => {
    expect(financialYearLabel(new Date('2099-05-01T00:00:00+05:30'))).toBe('2099-00');
  });
});

describe('daysBetweenIst', () => {
  it('counts whole IST calendar days', () => {
    expect(daysBetweenIst(new Date('2026-08-18T23:00:00+05:30'), new Date('2026-08-19T01:00:00+05:30'))).toBe(1);
  });

  it('is zero within one IST day', () => {
    expect(daysBetweenIst(new Date('2026-08-18T00:30:00+05:30'), new Date('2026-08-18T23:30:00+05:30'))).toBe(0);
  });
});

describe('addDays', () => {
  it('adds whole days', () => {
    expect(istDateString(addDays(new Date('2026-08-18T10:00:00+05:30'), 3))).toBe('2026-08-21');
  });

  it('rejects a fractional day', () => {
    expect(() => addDays(new Date(), 1.5)).toThrow();
  });
});
