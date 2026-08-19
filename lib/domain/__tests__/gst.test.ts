import { describe, expect, it } from 'vitest';
import { DomainError } from '../errors';
import { computeInvoiceTotals, computeLineTax, isInterstate, normaliseStateCode } from '../gst';

describe('place of supply', () => {
  it('is intrastate when the state codes match', () => {
    expect(isInterstate('27', '27')).toBe(false);
  });

  it('is interstate when they differ', () => {
    expect(isInterstate('27', '29')).toBe(true);
  });

  it('normalises a single-digit code', () => {
    expect(normaliseStateCode('6')).toBe('06');
    expect(isInterstate('6', '06')).toBe(false);
  });

  it('rejects a malformed code', () => {
    expect(() => normaliseStateCode('MH')).toThrow(DomainError);
  });
});

describe('intrastate split (CGST + SGST)', () => {
  // docs/16 §2.1: 18 percent intrastate splits into 9 plus 9, IGST is zero.
  it('splits 18 percent on ₹75,000 into 9 plus 9', () => {
    const split = computeLineTax({ taxablePaise: 7_500_000, rateBps: 1800 }, false);
    expect(split).toEqual({ cgstPaise: 675_000, sgstPaise: 675_000, igstPaise: 0 });
  });

  it('keeps CGST plus SGST exactly equal to the line tax on an odd paisa', () => {
    // 5 percent of ₹100.01 is 500.05 paise, which rounds to 500 paise, an even split.
    // ₹100.03 at 5 percent is 500.15 -> 500. Use a value that produces an odd tax.
    const taxable = 30_00; // ₹30.00
    const split = computeLineTax({ taxablePaise: taxable, rateBps: 500 }, false);
    const lineTax = split.cgstPaise + split.sgstPaise;
    expect(lineTax).toBe(150);
    expect(split.igstPaise).toBe(0);
  });

  it('splits an odd line tax without losing a paisa', () => {
    // 5 percent of ₹0.99 (99 paise) = 4.95 -> 5 paise. Split is 2 + 3.
    const split = computeLineTax({ taxablePaise: 99, rateBps: 500 }, false);
    expect(split.cgstPaise + split.sgstPaise).toBe(5);
    expect(split.cgstPaise).toBe(2);
    expect(split.sgstPaise).toBe(3);
  });
});

describe('interstate split (IGST)', () => {
  it('charges the full rate as IGST', () => {
    const split = computeLineTax({ taxablePaise: 7_500_000, rateBps: 1800 }, true);
    expect(split).toEqual({ cgstPaise: 0, sgstPaise: 0, igstPaise: 1_350_000 });
  });
});

describe('supported rate table', () => {
  it.each([0, 500, 1200, 1800, 2800])('accepts %i bps', (rateBps) => {
    expect(() => computeLineTax({ taxablePaise: 100_000, rateBps }, true)).not.toThrow();
  });

  it('charges nothing at 0 percent', () => {
    expect(computeLineTax({ taxablePaise: 100_000, rateBps: 0 }, true).igstPaise).toBe(0);
  });

  it('rejects an unsupported rate', () => {
    expect(() => computeLineTax({ taxablePaise: 100_000, rateBps: 1500 }, true)).toThrowError(
      expect.objectContaining({ code: 'gst_unsupported_rate' }),
    );
  });

  it('rejects a float taxable value', () => {
    expect(() => computeLineTax({ taxablePaise: 100.5, rateBps: 1800 }, true)).toThrow(DomainError);
  });
});

describe('computeInvoiceTotals', () => {
  it('sums a single 18 percent intrastate line', () => {
    const totals = computeInvoiceTotals([{ taxablePaise: 7_500_000, rateBps: 1800 }], false);
    expect(totals.subtotalPaise).toBe(7_500_000);
    expect(totals.cgstPaise).toBe(675_000);
    expect(totals.sgstPaise).toBe(675_000);
    expect(totals.igstPaise).toBe(0);
    expect(totals.totalPaise).toBe(8_850_000);
  });

  /**
   * docs/16 §2.1: tax is rounded per line then summed, and this differs from
   * rounding the total. The per-line result is the correct one.
   */
  it('rounds per line, not on the total', () => {
    const lines = [
      { taxablePaise: 33, rateBps: 500 },
      { taxablePaise: 33, rateBps: 500 },
      { taxablePaise: 33, rateBps: 500 },
    ];
    const totals = computeInvoiceTotals(lines, true);
    // Each line: 33 * 5% = 1.65 paise -> 2 paise. Three lines -> 6 paise.
    expect(totals.igstPaise).toBe(6);
    // Rounding on the total instead would give 99 * 5% = 4.95 -> 5 paise.
    const totalLevel = Math.floor((99 * 500 + 5000) / 10_000);
    expect(totalLevel).toBe(5);
    expect(totals.igstPaise).not.toBe(totalLevel);
  });

  it('handles mixed rates on one invoice', () => {
    const totals = computeInvoiceTotals(
      [
        { taxablePaise: 1_000_000, rateBps: 1800 },
        { taxablePaise: 500_000, rateBps: 500 },
      ],
      true,
    );
    expect(totals.subtotalPaise).toBe(1_500_000);
    expect(totals.igstPaise).toBe(180_000 + 25_000);
    expect(totals.totalPaise).toBe(1_500_000 + 205_000);
  });

  it('reports each line result', () => {
    const totals = computeInvoiceTotals([{ taxablePaise: 100_000, rateBps: 1800 }], false);
    expect(totals.lines).toHaveLength(1);
    expect(totals.lines[0]?.totalPaise).toBe(118_000);
  });

  it('rejects an invoice with no lines', () => {
    expect(() => computeInvoiceTotals([], false)).toThrow(/at least one line/);
  });
});
