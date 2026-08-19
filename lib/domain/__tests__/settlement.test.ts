import { describe, expect, it } from 'vitest';
import { DomainError } from '../errors';
import {
  computeNetReceived,
  settleInvoice,
  validatePaymentAgainstInvoice,
  type PaymentRecord,
} from '../settlement';

const confirmed = (grossPaise: number, tdsPaise = 0): PaymentRecord => ({
  grossPaise,
  tdsPaise,
  netReceivedPaise: grossPaise - tdsPaise,
  status: 'confirmed',
});

describe('computeNetReceived', () => {
  it('subtracts TDS from gross', () => {
    expect(computeNetReceived(7_500_000, 150_000)).toBe(7_350_000);
  });

  it('rejects TDS larger than gross', () => {
    expect(() => computeNetReceived(100, 200)).toThrow(/more than the gross/);
  });
});

/**
 * PRD acceptance criterion 5, verbatim:
 * ₹75,000 invoice, ₹73,500 received, ₹1,500 TDS recorded.
 */
describe('acceptance criterion 5 — bank transfer with TDS', () => {
  const invoiceTotal = 7_500_000; // ₹75,000

  it('settles the invoice in full on the gross amount', () => {
    const { netReceivedPaise, manualOverride } = validatePaymentAgainstInvoice({
      invoiceTotalPaise: invoiceTotal,
      alreadySettledPaise: 0,
      grossPaise: 7_500_000,
      tdsPaise: 150_000,
    });

    expect(netReceivedPaise).toBe(7_350_000); // ₹73,500 actually received
    expect(manualOverride).toBe(false);

    const result = settleInvoice(invoiceTotal, [confirmed(7_500_000, 150_000)]);
    expect(result.settledPaise).toBe(7_500_000);
    expect(result.balancePaise).toBe(0);
    expect(result.isPaid).toBe(true);
  });

  it('never adds the TDS back to the balance', () => {
    const result = settleInvoice(invoiceTotal, [confirmed(7_500_000, 150_000)]);
    expect(result.balancePaise).toBe(0);
  });
});

describe('settleInvoice', () => {
  it('is unpaid with no payments', () => {
    const result = settleInvoice(7_500_000, []);
    expect(result).toMatchObject({ settledPaise: 0, balancePaise: 7_500_000, isPaid: false });
  });

  // docs/08-USER-FLOWS.md E3: V1.0 leaves the invoice open and reminders running.
  it('leaves a partial payment open with the remaining balance', () => {
    const result = settleInvoice(7_500_000, [confirmed(4_000_000)]);
    expect(result.settledPaise).toBe(4_000_000);
    expect(result.balancePaise).toBe(3_500_000);
    expect(result.isPaid).toBe(false);
  });

  it('sums multiple confirmed payments', () => {
    const result = settleInvoice(7_500_000, [confirmed(4_000_000), confirmed(3_500_000)]);
    expect(result.isPaid).toBe(true);
    expect(result.balancePaise).toBe(0);
  });

  // docs/08-USER-FLOWS.md E4: a screenshot the Agency has not confirmed settles nothing.
  it('ignores a provisional payment entirely', () => {
    const result = settleInvoice(7_500_000, [
      { grossPaise: 7_500_000, tdsPaise: 0, netReceivedPaise: 7_500_000, status: 'provisional' },
    ]);
    expect(result.settledPaise).toBe(0);
    expect(result.isPaid).toBe(false);
    expect(result.hasProvisional).toBe(true);
  });

  it.each(['failed', 'refunded'] as const)('ignores a %s payment', (status) => {
    const result = settleInvoice(7_500_000, [
      { grossPaise: 7_500_000, tdsPaise: 0, netReceivedPaise: 7_500_000, status },
    ]);
    expect(result.settledPaise).toBe(0);
  });

  it('never reports a negative balance', () => {
    const result = settleInvoice(1_000, [confirmed(1_000)]);
    expect(result.balancePaise).toBe(0);
  });
});

describe('validatePaymentAgainstInvoice', () => {
  it('rejects an overpayment rather than absorbing it', () => {
    expect(() =>
      validatePaymentAgainstInvoice({
        invoiceTotalPaise: 7_500_000,
        alreadySettledPaise: 0,
        grossPaise: 8_000_000,
        tdsPaise: 0,
      }),
    ).toThrow(/more than the outstanding balance/);
  });

  it('rejects a payment that overshoots the remaining balance', () => {
    expect(() =>
      validatePaymentAgainstInvoice({
        invoiceTotalPaise: 7_500_000,
        alreadySettledPaise: 7_000_000,
        grossPaise: 600_000,
        tdsPaise: 0,
      }),
    ).toThrow(DomainError);
  });

  it('accepts a payment that exactly closes the balance', () => {
    expect(() =>
      validatePaymentAgainstInvoice({
        invoiceTotalPaise: 7_500_000,
        alreadySettledPaise: 7_000_000,
        grossPaise: 500_000,
        tdsPaise: 0,
      }),
    ).not.toThrow();
  });

  it('rejects a zero payment', () => {
    expect(() =>
      validatePaymentAgainstInvoice({
        invoiceTotalPaise: 7_500_000,
        alreadySettledPaise: 0,
        grossPaise: 0,
        tdsPaise: 0,
      }),
    ).toThrow(/more than zero/);
  });

  it('flags an explicit net override', () => {
    const result = validatePaymentAgainstInvoice({
      invoiceTotalPaise: 7_500_000,
      alreadySettledPaise: 0,
      grossPaise: 7_500_000,
      tdsPaise: 150_000,
      netReceivedPaise: 7_340_000, // bank charges deducted too
    });
    expect(result.manualOverride).toBe(true);
  });
});
