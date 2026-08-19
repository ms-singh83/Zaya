import { describe, expect, it } from 'vitest';
import { DomainError } from '../errors';
import { formatInvoiceNumber, fyLabelForIssueDate, nextSequence } from '../invoice-number';

describe('financial year label for an issue date', () => {
  it('uses the Indian financial year', () => {
    expect(fyLabelForIssueDate(new Date('2026-08-18T16:12:00+05:30'))).toBe('2026-27');
  });

  // docs/16 §2.2: the boundary case.
  it('restarts the series on 1 April', () => {
    expect(fyLabelForIssueDate(new Date('2027-03-31T23:59:00+05:30'))).toBe('2026-27');
    expect(fyLabelForIssueDate(new Date('2027-04-01T00:01:00+05:30'))).toBe('2027-28');
  });
});

describe('nextSequence', () => {
  it('starts at 1 from an empty series', () => {
    expect(nextSequence(0)).toBe(1);
  });

  it('increments by exactly one, leaving no gap', () => {
    expect(nextSequence(11)).toBe(12);
  });

  it('rejects a negative or fractional last value', () => {
    expect(() => nextSequence(-1)).toThrow(DomainError);
    expect(() => nextSequence(1.5)).toThrow(DomainError);
  });
});

describe('formatInvoiceNumber', () => {
  it('renders prefix, financial year, and a zero-padded sequence', () => {
    expect(formatInvoiceNumber('INV', '2026-27', 12)).toBe('INV/2026-27/0012');
  });

  it('uppercases and trims the prefix', () => {
    expect(formatInvoiceNumber('  inv ', '2026-27', 1)).toBe('INV/2026-27/0001');
  });

  it('does not truncate a sequence past the pad width', () => {
    expect(formatInvoiceNumber('INV', '2026-27', 12345)).toBe('INV/2026-27/12345');
  });

  it.each(['', 'IN V', 'TOOLONGPREFIX', 'IN/V'])('rejects prefix "%s"', (prefix) => {
    expect(() => formatInvoiceNumber(prefix, '2026-27', 1)).toThrow(DomainError);
  });

  it('rejects a malformed financial year label', () => {
    expect(() => formatInvoiceNumber('INV', '2026', 1)).toThrow(DomainError);
  });

  it('rejects a sequence below 1', () => {
    expect(() => formatInvoiceNumber('INV', '2026-27', 0)).toThrow(DomainError);
  });
});

describe('series independence', () => {
  it('two workspaces allocate the same sequence independently', () => {
    // The pure layer cannot collide: uniqueness comes from
    // (workspace_id, fy_label, seq_in_fy) plus the row lock in the service layer.
    const a = formatInvoiceNumber('ACME', '2026-27', nextSequence(4));
    const b = formatInvoiceNumber('BETA', '2026-27', nextSequence(4));
    expect(a).toBe('ACME/2026-27/0005');
    expect(b).toBe('BETA/2026-27/0005');
    expect(a).not.toBe(b);
  });
});
