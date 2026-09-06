import { useId } from 'react';
import { cn } from '@/lib/utils/cn';

/** Spread this straight onto the input: `<Input {...a} value={...} onChange={...} />`. */
export interface FieldInputProps {
  id: string;
  'aria-describedby': string | undefined;
  'aria-invalid': boolean;
}

interface FieldProps {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string | null;
  required?: boolean;
  children: (props: FieldInputProps) => React.ReactNode;
  className?: string;
}

/**
 * Every input gets a real <label>, never a placeholder standing in for one
 * (docs/09-UX-UI-SPECIFICATION.md §1.8). Wires aria-describedby to the hint and/or
 * error text and aria-invalid so a screen reader announces the same failure a
 * sighted user sees in red.
 */
export function Field({ label, htmlFor, hint, error, required, children, className }: FieldProps) {
  const autoId = useId();
  const id = htmlFor ?? autoId;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium text-text">
        {label}
        {required ? <span className="text-status-overdue"> *</span> : null}
      </label>
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': Boolean(error) })}
      {hint && !error ? (
        <p id={hintId} className="text-xs text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-xs text-status-overdue">
          {error}
        </p>
      ) : null}
    </div>
  );
}
