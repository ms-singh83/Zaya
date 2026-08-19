import { DomainError } from './errors';

/**
 * India Standard Time is a fixed +05:30 with no daylight saving, so exact
 * arithmetic needs no timezone library and stays pure. docs/10-ARCHITECTURE.md §4.
 */
export const IST_OFFSET_MINUTES = 330;
const MS_PER_MINUTE = 60_000;
const MS_PER_DAY = 86_400_000;

export interface IstParts {
  year: number;
  /** 1 to 12. */
  month: number;
  day: number;
  hour: number;
  minute: number;
}

export function toIstParts(instant: Date): IstParts {
  const shifted = new Date(instant.getTime() + IST_OFFSET_MINUTES * MS_PER_MINUTE);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
  };
}

/** Builds the UTC instant for a wall-clock time in IST. */
export function fromIst(year: number, month: number, day: number, hour = 0, minute = 0): Date {
  const asUtc = Date.UTC(year, month - 1, day, hour, minute);
  return new Date(asUtc - IST_OFFSET_MINUTES * MS_PER_MINUTE);
}

/** Adds whole days without drifting, since IST has no DST. */
export function addDays(instant: Date, days: number): Date {
  if (!Number.isInteger(days)) throw new DomainError('time_bad_days', 'days must be a whole number');
  return new Date(instant.getTime() + days * MS_PER_DAY);
}

/** Whole days elapsed between two instants, measured on IST calendar dates. */
export function daysBetweenIst(from: Date, to: Date): number {
  const a = toIstParts(from);
  const b = toIstParts(to);
  const aUtc = Date.UTC(a.year, a.month - 1, a.day);
  const bUtc = Date.UTC(b.year, b.month - 1, b.day);
  return Math.round((bUtc - aUtc) / MS_PER_DAY);
}

/**
 * Indian financial year label for an instant, e.g. "2026-27".
 * The year runs 1 April to 31 March. docs/12-DATABASE.md, invoice numbering.
 */
export function financialYearLabel(instant: Date): string {
  const { year, month } = toIstParts(instant);
  const startYear = month >= 4 ? year : year - 1;
  const endShort = String((startYear + 1) % 100).padStart(2, '0');
  return `${startYear}-${endShort}`;
}

/** IST calendar date as an ISO date string, which is what a `date` column stores. */
export function istDateString(instant: Date): string {
  const { year, month, day } = toIstParts(instant);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
