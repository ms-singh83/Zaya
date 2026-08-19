import { describe, expect, it } from 'vitest';
import { DomainError } from '../errors';
import { assertPaise, formatINR, groupIndian, mulDivRoundHalfUp, paiseToRupeeString, rupeesToPaise } from '../money';

describe('rupeesToPaise', () => {
  it('parses whole rupees', () => {
    expect(rupeesToPaise('75000')).toBe(7_500_000);
  });

  it('parses two decimals', () => {
    expect(rupeesToPaise('73500.50')).toBe(7_350_050);
  });

  it('parses one decimal as tenths', () => {
    expect(rupeesToPaise('100.5')).toBe(10_050);
  });

  it('accepts Indian grouped input', () => {
    expect(rupeesToPaise('1,25,000')).toBe(12_500_000);
  });

  // docs/16 §2.1: precision-losing input is rejected, never silently rounded.
  it('rejects more than two decimals rather than rounding', () => {
    expect(() => rupeesToPaise('100000.005')).toThrow(DomainError);
  });

  it.each(['', 'abc', '-500', '12.', '.5', '1e3'])('rejects %s', (input) => {
    expect(() => rupeesToPaise(input)).toThrow(DomainError);
  });
});

describe('assertPaise', () => {
  it('rejects a float', () => {
    expect(() => assertPaise(10.5)).toThrow(/integer/);
  });

  it('rejects a negative', () => {
    expect(() => assertPaise(-1)).toThrow(/negative/);
  });

  it('rejects beyond the safe range', () => {
    expect(() => assertPaise(Number.MAX_SAFE_INTEGER + 2)).toThrow(DomainError);
  });

  it('accepts zero', () => {
    expect(() => assertPaise(0)).not.toThrow();
  });
});

describe('Indian digit grouping', () => {
  it.each([
    ['1', '1'],
    ['100', '100'],
    ['1000', '1,000'],
    ['75000', '75,000'],
    ['125000', '1,25,000'],
    ['10000000', '1,00,00,000'],
  ])('groups %s as %s', (input, expected) => {
    expect(groupIndian(input)).toBe(expected);
  });
});

describe('formatINR', () => {
  it('omits paise when there are none', () => {
    expect(formatINR(7_500_000)).toBe('₹75,000');
  });

  it('shows paise when present', () => {
    expect(formatINR(7_350_050)).toBe('₹73,500.50');
  });

  it('groups lakhs the Indian way', () => {
    expect(formatINR(12_500_000)).toBe('₹1,25,000');
  });

  it('can force paise', () => {
    expect(formatINR(7_500_000, { alwaysPaise: true })).toBe('₹75,000.00');
  });

  it('never abbreviates', () => {
    expect(formatINR(100_000_000)).not.toMatch(/k|K|L|Cr/);
  });
});

describe('paiseToRupeeString', () => {
  it.each([
    ['0', '0'],
    ['1', '1'],
    ['75000', '75000'],
    ['73500.50', '73500.50'],
    ['1.05', '1.05'],
    ['100.5', '100.50'],
  ])('renders %s as %s', (input, expected) => {
    expect(paiseToRupeeString(rupeesToPaise(input))).toBe(expected);
  });

  it('round-trips back to the same paise value', () => {
    for (const value of ['0', '75000', '73500.50', '1.05']) {
      const paise = rupeesToPaise(value);
      expect(rupeesToPaise(paiseToRupeeString(paise))).toBe(paise);
    }
  });
});

describe('mulDivRoundHalfUp', () => {
  it('rounds a half up', () => {
    // 5 * 1 / 2 = 2.5 -> 3
    expect(mulDivRoundHalfUp(5, 1, 2)).toBe(3);
  });

  it('rounds below a half down', () => {
    expect(mulDivRoundHalfUp(4, 1, 3)).toBe(1);
  });

  it('is exact on whole results', () => {
    expect(mulDivRoundHalfUp(1000, 1800, 10_000)).toBe(180);
  });

  it('rejects a non-positive divisor', () => {
    expect(() => mulDivRoundHalfUp(1, 1, 0)).toThrow(DomainError);
  });

  it('refuses to lose precision on overflow', () => {
    expect(() => mulDivRoundHalfUp(Number.MAX_SAFE_INTEGER, 1800, 10_000)).toThrow(/safe integer/);
  });
});
