/**
 * Agency auth seam. docs/10-ARCHITECTURE.md §4 `lib/auth/**` — Agency session, Magic
 * link verification. M1 wires the UI and this typed boundary only: Supabase
 * credentials are pending from the founder (docs/07-EXECUTION-PLAN.md "Blocked-on-
 * founder register"), so there is no real `@supabase/supabase-js` auth call yet.
 * Swap `createAuthClient` in `./client.ts` for a Supabase-backed implementation once
 * `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` exist. Nothing here may
 * fabricate a session: every method below fails honestly until that swap happens.
 */

export interface AuthErrorShape {
  code: string;
  message: string;
}

export type AuthResult<T = void> = { ok: true; data: T } | { ok: false; error: AuthErrorShape };

export interface AgencySession {
  userId: string;
  email: string;
}

export interface AuthClient {
  signUpWithEmail(input: { email: string; password: string }): Promise<AuthResult<AgencySession>>;
  signInWithEmail(input: { email: string; password: string }): Promise<AuthResult<AgencySession>>;
  signInWithGoogle(): Promise<AuthResult<void>>;
  getSession(): Promise<AuthResult<AgencySession | null>>;
  signOut(): Promise<AuthResult<void>>;
}

/** The one error every method returns until Supabase credentials land. */
export const AUTH_NOT_CONFIGURED_ERROR: AuthErrorShape = {
  code: 'auth_not_configured',
  message: 'Sign in is not connected yet. Please try again once setup is finished.',
};
