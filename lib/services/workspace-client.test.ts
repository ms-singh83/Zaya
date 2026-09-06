import { describe, expect, it } from 'vitest';
import { createMockWorkspaceClient } from './workspace-client';

describe('createMockWorkspaceClient', () => {
  it('returns a default workspace with the migration defaults', async () => {
    const client = createMockWorkspaceClient();
    const result = await client.getWorkspace();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.invoice_prefix).toBe('INV');
    expect(result.data.default_gst_rate_bps).toBe(1800);
    expect(result.data.brand_color).toBe('#4F46E5');
    expect(result.data.payment_terms_days).toBe(7);
  });

  it('accepts a seed for tests that need a pre-filled workspace', async () => {
    const client = createMockWorkspaceClient({ name: 'Acme Studio' });
    const result = await client.getWorkspace();
    expect(result.ok && result.data.name).toBe('Acme Studio');
  });

  it('patchWorkspace merges a partial update and bumps updated_at', async () => {
    const client = createMockWorkspaceClient();
    const before = await client.getWorkspace();
    const patched = await client.patchWorkspace({ name: 'New name', invoice_prefix: 'NEW' });
    expect(patched.ok).toBe(true);
    if (!patched.ok || !before.ok) return;
    expect(patched.data.name).toBe('New name');
    expect(patched.data.invoice_prefix).toBe('NEW');
    // Untouched fields survive the merge.
    expect(patched.data.default_gst_rate_bps).toBe(before.data.default_gst_rate_bps);
  });

  it('rejects a patch that violates the frozen contract, without mutating state', async () => {
    const client = createMockWorkspaceClient();
    const badPatch = await client.patchWorkspace({ gstin: 'not-a-gstin' });
    expect(badPatch.ok).toBe(false);
    if (badPatch.ok) return;
    expect(badPatch.error.code).toBe('validation_error');
    expect(badPatch.error.field).toBe('gstin');

    const after = await client.getWorkspace();
    expect(after.ok && after.data.gstin).toBeNull();
  });

  it('patchBranding validates the hex colour shape', async () => {
    const client = createMockWorkspaceClient();
    const bad = await client.patchBranding({ brand_color: 'blue' });
    expect(bad.ok).toBe(false);

    const good = await client.patchBranding({ brand_color: '#123ABC' });
    expect(good.ok).toBe(true);
    expect(good.ok && good.data.brand_color).toBe('#123ABC');
  });

  it('getOnboarding reports business_done only once the core fields are set', async () => {
    const client = createMockWorkspaceClient();
    const before = await client.getOnboarding();
    expect(before.ok && before.data.business_done).toBe(false);
    expect(before.ok && before.data.payment_done).toBe(false);
    expect(before.ok && before.data.first_client_done).toBe(false);
    expect(before.ok && before.data.first_deliverable_sent).toBe(false);

    await client.patchWorkspace({
      name: 'Acme Studio',
      state_code: '27',
      address_line1: '1 MG Road',
      city: 'Mumbai',
      pincode: '400001',
      invoice_prefix: 'INV',
    });

    const after = await client.getOnboarding();
    expect(after.ok && after.data.business_done).toBe(true);
  });
});
