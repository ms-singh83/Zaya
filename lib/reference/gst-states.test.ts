import { describe, expect, it } from 'vitest';
import { GST_STATES, gstStateName } from './gst-states';

describe('GST_STATES', () => {
  it('has no duplicate codes', () => {
    const codes = GST_STATES.map((s) => s.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('every code matches the 2-digit shape the contract expects', () => {
    for (const state of GST_STATES) {
      expect(state.code).toMatch(/^[0-9]{2}$/);
      expect(state.name.length).toBeGreaterThan(0);
    }
  });

  it('includes the states named in the docs worked examples', () => {
    expect(GST_STATES.find((s) => s.code === '27')?.name).toBe('Maharashtra');
    expect(GST_STATES.find((s) => s.code === '07')?.name).toBe('Delhi');
  });
});

describe('gstStateName', () => {
  it('resolves a known code', () => {
    expect(gstStateName('29')).toBe('Karnataka');
  });

  it('returns null for an unknown or missing code', () => {
    expect(gstStateName('00')).toBeNull();
    expect(gstStateName(null)).toBeNull();
    expect(gstStateName(undefined)).toBeNull();
  });
});
