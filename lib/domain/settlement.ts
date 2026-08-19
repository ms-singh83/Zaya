import { DomainError } from './errors';
import { assertPaise, formatINR, type Paise } from './money';

/**
 * Settlement decides when an Invoice is paid.
 *
 * A brand client (Persona C) pays by bank transfer and deducts TDS at source, so
 * the amount that lands in the bank is smaller than the amount that settles the
 * Invoice. The Invoice is settled by the GROSS figure. The TDS figure is recorded
 * and never added back to the balance.
 * docs/08-USER-FLOWS.md F2.8, docs/12-DATABASE.md payments.
 */

export type PaymentStatus = 'provisional' | 'confirmed' | 'failed' | 'refunded';

export interface PaymentRecord {
  grossPaise: Paise;
  tdsPaise: Paise;
  netReceivedPaise: Paise;
  status: PaymentStatus;
}

export interface SettlementResult {
  settledPaise: Paise;
  balancePaise: Paise;
  isPaid: boolean;
  /** A Payment awaiting Agency confirmation. It never settles anything. */
  hasProvisional: boolean;
}

/** Default net. The Agency may override it, and the override is flagged on the row. */
export function computeNetReceived(grossPaise: Paise, tdsPaise: Paise): Paise {
  assertPaise(grossPaise, 'gross amount');
  assertPaise(tdsPaise, 'TDS amount');
  if (tdsPaise > grossPaise) {
    throw new DomainError('payment_tds_exceeds_gross', 'TDS cannot be more than the gross amount');
  }
  return grossPaise - tdsPaise;
}

/**
 * Validates one Payment against the Invoice before it is written.
 * Overpayment is rejected rather than absorbed, because silently accepting more
 * than the Invoice total hides a data-entry mistake in someone's receivables.
 */
export function validatePaymentAgainstInvoice(args: {
  invoiceTotalPaise: Paise;
  alreadySettledPaise: Paise;
  grossPaise: Paise;
  tdsPaise: Paise;
  netReceivedPaise?: Paise;
}): { netReceivedPaise: Paise; manualOverride: boolean } {
  assertPaise(args.invoiceTotalPaise, 'invoice total');
  assertPaise(args.alreadySettledPaise, 'settled amount');
  assertPaise(args.grossPaise, 'gross amount');
  assertPaise(args.tdsPaise, 'TDS amount');

  if (args.grossPaise === 0) {
    throw new DomainError('payment_zero', 'A payment must be more than zero');
  }

  const expectedNet = computeNetReceived(args.grossPaise, args.tdsPaise);
  const netReceivedPaise = args.netReceivedPaise ?? expectedNet;
  assertPaise(netReceivedPaise, 'net received');

  const remaining = args.invoiceTotalPaise - args.alreadySettledPaise;
  if (args.grossPaise > remaining) {
    throw new DomainError(
      'payment_exceeds_balance',
      `This payment of ${formatINR(args.grossPaise)} is more than the outstanding balance of ${formatINR(
        Math.max(remaining, 0),
      )}`,
    );
  }

  return { netReceivedPaise, manualOverride: netReceivedPaise !== expectedNet };
}

/**
 * Only confirmed Payments settle an Invoice. A provisional Payment, for example a
 * screenshot the Client sent that the Agency has not confirmed, never moves the
 * Invoice to paid. docs/08-USER-FLOWS.md E4.
 */
export function settleInvoice(invoiceTotalPaise: Paise, payments: readonly PaymentRecord[]): SettlementResult {
  assertPaise(invoiceTotalPaise, 'invoice total');

  const settledPaise = payments
    .filter((p) => p.status === 'confirmed')
    .reduce((sum, p) => sum + p.grossPaise, 0);

  return {
    settledPaise,
    balancePaise: Math.max(invoiceTotalPaise - settledPaise, 0),
    isPaid: settledPaise >= invoiceTotalPaise,
    hasProvisional: payments.some((p) => p.status === 'provisional'),
  };
}
