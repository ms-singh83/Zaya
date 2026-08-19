import { describe, expect, it } from 'vitest';
import { DomainError } from '../errors';
import {
  REMINDER_SEND_HOUR_IST,
  computeReminderSchedule,
  decideTier,
  tiersToRescheduleOnResume,
  type ScheduledReminder,
  type TierDecisionInput,
} from '../reminders';
import { istDateString, toIstParts } from '../time';

const issuedAt = new Date('2026-08-18T16:12:00+05:30');

describe('computeReminderSchedule', () => {
  it('places the three tiers at D3, D7 and D14 from the issue date', () => {
    const schedule = computeReminderSchedule(issuedAt);
    expect(schedule.map((s) => s.tier)).toEqual(['gentle', 'firm', 'final']);
    expect(schedule.map((s) => istDateString(s.scheduledFor))).toEqual([
      '2026-08-21',
      '2026-08-25',
      '2026-09-01',
    ]);
  });

  it('sends mid-morning IST, not at the issue hour', () => {
    for (const entry of computeReminderSchedule(issuedAt)) {
      expect(toIstParts(entry.scheduledFor).hour).toBe(REMINDER_SEND_HOUR_IST);
      expect(toIstParts(entry.scheduledFor).minute).toBe(0);
    }
  });

  it('crosses a month boundary correctly', () => {
    const schedule = computeReminderSchedule(new Date('2026-08-30T09:00:00+05:30'));
    expect(schedule.map((s) => istDateString(s.scheduledFor))).toEqual([
      '2026-09-02',
      '2026-09-06',
      '2026-09-13',
    ]);
  });
});

describe('decideTier', () => {
  const base: TierDecisionInput = {
    invoiceStatus: 'issued',
    balancePaise: 7_500_000,
    remindersPaused: false,
    alreadySent: false,
    scheduledFor: new Date('2026-08-21T10:00:00+05:30'),
    now: new Date('2026-08-21T10:00:05+05:30'),
  };

  it('sends a due tier on an unpaid invoice', () => {
    expect(decideTier(base)).toEqual({ send: true });
  });

  it('skips when the invoice is paid', () => {
    expect(decideTier({ ...base, invoiceStatus: 'paid' })).toEqual({ send: false, reason: 'paid' });
  });

  it('skips when the balance reached zero even if the status lags', () => {
    expect(decideTier({ ...base, balancePaise: 0 })).toEqual({ send: false, reason: 'paid' });
  });

  it('skips when the invoice was cancelled', () => {
    expect(decideTier({ ...base, invoiceStatus: 'cancelled' })).toEqual({ send: false, reason: 'cancelled' });
  });

  it('honours the per-invoice pause toggle', () => {
    expect(decideTier({ ...base, remindersPaused: true })).toEqual({ send: false, reason: 'paused' });
  });

  // Makes a duplicate Inngest run a no-op, alongside the (invoice_id, tier) unique index.
  it('is idempotent on a tier that already went out', () => {
    expect(decideTier({ ...base, alreadySent: true })).toEqual({ send: false, reason: 'already_sent' });
  });

  it('refuses to fire a tier before it is due', () => {
    expect(() => decideTier({ ...base, now: new Date('2026-08-20T10:00:00+05:30') })).toThrow(DomainError);
  });

  it('checks paid before paused, so a paid invoice never reports as merely paused', () => {
    expect(decideTier({ ...base, invoiceStatus: 'paid', remindersPaused: true })).toEqual({
      send: false,
      reason: 'paid',
    });
  });
});

describe('tiersToRescheduleOnResume', () => {
  const schedule: ScheduledReminder[] = computeReminderSchedule(issuedAt);

  /**
   * docs/08-USER-FLOWS.md F3: a tier whose date passed while paused is skipped,
   * never fired late in a burst.
   */
  it('skips tiers whose date passed during the pause', () => {
    const now = new Date('2026-08-26T10:00:00+05:30'); // after gentle and firm
    const { reschedule, skip } = tiersToRescheduleOnResume(schedule, [], now);
    expect(skip.map((s) => s.tier)).toEqual(['gentle', 'firm']);
    expect(skip.every((s) => s.reason === 'date_passed_while_paused')).toBe(true);
    expect(reschedule.map((r) => r.tier)).toEqual(['final']);
  });

  it('reschedules everything still in the future', () => {
    const now = new Date('2026-08-19T10:00:00+05:30');
    const { reschedule, skip } = tiersToRescheduleOnResume(schedule, [], now);
    expect(reschedule).toHaveLength(3);
    expect(skip).toHaveLength(0);
  });

  it('never re-sends a tier that already went out', () => {
    const now = new Date('2026-08-19T10:00:00+05:30');
    const { reschedule } = tiersToRescheduleOnResume(schedule, ['gentle'], now);
    expect(reschedule.map((r) => r.tier)).toEqual(['firm', 'final']);
  });

  it('produces no bursts when resuming after the whole ladder elapsed', () => {
    const now = new Date('2026-10-01T10:00:00+05:30');
    const { reschedule, skip } = tiersToRescheduleOnResume(schedule, [], now);
    expect(reschedule).toHaveLength(0);
    expect(skip).toHaveLength(3);
  });
});
