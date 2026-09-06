// Shared fixtures for the cross-tenant RLS integration suite (docs/16-TESTING-STRATEGY.md §3).
// "Fixtures build a full Workspace in one call... Two Workspaces are always seeded so every test
// can assert isolation cheaply" (docs/16 §3). This file seeds one signed-up Agency user (and, via
// the `handle_new_user` trigger, one Workspace + one owner `users` row) per call, and hands back
// a Supabase client authenticated as that user so tests can exercise real RLS, not the
// service-role bypass.
//
// Reuses the same env var names as the app itself (.env.example / docs/10-ARCHITECTURE.md §9):
// NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY. Point these
// at a local `supabase start` stack (preferred, per docs/17-DEPLOYMENT.md §1/§5) or a disposable
// hosted dev project — never at production.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/** True once all three integration env vars are present. Tests skip (not fail) when false. */
export const integrationEnvReady = Boolean(SUPABASE_URL && ANON_KEY && SERVICE_ROLE_KEY);

export { SUPABASE_URL, ANON_KEY };

/** service_role client: bypasses RLS entirely, used only for fixture setup/teardown and to make
 *  assertions about the database's actual state (never to exercise the policy under test). */
export function adminClient(): SupabaseClient {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error('adminClient(): NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set.');
  }
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** anon client with no session: what an unauthenticated request looks like over PostgREST. */
export function anonClient(): SupabaseClient {
  if (!SUPABASE_URL || !ANON_KEY) {
    throw new Error('anonClient(): NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY not set.');
  }
  return createClient(SUPABASE_URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
}

export interface SeededWorkspace {
  workspaceId: string;
  userId: string;
  email: string;
  /** Client carrying this user's access token — every request through it is subject to RLS as
   *  that user, exactly like a real browser session (docs/15-SECURITY.md §2). */
  client: SupabaseClient;
}

/** Creates one Agency user via the Auth admin API, which fires `handle_new_user` (migration
 *  §8) and creates the Workspace + owner row synchronously, then signs in as that user through
 *  the anon key so `client` carries a real user JWT, the same shape a browser session has. */
export async function seedWorkspace(label: string): Promise<SeededWorkspace> {
  const admin = adminClient();
  const email = `rls-test-${label}-${crypto.randomUUID()}@example.test`;
  const password = crypto.randomUUID();

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createError || !created.user) {
    throw new Error(`seedWorkspace(${label}): createUser failed — ${createError?.message}`);
  }

  const { data: userRow, error: userRowError } = await admin
    .from('users')
    .select('workspace_id')
    .eq('id', created.user.id)
    .single();
  if (userRowError || !userRow) {
    throw new Error(
      `seedWorkspace(${label}): handle_new_user did not produce a users row — ${userRowError?.message}`,
    );
  }

  const anon = anonClient();
  const { data: signedIn, error: signInError } = await anon.auth.signInWithPassword({ email, password });
  if (signInError || !signedIn.session) {
    throw new Error(`seedWorkspace(${label}): signInWithPassword failed — ${signInError?.message}`);
  }

  if (!SUPABASE_URL || !ANON_KEY) throw new Error('seedWorkspace(): env not ready.');
  const scoped = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${signedIn.session.access_token}` } },
  });

  return { workspaceId: userRow.workspace_id as string, userId: created.user.id, email, client: scoped };
}

/** Deletes the auth.users row (cascades to `public.users` per the FK), then the now-orphaned
 *  `public.workspaces` row explicitly — `workspaces` has no FK back to `auth.users` to cascade
 *  through. Uses the service-role client, which bypasses RLS, so this works regardless of the
 *  policies under test. */
export async function cleanupWorkspace(seed: SeededWorkspace | undefined): Promise<void> {
  if (!seed) return;
  const admin = adminClient();
  await admin.auth.admin.deleteUser(seed.userId);
  await admin.from('workspaces').delete().eq('id', seed.workspaceId);
}
