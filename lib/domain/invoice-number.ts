import { DomainError } from './errors';
import { financialYearLabel } from './time';

/**
 * Invoice numbers are sequential and gapless per Workspace per financial year.
 * This module owns the pure part: the label, the next value, and the rendering.
 * The row lock that makes allocation safe under concurrency lives in the service
 * layer. docs/12-DATABASE.md, invoice_number_sequences.
 */

export const SEQUENCE_PAD_WIDTH = 4;

export function fyLabelForIssueDate(issuedAt: Date): string {
  return financialYearLabel(issuedAt);
}

export function nextSequence(lastSequence: number): number {
  if (!Number.isInteger(lastSequence) || lastSequence < 0) {
    throw new DomainError('invoice_bad_sequence', 'The last sequence must be a non-negative whole number');
  }
  return lastSequence + 1;
}

export function formatInvoiceNumber(prefix: string, fyLabel: string, sequence: number): string {
  const cleanPrefix = prefix.trim().toUpperCase();
  if (!/^[A-Z0-9]{1,10}$/.test(cleanPrefix)) {
    throw new DomainError(
      'invoice_bad_prefix',
      'The invoice prefix must be 1 to 10 letters or digits with no spaces',
    );
  }
  if (!/^\d{4}-\d{2}$/.test(fyLabel)) {
    throw new DomainError('invoice_bad_fy', `Financial year label must look like 2026-27, got "${fyLabel}"`);
  }
  if (!Number.isInteger(sequence) || sequence < 1) {
    throw new DomainError('invoice_bad_sequence', 'The sequence must be a whole number of at least 1');
  }
  return `${cleanPrefix}/${fyLabel}/${String(sequence).padStart(SEQUENCE_PAD_WIDTH, '0')}`;
}
