// Cross-tenant RLS suite for `workspaces` and `users` — docs/16-TESTING-STRATEGY.md §3
// ("Cross-tenant RLS, per tenant table: as Workspace A, reading a Workspace B row returns zero
// rows, and writing a Workspace B row is denied. This test exists for every table before the
// table is used by a feature") and docs/15-SECURITY.md §2 ("Cross-tenant tests are mandatory...
// A new tenant table without this test does not merge").
//
// Requires a live Supabase project (a local `supabase start` stack is the intended target, per
// docs/17-DEPLOYMENT.md §1/§5) with migration 20260907090000_m1_workspaces_users.sql applied, and
// NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY set in the
// environment. Supabase project credentials are still pending from the founder (docs/07
// "Blocked-on-founder register") as of this suite's authoring (M1 SECURITY review, Creed FIX 1) —
// it has NOT yet been run against a real Postgres. `describe.skipIf` below makes that state
// visible in the test report as SKIPPED, not as a false PASS: do not remove the skip guard to
// force a "green" run without an actual database behind it.
//
// Run once credentials land: `npm run test:integration` (see package.json / vitest.integration.config.ts).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { adminClient, anonClient, cleanupWorkspace, integrationEnvReady, seedWorkspace, type SeededWorkspace } from './helpers';

describe.skipIf(!integrationEnvReady)('cross-tenant RLS — workspaces, users', () => {
  let workspaceA: SeededWorkspace;
  let workspaceB: SeededWorkspace;

  beforeAll(async () => {
    workspaceA = await seedWorkspace('a');
    workspaceB = await seedWorkspace('b');
  }, 30_000);

  afterAll(async () => {
    await cleanupWorkspace(workspaceA);
    await cleanupWorkspace(workspaceB);
  });

  describe('workspaces', () => {
    it("Workspace A reads zero rows for Workspace B's id", async () => {
      const { data, error } = await workspaceA.client.from('workspaces').select('*').eq('id', workspaceB.workspaceId);
      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    it("a write by Workspace A against Workspace B's row is denied", async () => {
      const { data, error } = await workspaceA.client
        .from('workspaces')
        .update({ name: 'hijacked-by-a' })
        .eq('id', workspaceB.workspaceId)
        .select();
      // The RLS `using` clause on UPDATE means the row is simply not visible to be matched —
      // PostgREST reports success with zero rows affected, not a permission error. Confirming
      // zero rows AND that B's row is untouched (via the service-role client) together is what
      // proves the write was denied, not merely a no-op that happened to touch nothing.
      expect(error).toBeNull();
      expect(data).toEqual([]);

      const admin = adminClient();
      const { data: stillB } = await admin.from('workspaces').select('name').eq('id', workspaceB.workspaceId).single();
      expect(stillB?.name).not.toBe('hijacked-by-a');
    });

    it('Workspace A can read and update its own row', async () => {
      const { data: read, error: readError } = await workspaceA.client
        .from('workspaces')
        .select('id, name')
        .eq('id', workspaceA.workspaceId)
        .single();
      expect(readError).toBeNull();
      expect(read?.id).toBe(workspaceA.workspaceId);

      const { data: updated, error: updateError } = await workspaceA.client
        .from('workspaces')
        .update({ name: 'Workspace A renamed' })
        .eq('id', workspaceA.workspaceId)
        .select()
        .single();
      expect(updateError).toBeNull();
      expect(updated?.name).toBe('Workspace A renamed');
    });

    it('the Razorpay secret columns are unreadable even on the caller\'s own Workspace row (migration §6a)', async () => {
      const { error } = await workspaceA.client
        .from('workspaces')
        .select('razorpay_key_secret_encrypted')
        .eq('id', workspaceA.workspaceId)
        .single();
      // Column-level REVOKE means PostgREST/Postgres reject the column reference itself — this
      // is a distinct failure mode from the row-level RLS denials above (which return zero rows
      // with no error), so we assert an error is present rather than an empty result.
      expect(error).not.toBeNull();
    });

    it('anon (no session) reads zero workspace rows', async () => {
      const { data, error } = await anonClient().from('workspaces').select('*');
      expect(error).toBeNull();
      expect(data).toEqual([]);
    });
  });

  describe('users', () => {
    it("Workspace A's user reads zero rows for Workspace B's user", async () => {
      const { data, error } = await workspaceA.client.from('users').select('*').eq('id', workspaceB.userId);
      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    it("a write by Workspace A's user against Workspace B's user row is denied", async () => {
      const { data, error } = await workspaceA.client
        .from('users')
        .update({ full_name: 'hijacked-by-a' })
        .eq('id', workspaceB.userId)
        .select();
      expect(error).toBeNull();
      expect(data).toEqual([]);

      const admin = adminClient();
      const { data: stillB } = await admin.from('users').select('full_name').eq('id', workspaceB.userId).single();
      expect(stillB?.full_name).not.toBe('hijacked-by-a');
    });

    it('a user can read and update only their own row', async () => {
      const { data: updated, error } = await workspaceA.client
        .from('users')
        .update({ full_name: 'A Owner' })
        .eq('id', workspaceA.userId)
        .select()
        .single();
      expect(error).toBeNull();
      expect(updated?.full_name).toBe('A Owner');
    });

    it("a user cannot move their own row to another Workspace (with check on users_own_row_update)", async () => {
      const { data, error } = await workspaceA.client
        .from('users')
        .update({ workspace_id: workspaceB.workspaceId })
        .eq('id', workspaceA.userId)
        .select();
      // The `with check` clause (migration §7) rejects this: PostgREST surfaces it as a
      // permission-denied error (RLS violation on UPDATE), not a silent zero-row no-op, because
      // the row *is* matched by `using` but fails `with check` after the new values are applied.
      expect(error).not.toBeNull();
      expect(data ?? null).toBeNull();
    });

    it('anon (no session) reads zero user rows', async () => {
      const { data, error } = await anonClient().from('users').select('*');
      expect(error).toBeNull();
      expect(data).toEqual([]);
    });
  });
});
