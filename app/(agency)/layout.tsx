import { AppShell } from '@/components/shell/app-shell';
import { WorkspaceProvider } from '@/components/providers/workspace-provider';

/**
 * Agency surface shell (docs/09-UX-UI-SPECIFICATION.md §2.1). Route-group layout,
 * so it applies to every screen under app/(agency)/** without changing the URL.
 *
 * TODO(pending creds): this layout does not yet check for a signed-in session.
 * Route protection needs a real Supabase server client (`lib/auth/**`), which is
 * blocked on the same founder credentials as the rest of Auth (docs/07-EXECUTION-
 * PLAN.md "Blocked-on-founder register"). Wiring a redirect-to-/login guard here
 * before that would mean faking a session, which the M1 assignment explicitly
 * rules out.
 */
export default function AgencyLayout({ children }: { children: React.ReactNode }) {
  return (
    <WorkspaceProvider>
      <AppShell>{children}</AppShell>
    </WorkspaceProvider>
  );
}
