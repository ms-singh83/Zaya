'use client';

import { Input } from './input';

interface ColorInputProps {
  id?: string;
  value: string;
  onChange: (hex: string) => void;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
}

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

/**
 * Brand colour picker for docs/08-USER-FLOWS.md F1 step 3. Pairs the native colour
 * swatch with a plain hex Input so a user who knows their brand hex can type it
 * directly, and validates against the same `hexColorSchema` shape as the contract.
 */
export function ColorInput({ id, value, onChange, ...aria }: ColorInputProps) {
  const isValid = HEX_RE.test(value);
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        aria-label="Pick a brand colour"
        value={isValid ? value : '#4F46E5'}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        className="h-10 w-12 shrink-0 cursor-pointer rounded border border-border bg-surface p-1"
      />
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        placeholder="#4F46E5"
        maxLength={7}
        className="tnum"
        {...aria}
      />
    </div>
  );
}
