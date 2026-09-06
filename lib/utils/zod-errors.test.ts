import { z } from 'zod';
import { describe, expect, it } from 'vitest';
import { fieldErrors } from './zod-errors';

describe('fieldErrors', () => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
  });

  it('maps the first issue per top-level field', () => {
    const result = schema.safeParse({ email: 'not-an-email', password: 'short' });
    expect(result.success).toBe(false);
    if (result.success) return;
    const errors = fieldErrors<{ email: string; password: string }>(result.error);
    expect(errors.email).toBeDefined();
    expect(errors.password).toBeDefined();
  });

  it('returns an empty map when parsing succeeds is not applicable (no error object)', () => {
    const result = schema.safeParse({ email: 'a@b.com', password: 'password123' });
    expect(result.success).toBe(true);
  });
});
