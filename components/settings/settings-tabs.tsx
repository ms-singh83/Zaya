'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/cn';

/**
 * docs/09-UX-UI-SPECIFICATION.md §2.3 Settings: "business and GST, branding,
 * payment setup, notification defaults, auto-invoice buffer, Reminder tier copy
 * preview." Only business/GST and branding are M1 (docs/07-EXECUTION-PLAN.md M1);
 * auto-invoice buffer and payment terms live inside the business/GST form because
 * they are the same `PATCH /workspace` request. The rest are M6 to M8.
 */
const TABS = [
  { href: '/settings/business', label: 'Business and GST', enabled: true },
  { href: '/settings/branding', label: 'Branding', enabled: true },
  { href: '/settings/payment', label: 'Payment setup', enabled: false },
  { href: '/settings/notifications', label: 'Notifications', enabled: false },
] as const;

export function SettingsTabs() {
  const pathname = usePathname();
  return (
    <div role="tablist" aria-label="Settings" className="flex gap-1 overflow-x-auto border-b border-border">
      {TABS.map((tab) => {
        const active = pathname?.startsWith(tab.href);
        if (!tab.enabled) {
          return (
            <span
              key={tab.href}
              role="tab"
              aria-disabled="true"
              className="shrink-0 border-b-2 border-transparent px-4 py-2.5 text-sm text-muted opacity-60"
              title="Coming soon"
            >
              {tab.label}
            </span>
          );
        }
        return (
          <Link
            key={tab.href}
            href={tab.href}
            role="tab"
            aria-selected={active}
            className={cn(
              'shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors duration-150',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
              active ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-text',
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
