import { describe, expect, it } from 'vitest';
import { DomainError } from '../errors';
import {
  allowedTransitions,
  assertTransition,
  canTransition,
  isClientActed,
  pipelineStage,
  type DeliverableStatus,
} from '../state-machine';

const ALL: DeliverableStatus[] = ['draft', 'sent', 'viewed', 'changes_requested', 'approved', 'invoiced'];

const LEGAL: [DeliverableStatus, DeliverableStatus][] = [
  ['draft', 'sent'],
  ['sent', 'viewed'],
  ['sent', 'approved'],
  ['sent', 'changes_requested'],
  ['viewed', 'approved'],
  ['viewed', 'changes_requested'],
  ['changes_requested', 'sent'],
  ['approved', 'invoiced'],
];

describe('legal transitions', () => {
  it.each(LEGAL)('%s -> %s is allowed', (from, to) => {
    expect(canTransition(from, to)).toBe(true);
    expect(() => assertTransition(from, to)).not.toThrow();
  });

  // docs/08-USER-FLOWS.md E5: a WhatsApp "approve" reply never opens the link.
  it('allows sent -> approved for a plain-text approval', () => {
    expect(canTransition('sent', 'approved')).toBe(true);
  });

  // docs/08-USER-FLOWS.md F2.4: a new Version puts it back in front of the Client.
  it('returns a changes_requested deliverable to sent', () => {
    expect(canTransition('changes_requested', 'sent')).toBe(true);
  });
});

describe('illegal transitions', () => {
  const legalSet = new Set(LEGAL.map(([a, b]) => `${a}->${b}`));

  it('rejects every transition not explicitly allowed', () => {
    for (const from of ALL) {
      for (const to of ALL) {
        if (legalSet.has(`${from}->${to}`)) continue;
        expect(canTransition(from, to)).toBe(false);
        expect(() => assertTransition(from, to)).toThrow(DomainError);
      }
    }
  });

  it.each([
    ['draft', 'approved'],
    ['approved', 'sent'],
    ['approved', 'approved'],
    ['invoiced', 'approved'],
    ['sent', 'invoiced'],
  ] as [DeliverableStatus, DeliverableStatus][])('rejects %s -> %s', (from, to) => {
    expect(() => assertTransition(from, to)).toThrow(/cannot go from/);
  });

  it('treats invoiced as terminal for the deliverable', () => {
    expect(allowedTransitions('invoiced')).toHaveLength(0);
  });
});

describe('isClientActed', () => {
  it.each(['approved', 'changes_requested', 'invoiced'] as DeliverableStatus[])('%s counts as acted', (s) => {
    expect(isClientActed(s)).toBe(true);
  });

  it.each(['draft', 'sent', 'viewed'] as DeliverableStatus[])('%s does not', (s) => {
    expect(isClientActed(s)).toBe(false);
  });
});

describe('pipelineStage', () => {
  const now = new Date('2026-08-19T10:00:00+05:30');

  it('mirrors the deliverable status before invoicing', () => {
    expect(pipelineStage({ deliverableStatus: 'viewed' })).toBe('viewed');
    expect(pipelineStage({ deliverableStatus: 'approved' })).toBe('approved');
  });

  it('is invoiced when the invoice is issued with no reminders yet', () => {
    expect(
      pipelineStage({
        deliverableStatus: 'invoiced',
        invoiceStatus: 'issued',
        balancePaise: 7_500_000,
        dueDate: new Date('2026-08-26T10:00:00+05:30'),
        remindersSent: 0,
        now,
      }),
    ).toBe('invoiced');
  });

  it('is reminded once a reminder has gone out and it is not yet due', () => {
    expect(
      pipelineStage({
        deliverableStatus: 'invoiced',
        invoiceStatus: 'issued',
        balancePaise: 7_500_000,
        dueDate: new Date('2026-08-26T10:00:00+05:30'),
        remindersSent: 1,
        now,
      }),
    ).toBe('reminded');
  });

  it('is overdue past the due date, which outranks reminded', () => {
    expect(
      pipelineStage({
        deliverableStatus: 'invoiced',
        invoiceStatus: 'issued',
        balancePaise: 7_500_000,
        dueDate: new Date('2026-08-12T10:00:00+05:30'),
        remindersSent: 2,
        now,
      }),
    ).toBe('overdue');
  });

  it('is paid on a zero balance even before the status column catches up', () => {
    expect(
      pipelineStage({
        deliverableStatus: 'invoiced',
        invoiceStatus: 'issued',
        balancePaise: 0,
        dueDate: new Date('2026-08-12T10:00:00+05:30'),
        now,
      }),
    ).toBe('paid');
  });

  it('reports a cancelled invoice', () => {
    expect(
      pipelineStage({ deliverableStatus: 'invoiced', invoiceStatus: 'cancelled', balancePaise: 100, now }),
    ).toBe('cancelled');
  });
});

describe('pipelineStage defaults', () => {
  it('falls back to the current time when none is injected', () => {
    const stage = pipelineStage({
      deliverableStatus: 'invoiced',
      invoiceStatus: 'issued',
      balancePaise: 100,
      dueDate: new Date('2000-01-01T00:00:00Z'),
    });
    expect(stage).toBe('overdue');
  });

  it('treats a missing balance as outstanding rather than paid', () => {
    expect(pipelineStage({ deliverableStatus: 'invoiced', invoiceStatus: 'issued' })).toBe('invoiced');
  });

  it('treats a missing reminder count as none sent', () => {
    expect(
      pipelineStage({
        deliverableStatus: 'invoiced',
        invoiceStatus: 'issued',
        balancePaise: 100,
        now: new Date('2026-08-19T10:00:00+05:30'),
      }),
    ).toBe('invoiced');
  });

  it('is invoiced while the invoice is still a draft', () => {
    expect(
      pipelineStage({ deliverableStatus: 'invoiced', invoiceStatus: 'draft', balancePaise: 100 }),
    ).toBe('invoiced');
  });

  it('ignores an invoice status while the deliverable has not reached invoiced', () => {
    expect(pipelineStage({ deliverableStatus: 'approved', invoiceStatus: 'issued' })).toBe('approved');
  });
});

describe('transition table integrity', () => {
  it('exposes a transition list for every status', () => {
    for (const status of ALL) {
      expect(Array.isArray(allowedTransitions(status))).toBe(true);
    }
  });

  it('never lists a status outside the known set', () => {
    for (const status of ALL) {
      for (const target of allowedTransitions(status)) {
        expect(ALL).toContain(target);
      }
    }
  });
});
