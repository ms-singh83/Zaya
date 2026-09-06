'use client';

import { Menu, Search } from 'lucide-react';
import Image from 'next/image';
import { useWorkspace } from '@/components/providers/workspace-provider';
import { Skeleton } from '@/components/ui/skeleton';
import { AccountMenu } from './account-menu';
import { OnboardingChip } from './onboarding-chip';
import { ThemeToggle } from './theme-toggle';

/**
 * docs/09-UX-UI-SPECIFICATION.md §2.1: "Top bar: Workspace name and logo, search,
 * theme toggle, account menu." Search has no index to query yet (arrives with
 * Clients/Deliverables in M2+), so it renders disabled-with-reason rather than a
 * dead text box that silently does nothing.
 */
export function Topbar({ onOpenNav }: { onOpenNav: () => void }) {
  const { workspace, isLoading } = useWorkspace();

  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b border-border bg-surface px-4 sm:px-6">
      <button
        type="button"
        onClick={onOpenNav}
        className="inline-flex h-9 w-9 items-center justify-center rounded text-text hover:bg-elevated lg:hidden"
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex min-w-0 items-center gap-2">
        {workspace?.logo_url ? (
          <Image
            src={workspace.logo_url}
            alt=""
            width={28}
            height={28}
            unoptimized
            className="h-7 w-7 shrink-0 rounded object-cover"
          />
        ) : (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-primary text-xs font-semibold text-primary-fg" aria-hidden>
            {(workspace?.name || 'Z').slice(0, 1).toUpperCase()}
          </span>
        )}
        {isLoading ? <Skeleton className="h-4 w-32" /> : <span className="truncate text-sm font-semibold text-text">{workspace?.name}</span>}
      </div>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <OnboardingChip />
        <div
          className="hidden items-center gap-2 rounded border border-border bg-bg px-3 py-1.5 text-sm text-muted opacity-60 md:flex"
          aria-disabled="true"
          title="Search arrives once Clients and Deliverables exist"
        >
          <Search className="h-4 w-4" aria-hidden />
          Search
        </div>
        <ThemeToggle />
        {/* Pending creds: no session to read a real name or email from yet (lib/auth/client.ts). */}
        <AccountMenu label="Your account" />
      </div>
    </header>
  );
}
