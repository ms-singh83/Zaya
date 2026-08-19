import { DomainError } from './errors';
import { assertPaise, mulDivRoundHalfUp, type Paise } from './money';

/** Tax rates are basis points. 18% is 1800. docs/12-DATABASE.md §0. */
export type RateBps = number;

export const SUPPORTED_GST_RATES_BPS: readonly RateBps[] = [0, 500, 1200, 1800, 2800];

export interface TaxSplit {
  cgstPaise: Paise;
  sgstPaise: Paise;
  igstPaise: Paise;
}

export interface LineInput {
  taxablePaise: Paise;
  rateBps: RateBps;
}

export interface LineResult extends TaxSplit {
  taxablePaise: Paise;
  rateBps: RateBps;
  totalPaise: Paise;
}

export interface InvoiceTotals extends TaxSplit {
  subtotalPaise: Paise;
  totalPaise: Paise;
  lines: LineResult[];
}

/**
 * Place of supply decides the split. Same state gives CGST plus SGST at half the
 * rate each, a different state gives IGST at the full rate.
 * CLAUDE.md §3 rule 4.
 */
export function isInterstate(supplierStateCode: string, placeOfSupplyStateCode: string): boolean {
  const a = normaliseStateCode(supplierStateCode);
  const b = normaliseStateCode(placeOfSupplyStateCode);
  return a !== b;
}

export function normaliseStateCode(code: string): string {
  const trimmed = code.trim();
  if (!/^\d{1,2}$/.test(trimmed)) {
    throw new DomainError('gst_bad_state_code', `State code must be one or two digits, got "${code}"`);
  }
  return trimmed.padStart(2, '0');
}

export function assertSupportedRate(rateBps: RateBps): void {
  if (!SUPPORTED_GST_RATES_BPS.includes(rateBps)) {
    throw new DomainError(
      'gst_unsupported_rate',
      `GST rate ${rateBps} bps is not one of the supported rates (0, 5, 12, 18, 28 percent)`,
    );
  }
}

/**
 * Tax for one line, rounded half-up to the nearest paisa.
 * The intrastate split takes the total line tax and halves it, so CGST plus SGST
 * always equals the line tax exactly even when the tax is an odd number of paise.
 */
export function computeLineTax(line: LineInput, interstate: boolean): TaxSplit {
  assertPaise(line.taxablePaise, 'taxable value');
  assertSupportedRate(line.rateBps);

  const lineTax = mulDivRoundHalfUp(line.taxablePaise, line.rateBps, 10_000);

  if (interstate) {
    return { cgstPaise: 0, sgstPaise: 0, igstPaise: lineTax };
  }
  const cgst = Math.floor(lineTax / 2);
  return { cgstPaise: cgst, sgstPaise: lineTax - cgst, igstPaise: 0 };
}

/**
 * Invoice totals. Tax is computed and rounded per line, then summed. It is never
 * computed on the Invoice total, because the two can differ by a paisa and the
 * per-line result is the correct one. docs/16-TESTING-STRATEGY.md §2.1.
 */
export function computeInvoiceTotals(lines: readonly LineInput[], interstate: boolean): InvoiceTotals {
  if (lines.length === 0) {
    throw new DomainError('gst_no_lines', 'An invoice needs at least one line item');
  }

  const results: LineResult[] = lines.map((line) => {
    const split = computeLineTax(line, interstate);
    return {
      taxablePaise: line.taxablePaise,
      rateBps: line.rateBps,
      ...split,
      totalPaise: line.taxablePaise + split.cgstPaise + split.sgstPaise + split.igstPaise,
    };
  });

  const subtotalPaise = results.reduce((sum, l) => sum + l.taxablePaise, 0);
  const cgstPaise = results.reduce((sum, l) => sum + l.cgstPaise, 0);
  const sgstPaise = results.reduce((sum, l) => sum + l.sgstPaise, 0);
  const igstPaise = results.reduce((sum, l) => sum + l.igstPaise, 0);

  return {
    subtotalPaise,
    cgstPaise,
    sgstPaise,
    igstPaise,
    totalPaise: subtotalPaise + cgstPaise + sgstPaise + igstPaise,
    lines: results,
  };
}
