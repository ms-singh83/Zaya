import { DomainError } from './errors';
import { addDays, fromIst, toIstParts } from './time';

/**
 * The Reminder ladder. D3 gentle, D7 firm, D14 final, counted from the Invoice
 * issue date. docs/08-USER-FLOWS.md F3.
 *
 * Scheduling is owned by Inngest, never by a request handler. This module owns
 * the pure decisions: when each tier lands, and whether a due tier should fire.
 */

export type ReminderTier = 'gentle' | 'firm' | 'final';

export type SkipReason = 'paid' | 'paused' | 'cancelled' | 'date_passed_while_paused' | 'already_sent';

export const REMINDER_LADDER: readonly { tier: ReminderTier; offsetDays: number }[] = [
  { tier: 'gentle', offsetDays: 3 },
  { tier: 'firm', offsetDays: 7 },
  { tier: 'final', offsetDays: 14 },
];

/** Reminders go out mid-morning IST, not at whatever hour the Invoice was issued. */
export const REMINDER_SEND_HOUR_IST = 10;

export interface ScheduledReminder {
  tier: ReminderTier;
  scheduledFor: Date;
}

export function computeReminderSchedule(issuedAt: Date): ScheduledReminder[] {
  return REMINDER_LADDER.map(({ tier, offsetDays }) => {
    const day = toIstParts(addDays(issuedAt, offsetDays));
    return {
      tier,
      scheduledFor: fromIst(day.year, day.month, day.day, REMINDER_SEND_HOUR_IST),
    };
  });
}

export interface TierDecisionInput {
  invoiceStatus: 'draft' | 'issued' | 'paid' | 'cancelled';
  balancePaise: number;
  remindersPaused: boolean;
  alreadySent: boolean;
  scheduledFor: Date;
  now: Date;
}

export type TierDecision = { send: true } | { send: false; reason: SkipReason };

/**
 * Decided at fire time, not at schedule time, because the Invoice may have been
 * paid, cancelled, or paused since the job was queued.
 *
 * A tier whose date passed while Reminders were paused is skipped rather than
 * fired late, so resuming never produces a burst of stale Reminders.
 */
export function decideTier(input: TierDecisionInput): TierDecision {
  if (input.alreadySent) return { send: false, reason: 'already_sent' };
  if (input.invoiceStatus === 'cancelled') return { send: false, reason: 'cancelled' };
  if (input.invoiceStatus === 'paid' || input.balancePaise <= 0) return { send: false, reason: 'paid' };
  if (input.remindersPaused) return { send: false, reason: 'paused' };
  if (input.scheduledFor.getTime() > input.now.getTime()) {
    throw new DomainError('reminder_not_due', 'This reminder tier is not due yet');
  }
  return { send: true };
}

/**
 * On resume, only tiers still in the future are rescheduled. Tiers whose date
 * passed during the pause are recorded as skipped.
 */
export function tiersToRescheduleOnResume(
  schedule: readonly ScheduledReminder[],
  sentTiers: readonly ReminderTier[],
  now: Date,
): { reschedule: ScheduledReminder[]; skip: { tier: ReminderTier; reason: SkipReason }[] } {
  const reschedule: ScheduledReminder[] = [];
  const skip: { tier: ReminderTier; reason: SkipReason }[] = [];

  for (const entry of schedule) {
    if (sentTiers.includes(entry.tier)) continue;
    if (entry.scheduledFor.getTime() <= now.getTime()) {
      skip.push({ tier: entry.tier, reason: 'date_passed_while_paused' });
    } else {
      reschedule.push(entry);
    }
  }
  return { reschedule, skip };
}
