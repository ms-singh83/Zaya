import { describe, expect, it } from 'vitest';
import { DomainError } from '../errors';

describe('DomainError', () => {
  it('carries a stable code the API layer can map to a status', () => {
    const error = new DomainError('invalid_state_transition', 'nope');
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('DomainError');
    expect(error.code).toBe('invalid_state_transition');
    expect(error.message).toBe('nope');
  });
});
