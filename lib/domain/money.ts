import { DomainError } from './errors';

/**
 * All money is an integer number of paise. Never a float, never a decimal string
 * in a calculation path. docs/12-DATABASE.md §0.
 */
export type Paise = number;

/** Largest value we allow, so integer maths stays exact inside Number. */
const MAX_PAISE = Number.MAX_SAFE_INTEGER;

export function assertPaise(value: number, label = 'amount'): asserts value is Paise {
  if (!Number.isInteger(value)) {
    throw new DomainError('money_not_integer', `${label} must be an integer number of paise, got ${value}`);
  }
  if (value < 0) {
    throw new DomainError('money_negative', `${label} must not be negative, got ${value}`);
  }
  if (value > MAX_PAISE) {
    throw new DomainError('money_too_large', `${label} exceeds the supported range`);
  }
}

/**
 * Parses a rupee amount entered by an Agency user into paise.
 * Accepts "75000", "75000.50", "1,25,000.75". Rejects more than two decimals
 * rather than silently rounding, because a silent round on an Invoice is a defect.
 */
export function rupeesToPaise(input: string | number): Paise {
  const raw = typeof input === 'number' ? String(input) : input.trim().replace(/,/g, '');
  if (raw === '' || !/^\d+(\.\d{1,2})?$/.test(raw)) {
    throw new DomainError('money_unparseable', `Enter an amount in rupees with at most two decimals, got "${input}"`);
  }
  const [whole = '0', frac = ''] = raw.split('.');
  const paise = Number(whole) * 100 + Number(frac.padEnd(2, '0'));
  assertPaise(paise);
  return paise;
}

export function paiseToRupeeString(paise: Paise): string {
  assertPaise(paise);
  const whole = Math.floor(paise / 100);
  const frac = paise % 100;
  return frac === 0 ? String(whole) : `${whole}.${String(frac).padStart(2, '0')}`;
}

/** Indian digit grouping: last three digits, then groups of two. */
export function groupIndian(digits: string): string {
  if (digits.length <= 3) return digits;
  const last3 = digits.slice(-3);
  const rest = digits.slice(0, -3);
  return `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${last3}`;
}

/**
 * Presentation only. ₹75,000 and ₹1,25,000.50.
 * docs/09-UX-UI-SPECIFICATION.md §1.5: INR everywhere, never abbreviated.
 */
export function formatINR(paise: Paise, opts: { alwaysPaise?: boolean } = {}): string {
  assertPaise(paise);
  const whole = Math.floor(paise / 100);
  const frac = paise % 100;
  const grouped = groupIndian(String(whole));
  if (frac === 0 && !opts.alwaysPaise) return `₹${grouped}`;
  return `₹${grouped}.${String(frac).padStart(2, '0')}`;
}

/** Half-up rounding of `value * numerator / denominator` using integer maths. */
export function mulDivRoundHalfUp(value: number, numerator: number, denominator: number): number {
  if (denominator <= 0) throw new DomainError('money_bad_divisor', 'denominator must be positive');
  const product = value * numerator;
  if (!Number.isSafeInteger(product)) {
    throw new DomainError('money_overflow', 'intermediate value exceeded the safe integer range');
  }
  return Math.floor((product + denominator / 2) / denominator);
}
