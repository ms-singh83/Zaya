import { describe, expect, it, vi } from 'vitest';
import { createAuthClient } from './client';

describe('createAuthClient (pending Supabase credentials)', () => {
  it('fails signUpWithEmail honestly instead of returning a session', async () => {
    const client = createAuthClient();
    const result = await client.signUpWithEmail({ email: 'a@b.com', password: 'password123' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('auth_not_configured');
  });

  it('fails signInWithEmail the same way', async () => {
    const client = createAuthClient();
    const result = await client.signInWithEmail({ email: 'a@b.com', password: 'password123' });
    expect(result.ok).toBe(false);
  });

  it('fails signInWithGoogle without redirecting anywhere', async () => {
    const client = createAuthClient();
    const result = await client.signInWithGoogle();
    expect(result.ok).toBe(false);
  });

  it('getSession never fabricates a signed-in user', async () => {
    const client = createAuthClient();
    const result = await client.getSession();
    expect(result.ok).toBe(false);
  });

  it('makes no network call', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const client = createAuthClient();
    await client.signInWithEmail({ email: 'a@b.com', password: 'password123' });
    await client.signInWithGoogle();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
