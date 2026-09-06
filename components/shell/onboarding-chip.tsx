'use client';

import Link from 'next/link';
import { useWorkspace } from '@/components/providers/workspace-provider';

const STEP_COUNT = 4;

/**
 * "Onboarding checklist chip persists in the top bar until setup is complete."
 * (docs/09-UX-UI-SPECIFICATION.md §2.1). Links to the checklist on the Pipeline
 * home, the one place all four steps are listed.
 */
export function OnboardingChip() {
  const { onboarding, isLoading } = useWorkspace();
  if (isLoading || !onboarding) return null;

  const done = [onboarding.business_done, onboarding.payment_done, onboarding.first_client_done, onboarding.first_deliverable_sent].filter(
    Boolean,
  ).length;
  if (done >= STEP_COUNT) return null;

  return (
    <Link
      href="/dashboard"
      className="hidden items-center gap-2 rounded-full border border-border bg-elevated px-3 py-1 text-xs font-medium text-text hover:bg-elevated/70 sm:flex"
    >
      Setup {done}/{STEP_COUNT}
    </Link>
  );
}
