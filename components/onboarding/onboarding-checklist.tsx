'use client';

import { Check } from 'lucide-react';
import Link from 'next/link';
import { useWorkspace } from '@/components/providers/workspace-provider';
import { Banner } from '@/components/ui/banner';
import { buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils/cn';

interface Step {
  key: 'business_done' | 'payment_done' | 'first_client_done' | 'first_deliverable_sent';
  title: string;
  description: string;
  href: string | null;
}

const STEPS: readonly Step[] = [
  {
    key: 'business_done',
    title: 'Business and GST details',
    description: 'Legal name, GSTIN, PAN, and your registered address.',
    href: '/settings/business',
  },
  {
    key: 'payment_done',
    title: 'Payment setup',
    description: 'Connect Razorpay or add your bank details so an invoice can be paid.',
    href: null,
  },
  {
    key: 'first_client_done',
    title: 'Add your first client',
    description: 'Name, WhatsApp number, and email for who you send work to.',
    href: null,
  },
  {
    key: 'first_deliverable_sent',
    title: 'Send your first deliverable',
    description: 'Upload a file or link and send it for approval.',
    href: null,
  },
];

/**
 * "Empty state before the first Deliverable: the onboarding checklist takes the
 * whole area." (docs/09-UX-UI-SPECIFICATION.md §2.2). Payment setup, first client,
 * and first deliverable are M2 to M6 screens, so those steps show what is left
 * without a link to a screen that does not exist yet.
 */
export function OnboardingChecklist() {
  const { onboarding, loadError, isLoading } = useWorkspace();

  if (loadError) {
    return (
      <Banner tone="error">
        We could not load your setup checklist right now. Refresh the page to try again.
      </Banner>
    );
  }

  if (isLoading || !onboarding) {
    return (
      <div className="flex flex-col gap-3">
        {STEPS.map((s) => (
          <Skeleton key={s.key} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  const doneCount = STEPS.filter((s) => onboarding[s.key]).length;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-text">Get set up</h1>
        <p className="text-sm text-muted">
          {doneCount} of {STEPS.length} done. Finish these so you can send a deliverable and get paid.
        </p>
      </div>
      <ul className="flex flex-col gap-3">
        {STEPS.map((step) => {
          const done = onboarding[step.key];
          return (
            <li
              key={step.key}
              className={cn('flex items-center gap-4 rounded-card border border-border bg-surface p-4', done && 'opacity-70')}
            >
              <span
                className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border',
                  done ? 'border-status-approved bg-status-approved text-primary-fg' : 'border-border text-muted',
                )}
                aria-hidden
              >
                {done ? <Check className="h-4 w-4" /> : null}
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium text-text">{step.title}</p>
                <p className="text-xs text-muted">{step.description}</p>
              </div>
              <div className="shrink-0">
                {done ? (
                  <span className="text-xs font-medium text-status-approved">Done</span>
                ) : step.href ? (
                  <Link href={step.href} className={buttonVariants({ size: 'sm', variant: 'secondary' })}>
                    Set up
                  </Link>
                ) : (
                  <span className="rounded-full bg-elevated px-2 py-0.5 text-[11px] text-muted">Coming soon</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
