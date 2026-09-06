import { AUTH_NOT_CONFIGURED_ERROR, type AuthClient, type AuthResult } from './types';

/**
 * PENDING CREDS: no `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` exist
 * yet, so this client makes no network call and issues no session. Every method
 * resolves the same honest "not configured" error, which the auth forms render
 * through the normal error-state UI (docs/09-UX-UI-SPECIFICATION.md §1.7). Do not
 * change this to a fake success: a fabricated session would be worse than an honest
 * failure here.
 */
function notConfigured<T>(): Promise<AuthResult<T>> {
  return Promise.resolve({ ok: false, error: AUTH_NOT_CONFIGURED_ERROR });
}

export function createAuthClient(): AuthClient {
  return {
    signUpWithEmail: () => notConfigured(),
    signInWithEmail: () => notConfigured(),
    signInWithGoogle: () => notConfigured(),
    getSession: () => notConfigured(),
    signOut: () => notConfigured(),
  };
}

/**
 * TODO(pending creds): once Supabase env vars exist, replace this with a real
 * `createBrowserClient` (`@supabase/ssr`) backed implementation. That is a new
 * dependency and needs ORCHESTRATOR sign-off per the M1 assignment contract, so it
 * is deliberately not added here.
 */
export const authClient: AuthClient = createAuthClient();
