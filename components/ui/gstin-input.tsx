import { forwardRef } from 'react';
import { Input } from './input';

/**
 * GstinInput and PhoneInput are named in docs/09-UX-UI-SPECIFICATION.md §1.6 as
 * format-validated inputs. This wraps Input with the GSTIN shape (uppercase, 15
 * chars, no spaces) so every screen that collects a GSTIN behaves the same way.
 * Validation itself stays in the frozen Zod schema (lib/contracts/common.ts
 * `gstinSchema`); this component only normalises what the user types.
 */
export const GstinInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ onChange, ...props }, ref) => {
    return (
      <Input
        ref={ref}
        inputMode="text"
        autoCapitalize="characters"
        autoCorrect="off"
        spellCheck={false}
        maxLength={15}
        placeholder="22AAAAA0000A1Z5"
        onChange={(e) => {
          e.target.value = e.target.value.toUpperCase().replace(/\s/g, '');
          onChange?.(e);
        }}
        {...props}
      />
    );
  },
);
GstinInput.displayName = 'GstinInput';
