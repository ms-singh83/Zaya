import type { Metadata } from 'next';
import { OnboardingChecklist } from '@/components/onboarding/onboarding-checklist';

export const metadata: Metadata = { title: 'Pipeline, Zaya' };

/**
 * The Pipeline dashboard is the product (docs/09-UX-UI-SPECIFICATION.md §2.2), but
 * its four cards and two work lists read Deliverables, Invoices, and Payments,
 * none of which exist before M2 through M9. "Empty state before the first
 * Deliverable: the onboarding checklist takes the whole area" is exactly the M1
 * slice of this screen, so that is what ships now rather than a Pipeline built
 * against tables that are not there yet.
 */
export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <OnboardingChecklist />
    </div>
  );
}
