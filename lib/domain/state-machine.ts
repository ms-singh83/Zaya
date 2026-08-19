import { DomainError } from './errors';

/**
 * One loop per Deliverable, stored across two status columns plus the append-only
 * event log. Users see a single timeline through the derived Pipeline stage.
 * docs/10-ARCHITECTURE.md §3.
 *
 * Every transition goes through this module. No route handler mutates a status
 * directly, and every transition writes its event in the same transaction.
 */

export type DeliverableStatus =
  | 'draft'
  | 'sent'
  | 'viewed'
  | 'changes_requested'
  | 'approved'
  | 'invoiced';

export type InvoiceStatus = 'draft' | 'issued' | 'paid' | 'cancelled';

export type PipelineStage =
  | DeliverableStatus
  | 'reminded'
  | 'paid'
  | 'overdue'
  | 'cancelled';

const TRANSITIONS: Readonly<Record<DeliverableStatus, readonly DeliverableStatus[]>> = {
  draft: ['sent'],
  // sent can go straight to approved: a Client may reply "approve" on WhatsApp
  // without ever opening the Magic link. docs/08-USER-FLOWS.md E5.
  sent: ['viewed', 'approved', 'changes_requested'],
  viewed: ['approved', 'changes_requested'],
  // A new Version puts the Deliverable back in front of the Client.
  changes_requested: ['sent'],
  approved: ['invoiced'],
  invoiced: [],
};

export function canTransition(from: DeliverableStatus, to: DeliverableStatus): boolean {
  return (TRANSITIONS[from] ?? []).includes(to);
}

export function assertTransition(from: DeliverableStatus, to: DeliverableStatus): void {
  if (!canTransition(from, to)) {
    throw new DomainError(
      'invalid_state_transition',
      `A deliverable cannot go from ${from} to ${to}`,
    );
  }
}

export function allowedTransitions(from: DeliverableStatus): readonly DeliverableStatus[] {
  return TRANSITIONS[from] ?? [];
}

/** True once the Client has acted, which is what the audit trail turns on. */
export function isClientActed(status: DeliverableStatus): boolean {
  return status === 'approved' || status === 'changes_requested' || status === 'invoiced';
}

/**
 * The single stage shown to users, derived from both entities.
 * `reminded` means issued, unpaid, and at least one Reminder has gone out.
 * `overdue` means issued, unpaid, and past the due date.
 */
export function pipelineStage(input: {
  deliverableStatus: DeliverableStatus;
  invoiceStatus?: InvoiceStatus;
  balancePaise?: number;
  dueDate?: Date;
  remindersSent?: number;
  now?: Date;
}): PipelineStage {
  const { deliverableStatus, invoiceStatus } = input;
  if (!invoiceStatus || deliverableStatus !== 'invoiced') return deliverableStatus;

  if (invoiceStatus === 'cancelled') return 'cancelled';
  if (invoiceStatus === 'paid' || (input.balancePaise ?? 1) <= 0) return 'paid';
  if (invoiceStatus === 'draft') return 'invoiced';

  const now = input.now ?? new Date();
  if (input.dueDate && input.dueDate.getTime() < now.getTime()) return 'overdue';
  if ((input.remindersSent ?? 0) > 0) return 'reminded';
  return 'invoiced';
}
